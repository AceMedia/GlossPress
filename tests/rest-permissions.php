<?php
if (!defined('WP_CLI') || !WP_CLI || !defined('ABSPATH')) { exit; }
$GLOBALS['ace_glossary_assertions']=0;
function ace_glossary_assert($condition,$message) { if (!$condition) { throw new RuntimeException($message); } $GLOBALS['ace_glossary_assertions']++; }
function ace_glossary_request($method,$path,$data=null) {
    $r=new WP_REST_Request($method,$path);
    if ($data!==null) { $r->set_header('content-type','application/json');$r->set_body(wp_json_encode($data)); }
    return rest_do_request($r);
}
$suffix=wp_generate_password(8,false,false);$original=get_current_user_id();$posts=array();$users=array();$category=wp_insert_term('Moonlit fixture','category');
try {
    foreach (array('administrator','editor','author','contributor','subscriber') as $role) {
        $users[$role]=wp_insert_user(array('user_login'=>'glossary_fixture_'.$role.'_'.$suffix,'user_pass'=>wp_generate_password(),'user_email'=>'glossary-'.$role.'-'.$suffix.'@example.test','role'=>$role));
        if (is_wp_error($users[$role])) { throw new RuntimeException('Cannot create fictional user'); }
    }
    foreach (array('public'=>'publish','draft'=>'draft','private'=>'private','locked'=>'publish') as $name=>$status) {
        $posts[$name]=wp_insert_post(array('post_type'=>'acemedia_glossary','post_status'=>$status,'post_author'=>$users['administrator'],'post_title'=>'Lantern '.$name,'post_content'=>'Fictional definition '.$name,'post_password'=>$name==='locked'?'fictional-lock':''));
    }
    $posts['own']=wp_insert_post(array('post_type'=>'acemedia_glossary','post_status'=>'publish','post_author'=>$users['author'],'post_title'=>'The paper moon'));
    $posts['ordinary']=wp_insert_post(array('post_type'=>'post','post_status'=>'publish','post_author'=>$users['administrator'],'post_title'=>'Ordinary fictional article'));
    wp_set_current_user(0);
    foreach (array('draft','private','locked') as $name) { ace_glossary_assert(ace_glossary_request('GET','/wp/v2/glossary/'.$posts[$name])->get_status()===404,'Anonymous protected term must be hidden: '.$name); }
    ace_glossary_assert(ace_glossary_request('GET','/wp/v2/glossary/'.$posts['public'])->get_status()===200,'Public definition should remain readable');
    update_post_meta($posts['public'],'related_terms',array($posts['private'],99999999));
    $before=get_post_meta($posts['public'],'related_terms',true);
    $r=ace_glossary_request('GET','/wp/v2/glossary/'.$posts['public']);
    ace_glossary_assert($r->get_data()['relatedTerms']===array(),'Public relation response must hide protected and missing terms');
    ace_glossary_assert(get_post_meta($posts['public'],'related_terms',true)===$before,'Public GET must not change stored relations');
    set_transient('acemedia_glossary_term_'.$posts['private'],array('content'=>'cached private definition'),60);
    ace_glossary_assert(ace_glossary_request('GET','/wp/v2/glossary/'.$posts['private'])->get_status()===404,'Cached private definition must remain inaccessible');
    wp_set_current_user($users['subscriber']);
    foreach (array('categories','tags','related','categories/autosave','tags/autosave') as $suffix) {
        $field=strpos($suffix,'categories')===0?'categories':(strpos($suffix,'tags')===0?'tags':'relatedTerms');
        ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary/'.$posts['public'].'/'.$suffix,array($field=>array()))->get_status()===403,'Subscriber write must fail: '.$suffix);
    }
    wp_set_current_user($users['author']);
    ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary',array('id'=>$posts['public'],'title'=>'Forbidden replacement'))->get_status()===403,'Author must not edit another author glossary');
    ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary',array('id'=>$posts['ordinary'],'title'=>'Wrong type replacement'))->get_status()===403,'Glossary endpoint must not update ordinary posts');
    ace_glossary_assert(ace_glossary_request('DELETE','/wp/v2/glossary/'.$posts['public'])->get_status()===403,'Author must not delete another author glossary');
    $bulk=ace_glossary_request('POST','/wp/v2/glossary/bulk-delete',array('ids'=>array($posts['own'],$posts['public'])));
    ace_glossary_assert($bulk->get_status()===403,'Bulk delete must preflight every permission: '.wp_json_encode($bulk->get_data()));
    ace_glossary_assert(get_post($posts['own'])!==null,'Denied bulk delete must leave permitted earlier item intact');
    ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary/'.$posts['own'].'/related',array('relatedTerms'=>array($posts['public'])))->get_status()===403,'Bidirectional write needs permission on both posts');
    wp_set_current_user($users['contributor']);
    ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary',array('title'=>'Unapproved publication'))->get_status()===403,'Contributor must not publish through the custom route');
    wp_set_current_user($users['editor']);
    $r=ace_glossary_request('POST','/wp/v2/glossary/'.$posts['public'].'/categories',array('categories'=>array($category['term_id'])));
    ace_glossary_assert($r->get_status()===200,'Editor should assign categories');
    ace_glossary_assert(ace_glossary_request('POST','/wp/v2/glossary/'.$posts['public'].'/tags',array('tags'=>'bad'))->get_status()===400,'Malformed taxonomy payload should be rejected');
    $r=ace_glossary_request('POST','/wp/v2/glossary',array('title'=>'The Poet\'s Moon','content'=>'<p>A fictional definition.</p>','relatedTerms'=>array($posts['public'])));
    ace_glossary_assert($r->get_status()===201,'Editor should create a published definition');
    if ($r->get_status()===201) { $posts['created']=$r->get_data()['id']; }
    ace_glossary_assert(get_post_field('post_title',$posts['created'],'raw')==="The Poet's Moon",'Punctuation must survive the core write');
    ace_glossary_assert(in_array($posts['created'],get_post_meta($posts['public'],'related_terms',true),true),'Valid bidirectional relation must be preserved');
    acemedia_glossary_bump_terms_version();$a=acemedia_glossary_terms_version();acemedia_glossary_bump_terms_version();
    ace_glossary_assert($a!==acemedia_glossary_terms_version(),'Two immediate writes must not reuse the same cache generation');
    wp_set_current_user(0);
    ace_glossary_request('GET','/wp/v2/glossary/'.$posts['public']);
    wp_update_post(array('ID'=>$posts['public'],'post_content'=>'Updated moonlit definition'));
    $fresh=ace_glossary_request('GET','/wp/v2/glossary/'.$posts['public'])->get_data();
    ace_glossary_assert(strpos(wp_json_encode($fresh),'Updated moonlit definition')!==false,'Native post update must invalidate cached public definition');
    $sample='<p>A Moonspoon beside the window.</p>';
    $highlight=acemedia_glossary_highlight_html($sample,array(array('id'=>$posts['public'],'title'=>'Moonspoon','synonyms'=>array(),'definition'=>'A fictional spoon')));
    ace_glossary_assert(is_array($highlight) && isset($highlight['html']),'Highlighting must return a valid result with optional DOM availability');
    if (!class_exists('DOMDocument')) { ace_glossary_assert($highlight['html']===$sample && $highlight['has']===false,'Missing DOM extension must preserve original content'); }
    $related=AceMediaGlossary_Related_Posts::fetch(array('search_term'=>'Moonlit','per_page'=>3));
    ace_glossary_assert(is_array($related) && isset($related['posts']),'Related content must work without requiring mbstring');
    wp_set_current_user(0);$html=do_shortcode('[glossary]');
    ace_glossary_assert(strpos($html,'Fictional definition locked')===false,'Protected content must not leak through shortcode');
} finally {
    wp_set_current_user($original);
    foreach ($posts as $id) { wp_delete_post($id,true); }
    require_once ABSPATH.'wp-admin/includes/user.php';foreach ($users as $id) { if (!is_wp_error($id)) { if (is_multisite()) { wpmu_delete_user($id); } else { wp_delete_user($id); } } }
    if (!is_wp_error($category)) { wp_delete_term($category['term_id'],'category'); }
    acemedia_glossary_flush_all_caches(array_values($posts));
}
WP_CLI::success($GLOBALS['ace_glossary_assertions'].' GlossPress permissions and privacy assertions passed');
