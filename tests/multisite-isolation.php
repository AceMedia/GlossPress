<?php
if (!defined('WP_CLI') || !WP_CLI || !is_multisite()) exit;
$sites=get_sites(array('number'=>2,'fields'=>'ids'));if(count($sites)!==2)throw new RuntimeException('Need two fixture sites');
$ids=array();$count=0;$user=get_current_user_id();wp_set_current_user(0);
try {
    foreach($sites as $i=>$site){switch_to_blog($site);$ids[$site]=wp_insert_post(array('post_type'=>'acemedia_glossary','post_status'=>'publish','post_title'=>'Moonlit isolation marker '.($i+1),'post_content'=>'Fictional definition'));restore_current_blog();}
    foreach(array_merge($sites,$sites) as $site){switch_to_blog($site);try{$own=array_search($site,$sites,true)+1;$other=$own===1?2:1;$r=rest_do_request(new WP_REST_Request('GET','/wp/v2/glossary'));$json=wp_json_encode($r->get_data());if(strpos($json,'Moonlit isolation marker '.$own)===false || strpos($json,'Moonlit isolation marker '.$other)!==false)throw new RuntimeException('Cross-site glossary response/cache');$count++;}finally{restore_current_blog();}}
}finally{foreach($ids as $site=>$id){switch_to_blog($site);wp_delete_post($id,true);restore_current_blog();}wp_set_current_user($user);}
WP_CLI::success($count.' GlossPress multisite response/cache isolation assertions passed');
