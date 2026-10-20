<?php
if (!defined('ABSPATH')) { exit; }

function acemedia_glossary_api_cache_key($name) {
    return $name . '_' . md5(acemedia_glossary_terms_version() . '|' . ACEMEDIA_GLOSSARY_VERSION);
}

/** Public definitions must never disclose drafts or locked content, even from cache. */
function acemedia_glossary_is_public($post) {
    $post = get_post($post);
    return $post && $post->post_type === 'acemedia_glossary' && $post->post_status === 'publish' && $post->post_password === '';
}
function acemedia_glossary_can_edit_request($request) {
    $id = (int) $request->get_param('id');
    $post = get_post($id);
    return $post && $post->post_type === 'acemedia_glossary' && current_user_can('edit_post', $id);
}
function acemedia_glossary_can_assign($request, $taxonomy) {
    $object = get_taxonomy($taxonomy);
    return acemedia_glossary_can_edit_request($request) && $object && current_user_can($object->cap->assign_terms);
}
function acemedia_glossary_can_relate($request) {
    if (!acemedia_glossary_can_edit_request($request)) { return false; }
    $id = (int) $request->get_param('id');
    $before = get_post_meta($id, 'related_terms', true);
    $after = $request->get_param('relatedTerms');
    $before = is_array($before) ? array_map('intval', $before) : array();
    $after = is_array($after) ? array_map('intval', $after) : array();
    foreach (array_unique(array_merge($before, $after)) as $related_id) {
        $post = get_post($related_id);
        if (!$post && !in_array($related_id, $after, true)) { continue; }
        if (!$post || $post->post_type !== 'acemedia_glossary' || !current_user_can('edit_post', $related_id)) { return false; }
    }
    return true;
}
function acemedia_glossary_can_save($request) {
    $id = (int) $request->get_param('id');
    $type = get_post_type_object('acemedia_glossary');
    if (!$type) { return false; }
    if ($id) {
        if (!acemedia_glossary_can_relate($request)) { return false; }
    } elseif (!current_user_can($type->cap->create_posts) || !current_user_can($type->cap->publish_posts)) { return false; }
    foreach (array('category', 'post_tag') as $name) {
        $taxonomy = get_taxonomy($name);
        if (!$taxonomy || !current_user_can($taxonomy->cap->assign_terms)) { return false; }
    }
    if (!$id) {
        foreach ((array) $request->get_param('relatedTerms') as $related_id) {
            $post = get_post($related_id);
            if (!$post || $post->post_type !== 'acemedia_glossary' || !current_user_can('edit_post', $related_id)) { return false; }
        }
    }
    return true;
}
function acemedia_glossary_can_delete($request) {
    $ids = $request->get_param('ids');
    if (!is_array($ids)) { $ids = array($request->get_param('id')); }
    if (!$ids) { return false; }
    foreach ($ids as $id) {
        $post = get_post($id);
        if (!$post || $post->post_type !== 'acemedia_glossary' || !current_user_can('delete_post', $id)) { return false; }
    }
    return true;
}
add_action('rest_api_init', function() {
    $id_schema = array('type'=>'integer','minimum'=>1,'required'=>true);
    $ids_schema = array('type'=>'array','items'=>array('type'=>'integer','minimum'=>1),'default'=>array(),'maxItems'=>1000);
    register_rest_route('wp/v2', '/glossary', array(
        'methods'=>'GET','callback'=>'get_glossary_terms','permission_callback'=>'__return_true'
    ));
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)', array(
        'methods'=>'GET','callback'=>'get_single_glossary_term','permission_callback'=>'__return_true','args'=>array('id'=>$id_schema)
    ));
    register_rest_route('wp/v2', '/glossary', array(
        'methods'=>'POST','callback'=>'save_glossary_term','permission_callback'=>'acemedia_glossary_can_save',
        'args'=>array('id'=>array('type'=>'integer','minimum'=>0),'title'=>array('type'=>'string','required'=>true),'content'=>array('type'=>'string'), 'relatedTerms'=>$ids_schema,'categories'=>$ids_schema,'tags'=>$ids_schema,'autoHighlight'=>array('type'=>'boolean'),'enablePostRelations'=>array('type'=>'boolean'),'priority'=>array('type'=>'boolean'))
    ));
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/related', array(
        'methods'=>'POST','callback'=>'update_glossary_term_related','permission_callback'=>'acemedia_glossary_can_relate','args'=>array('id'=>$id_schema,'relatedTerms'=>$ids_schema)
    ));
    foreach (array('categories'=>'category','tags'=>'post_tag') as $field=>$taxonomy) {
        foreach (array('','/autosave') as $suffix) {
            register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/'.$field.$suffix, array(
                'methods'=>'POST','callback'=>'update_glossary_term_'.$field.($suffix ? '_autosave' : ''),
                'permission_callback'=>function($request) use ($taxonomy) { return acemedia_glossary_can_assign($request,$taxonomy); },
                'args'=>array('id'=>$id_schema,$field=>$ids_schema)
            ));
        }
    }
    register_rest_route('wp/v2', '/glossary/diagnostic', array('methods'=>'GET','callback'=>'get_glossary_diagnostic','permission_callback'=>function(){return current_user_can('manage_options');}));
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)', array('methods'=>'DELETE','callback'=>'delete_glossary_term','permission_callback'=>'acemedia_glossary_can_delete','args'=>array('id'=>$id_schema)));
    register_rest_route('wp/v2', '/glossary/bulk-delete', array('methods'=>'POST','callback'=>'bulk_delete_glossary_terms','permission_callback'=>'acemedia_glossary_can_delete','args'=>array('ids'=>array('type'=>'array','items'=>array('type'=>'integer','minimum'=>1),'required'=>true,'minItems'=>1,'maxItems'=>1000))));
    register_rest_route('wp/v2', '/glossary/cleanup-orphans', array('methods'=>'POST','callback'=>'cleanup_orphaned_related_terms','permission_callback'=>function(){return current_user_can('manage_options');}));

    register_rest_route('wp/v2/options', '/auto_highlight', array(
        array(
            'methods' => 'GET',
            'callback' => 'get_auto_highlight_option',
            'permission_callback' => '__return_true', // Public access
        ),
        array(
            'methods' => 'POST',
            'callback' => 'update_auto_highlight_option',
            'permission_callback' => function () {
                return current_user_can('manage_options'); // Restrict updates to admins
            }
        )
    ));

    register_rest_route('wp/v2/options', '/glossary_templates', array(
        array(
            'methods' => 'GET',
            'callback' => 'get_glossary_templates_option',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'POST',
            'callback' => 'update_glossary_templates_option',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        )
    ));

    register_rest_route('wp/v2/options', '/glossary_slug', array(
        array(
            'methods' => 'GET',
            'callback' => 'get_glossary_slug_option',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'POST',
            'callback' => 'update_glossary_slug_option',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        )
    ));

    register_rest_route('wp/v2/options', '/glossary_styles', array(
        array(
            'methods' => 'GET',
            'callback' => 'get_glossary_styles_option',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => 'POST',
            'callback' => 'update_glossary_styles_option',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        )
    ));

    // Export glossary terms
    register_rest_route('wp/v2', '/glossary/export', array(
        'methods' => 'GET',
        'callback' => 'export_glossary_terms',
        'permission_callback' => function () {
            return current_user_can('manage_options'); // Restrict access to admins
        }
    ));

    // Placeholder for Import Glossary (Future)
    register_rest_route('wp/v2', '/glossary/import', array(
        'methods' => 'POST',
        'callback' => 'import_glossary_terms',
        'permission_callback' => function () {
            return current_user_can('manage_options'); // Restrict access to admins
        }
    ));


    register_rest_route('wp/v2', '/get-custom-css', array(
        'methods' => 'GET',
        'callback' => 'get_custom_css',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    // Save Custom CSS
    register_rest_route('wp/v2', '/save-custom-css', array(
        'methods' => 'POST',
        'callback' => 'save_custom_css',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    // Get logs
    register_rest_route('wp/v2', '/logs', array(
        'methods' => 'GET',
        'callback' => 'get_logs',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    // Clear logs
    register_rest_route('wp/v2', '/logs', array(
        'methods' => 'DELETE',
        'callback' => 'clear_logs',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    // Fetch related posts for a glossary term
    register_rest_route('wp/v2', '/related-posts', array(
        'methods' => 'GET',
        'callback' => 'get_glossary_related_posts',
        'permission_callback' => '__return_true',
        'args' => array(
            'term_id' => array(
                'required' => false,
                'validate_callback' => function ($param) {
                    return is_numeric($param);
                },
            ),
            'search' => array(
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'per_page' => array(
                'required' => false,
                'validate_callback' => function ($param) {
                    return is_numeric($param) && (int) $param >= 1;
                },
            ),
            'page' => array(
                'required' => false,
                'validate_callback' => function ($param) {
                    return is_numeric($param) && (int) $param >= 1;
                },
            ),
            'categories' => array(
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'tags' => array(
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ));

    // Prefetch endpoint for tags and categories (first page only)
    register_rest_route('wp/v2', '/glossary/prefetch-data', array(
        'methods' => 'GET',
        'callback' => 'get_prefetch_data',
        'permission_callback' => '__return_true'  // Public access for prefetch data
    ));

    // Get related terms with titles for faster lookup
    register_rest_route('wp/v2', '/glossary/related-terms-lookup', array(
        'methods' => 'GET', 
        'callback' => 'get_related_terms_lookup',
        'permission_callback' => '__return_true'  // Public access for lookup data
    ));
});

/**
 * Flush all cached glossary data in one go.
 *
 * @param array $term_ids Optional list of term IDs that should have their per-term caches cleared.
 */
function acemedia_glossary_flush_all_caches($term_ids = array()) {
    $transient_keys = array(
        'acemedia_glossary_terms',
        'acemedia_glossary_terms_summary',
        'acemedia_glossary_prefetch_data',
        'acemedia_glossary_related_terms_lookup',
        'acemedia_glossary_terms_titles_sorted',
    );

    foreach ($transient_keys as $key) {
        delete_transient($key);
    }

    $term_ids = array_unique(array_map('intval', (array) $term_ids));
    foreach ($term_ids as $term_id) {
        if ($term_id > 0) {
            delete_transient("acemedia_glossary_term_{$term_id}");
        }
    }

    global $wpdb;
    if (!isset($wpdb->options)) {
        return;
    }

    $patterns = array(
        '_transient_acemedia_glossary_terms_titles_sorted%',
        '_transient_timeout_acemedia_glossary_terms_titles_sorted%',
        '_transient_acemedia_glossary_data_%',
        '_transient_timeout_acemedia_glossary_data_%',
    );

    foreach ($patterns as $pattern) {
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $pattern));
    }
}

if (!function_exists('acemedia_add_to_logs')) {
    /**
     * Lightweight logging helper used by importer debug statements.
     *
     * @param string $message Message to record in debug log when WP_DEBUG is enabled.
     */
    function acemedia_add_to_logs($message) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[GlossPress] ' . $message);
        }
    }
}

// Function to fetch glossary terms (summary data only for performance)
function get_glossary_terms($request) {
    $cached_terms = get_transient(acemedia_glossary_api_cache_key('acemedia_glossary_terms_summary'));

    if (is_array($cached_terms)) {
        $cached_terms = array_values(array_filter($cached_terms, function($row){ return isset($row['id']) && acemedia_glossary_is_public($row['id']); }));
        return new WP_REST_Response($cached_terms, 200);
    }

    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'publish',
        'has_password' => false,
        'numberposts' => -1,
    ));

    $response = array_map(function($term) {
        // Get basic category and tag counts for filtering/display
        $categories = wp_get_post_terms($term->ID, 'category', array('fields' => 'ids'));
        $tags = wp_get_post_terms($term->ID, 'post_tag', array('fields' => 'ids'));

        return [
            'id' => $term->ID,
            'title' => get_the_title($term->ID),
            'date' => $term->post_date,
            'modified' => $term->post_modified,
            'categoryIds' => $categories ?: [],
            'tagIds' => $tags ?: [],
            'autoHighlight' => (bool) get_post_meta($term->ID, 'auto_highlight', true),
            'enablePostRelations' => (bool) get_post_meta($term->ID, 'enable_post_relations', true),
            'priority' => (bool) get_post_meta($term->ID, 'priority', true),
            'isOpen' => false,
            'isLoaded' => false, // Flag to track if full data is loaded
        ];
    }, $terms);

    set_transient(acemedia_glossary_api_cache_key('acemedia_glossary_terms_summary'), $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}



// Function to save a glossary term
function save_glossary_term($request) {
    
    $data = $request->get_json_params();

    $title = isset($data['title']) ? sanitize_text_field($data['title']) : '';
    $content = isset($data['content']) ? $data['content'] : '';
    if (!current_user_can('unfiltered_html')) { $content = wp_kses_post($content); }
    $term_id = isset($data['id']) ? intval($data['id']) : 0;
    $related_terms = isset($data['relatedTerms']) && is_array($data['relatedTerms']) ? array_map('intval', $data['relatedTerms']) : [];
    $categories = isset($data['categories']) ? array_map('intval', $data['categories']) : [];
    $tags = isset($data['tags']) ? array_map('intval', $data['tags']) : [];
    $auto_highlight = isset($data['autoHighlight']) ? (bool) $data['autoHighlight'] : false;
    $enable_post_relations = isset($data['enablePostRelations']) ? (bool) $data['enablePostRelations'] : false;


    if (empty($title)) {
        return new WP_Error('missing_title', 'The title is required', array('status' => 400));
    }

    if ($term_id && get_post($term_id)) {
        // Generate slug from title
        $slug = sanitize_title($title);
        
        $post_id = wp_update_post(wp_slash(array(
            'ID' => $term_id,
            'post_title' => $title,
            'post_content' => $content,
            'post_name' => $slug,
        )), true);
    } else {
        // For new posts, WordPress will auto-generate the slug from title
        $post_id = wp_insert_post(wp_slash(array(
            'post_title' => $title,
            'post_content' => $content,
            'post_type' => 'acemedia_glossary',
            'post_status' => 'publish',
        )), true);
    }

    if (is_wp_error($post_id)) {
        return new WP_Error('term_creation_failed', 'Failed to create or update glossary term', array('status' => 500));
    }
    

    // Update metadata with bidirectional relationship handling
    $current_related = get_post_meta($post_id, 'related_terms', true) ?: [];
    
    // Update the current term's related terms
    update_post_meta($post_id, 'related_terms', $related_terms);
    
    // Save auto-highlight setting
    update_post_meta($post_id, 'auto_highlight', $auto_highlight);
    
    // Save enable-post-relations setting
    update_post_meta($post_id, 'enable_post_relations', $enable_post_relations);

    // Priority terms go in the glossary's structured data. Only touched when
    // sent, so older clients that don't know the flag can't clear it.
    if (array_key_exists('priority', $data)) {
        update_post_meta($post_id, 'priority', (bool) $data['priority']);
    }

    // Handle bidirectional relationships
    $added_relations = array_diff($related_terms, $current_related);
    $removed_relations = array_diff($current_related, $related_terms);

    // Add bidirectional relationships for new relations
    foreach ($added_relations as $related_id) {
        $related_term_related = get_post_meta($related_id, 'related_terms', true) ?: [];
        if (!in_array($post_id, $related_term_related)) {
            $related_term_related[] = $post_id;
            update_post_meta($related_id, 'related_terms', $related_term_related);
        }
        // Clear cache for the related term
        delete_transient("acemedia_glossary_term_{$related_id}");
    }

    // Remove bidirectional relationships for removed relations
    foreach ($removed_relations as $related_id) {
        $related_term_related = get_post_meta($related_id, 'related_terms', true) ?: [];
        $key = array_search($post_id, $related_term_related);
        if ($key !== false) {
            unset($related_term_related[$key]);
            update_post_meta($related_id, 'related_terms', array_values($related_term_related));
        }
        // Clear cache for the related term
        delete_transient("acemedia_glossary_term_{$related_id}");
    }

    // Update categories (always set, even if empty to clear)
    wp_set_post_terms($post_id, $categories, 'category');

    // Update tags (always set, even if empty to clear)
    wp_set_post_terms($post_id, $tags, 'post_tag');

    acemedia_glossary_flush_all_caches(array($post_id));

    return new WP_REST_Response(array('id' => $post_id), 201);
}



// Function to delete multiple glossary terms
function bulk_delete_glossary_terms($request) {
    $params = $request->get_json_params();

    if (empty($params['ids']) || !is_array($params['ids'])) {
        return new WP_Error('invalid_bulk_delete_payload', 'No glossary term IDs supplied.', array('status' => 400));
    }

    $ids = array_unique(array_map('intval', $params['ids']));
    $ids = array_filter($ids);

    if (empty($ids)) {
        return new WP_Error('invalid_bulk_delete_ids', 'No valid glossary term IDs supplied.', array('status' => 400));
    }

    // Clean up references to these terms in other terms' related_terms
    $all_terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
    ));

    foreach ($all_terms as $other_term_id) {
        if (in_array($other_term_id, $ids)) continue;

        $related_terms = get_post_meta($other_term_id, 'related_terms', true);
        if (is_array($related_terms)) {
            // Remove any of the deleted terms from this term's related terms
            $updated_related = array_values(array_diff($related_terms, $ids));
            if (count($updated_related) !== count($related_terms)) {
                update_post_meta($other_term_id, 'related_terms', $updated_related);
                delete_transient("acemedia_glossary_term_{$other_term_id}");
            }
        }
    }

    $deleted_ids = [];

    foreach ($ids as $term_id) {
        $post = get_post($term_id);
        if (!$post || $post->post_type !== 'acemedia_glossary') {
            continue;
        }

        $result = wp_delete_post($term_id, true);
        if ($result) {
            $deleted_ids[] = $term_id; // Track IDs we actually removed to sync with the UI.
        }
    }

    if (empty($deleted_ids)) {
        return new WP_Error('bulk_delete_failed', 'No glossary terms were deleted.', array('status' => 500));
    }

    acemedia_glossary_flush_all_caches($deleted_ids);

    return new WP_REST_Response($deleted_ids, 200);
}


// Function to delete a single glossary term
function delete_glossary_term($request) {
    $term_id = intval($request['id']);
    $post = get_post($term_id);
    if (!$post || $post->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Term not found', array('status' => 404));
    }

    // Clean up references to this term in other terms' related_terms
    $all_terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
    ));

    foreach ($all_terms as $other_term_id) {
        if ($other_term_id == $term_id) continue;

        $related_terms = get_post_meta($other_term_id, 'related_terms', true);
        if (is_array($related_terms) && in_array($term_id, $related_terms)) {
            // Remove the deleted term from this term's related terms
            $updated_related = array_values(array_diff($related_terms, array($term_id)));
            update_post_meta($other_term_id, 'related_terms', $updated_related);
            
            // Clear the cache for this term
            delete_transient("acemedia_glossary_term_{$other_term_id}");
        }
    }

    $result = wp_delete_post($term_id, true);
    if (!$result) {
        return new WP_Error('term_deletion_failed', 'Failed to delete the term', array('status' => 500));
    }

    acemedia_glossary_flush_all_caches(array($term_id));

    return new WP_REST_Response(null, 204);
}

// Function to cleanup orphaned related term references across all terms
function cleanup_orphaned_related_terms($request) {
    $all_terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
    ));

    // Build a set of valid term IDs for quick lookup
    $valid_ids = array_flip($all_terms);
    $cleaned_count = 0;
    $removed_count = 0;

    foreach ($all_terms as $term_id) {
        $related_terms = get_post_meta($term_id, 'related_terms', true);
        
        if (is_array($related_terms) && !empty($related_terms)) {
            $valid_related = array();
            $had_orphans = false;
            
            foreach ($related_terms as $related_id) {
                if (isset($valid_ids[$related_id])) {
                    $valid_related[] = intval($related_id);
                } else {
                    $had_orphans = true;
                    $removed_count++;
                }
            }
            
            if ($had_orphans) {
                update_post_meta($term_id, 'related_terms', $valid_related);
                delete_transient("acemedia_glossary_term_{$term_id}");
                $cleaned_count++;
            }
        }
    }

    acemedia_glossary_flush_all_caches();

    return new WP_REST_Response(array(
        'success' => true,
        'cleaned_terms' => $cleaned_count,
        'removed_references' => $removed_count,
        'message' => sprintf(
            'Cleaned up %d orphaned reference(s) from %d term(s).',
            $removed_count,
            $cleaned_count
        )
    ), 200);
}


function export_glossary_terms() {
    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'any',
        'numberposts' => -1,
    ));

    $terms_payload = array_map(function($term) {
        // Fetch related term slugs
        $related_term_ids = get_post_meta($term->ID, 'related_terms', true);
        $related_term_slugs = array();
        if (is_array($related_term_ids)) {
            foreach ($related_term_ids as $related_id) {
                $related_post = get_post($related_id);
                if ($related_post) {
                    $slug = get_post_field('post_name', $related_post) ?: sanitize_title($related_post->post_title);
                    if ($slug) {
                        $related_term_slugs[] = $slug;
                    }
                }
            }
        }

        // Fetch categories with full data
        $categories = wp_get_post_terms($term->ID, 'category', array('fields' => 'all'));
        $categories_formatted = array_filter(array_map(function($category) {
            if (!is_wp_error($category) && !empty($category)) {
                return [
                    'id' => $category->term_id,
                    'slug' => $category->slug,
                    'title' => $category->name,
                ];
            }
            return null;
        }, $categories));


        // Fetch tags with full data
        $tags = wp_get_post_terms($term->ID, 'post_tag', array('fields' => 'all'));
        $tags_formatted = array_filter(array_map(function($tag) {
            if (!is_wp_error($tag) && !empty($tag)) {
                return [
                    'id' => $tag->term_id,
                    'slug' => $tag->slug,
                    'title' => $tag->name,
                ];
            }
            return null;
        }, $tags));

        return [
            'id' => $term->ID,
            'slug' => $term->post_name,
            'title' => get_the_title($term->ID),
            'content' => $term->post_content,
            'date' => $term->post_date,
            'modified' => $term->post_modified,
            'relatedTerms' => array_filter($related_term_slugs), // Remove nulls
            'categories' => $categories_formatted, // Full category data
            'tags' => $tags_formatted, // Full tag data
            'autoHighlight' => (bool) get_post_meta($term->ID, 'auto_highlight', true),
            'enablePostRelations' => (bool) get_post_meta($term->ID, 'enable_post_relations', true),
            'priority' => (bool) get_post_meta($term->ID, 'priority', true),
            'synonyms' => function_exists('acemedia_glossary_term_synonyms') ? acemedia_glossary_term_synonyms($term->ID) : array(),
        ];
    }, $terms);

    $settings = array(
        'autoHighlight' => get_option('acemedia_glossary_auto_highlight', 'false') === 'true',
        'highlightPostTypes' => array_values((array) get_option('acemedia_glossary_highlight_post_types', array())),
        'archiveFeaturesEnabled' => get_option('acemedia_glossary_templates_enabled', 'true') === 'true',
        'archiveSlug' => sanitize_title(get_option('acemedia_glossary_archive_slug', 'glossary')),
        'styleSettings' => AceMediaGlossary_Style_Settings::get_styles(),
        'customCss' => get_option('acemedia_glossary_custom_css', ''),
    );

    $payload = array(
        'exportedAt' => gmdate('c'),
        'settings' => $settings,
        'terms' => $terms_payload,
    );

    return new WP_REST_Response($payload, 200, array(
        'Content-Disposition' => 'attachment; filename="glossary-terms.json"',
        'Content-Type' => 'application/json',
    ));
}



function import_glossary_terms($request) {
    $data = $request->get_json_params();

    if (!is_array($data)) {
        return new WP_Error('invalid_import_data', 'Invalid data provided for import', array('status' => 400));
    }

    $settings = array();
    $terms_payload = array();

    if (isset($data['terms']) || isset($data['settings'])) {
        $settings = isset($data['settings']) && is_array($data['settings']) ? $data['settings'] : array();
        $terms_payload = isset($data['terms']) && is_array($data['terms']) ? $data['terms'] : array();
    } else {
        $terms_payload = $data;
    }

    $slug_updated = false;

    if (!empty($settings)) {
        if (array_key_exists('autoHighlight', $settings)) {
            $auto_highlight_enabled = (bool) $settings['autoHighlight'];
            update_option('acemedia_glossary_auto_highlight', $auto_highlight_enabled ? 'true' : 'false');
        }

        if (array_key_exists('highlightPostTypes', $settings)) {
            $post_types = is_array($settings['highlightPostTypes']) ? $settings['highlightPostTypes'] : array();
            update_option('acemedia_glossary_highlight_post_types', array_values(array_filter(array_map('sanitize_key', $post_types))));
        }

        if (array_key_exists('archiveFeaturesEnabled', $settings)) {
            $features_enabled = (bool) $settings['archiveFeaturesEnabled'];
            update_option('acemedia_glossary_templates_enabled', $features_enabled ? 'true' : 'false');

            if (!$features_enabled && class_exists('AceMediaGlossary_Block_Templates')) {
                AceMediaGlossary_Block_Templates::unregister_templates();
            }
        }

        if (array_key_exists('archiveSlug', $settings)) {
            $slug_value = sanitize_title($settings['archiveSlug']);
            $slug_value = trim($slug_value, '/');
            if ($slug_value === '') {
                $slug_value = 'glossary';
            }
            update_option('acemedia_glossary_archive_slug', $slug_value);
            $slug_updated = true;
        }

        if (!empty($settings['styleSettings']) && is_array($settings['styleSettings'])) {
            $sanitized_styles = AceMediaGlossary_Style_Settings::sanitize_styles($settings['styleSettings']);
            AceMediaGlossary_Style_Settings::update_styles($sanitized_styles);
        }

        if (array_key_exists('customCss', $settings)) {
            $css = sanitize_textarea_field($settings['customCss']);
            update_option('acemedia_glossary_custom_css', $css);
        }
    }

    if ($slug_updated || array_key_exists('archiveFeaturesEnabled', $settings)) {
        if (class_exists('AceMediaGlossary_PostType')) {
            AceMediaGlossary_PostType::registerPostTypeNow();
        }
        if (function_exists('flush_rewrite_rules')) {
            flush_rewrite_rules(false);
        }
    }

    // Fetch existing glossary terms
    $existing_terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'any',
        'numberposts' => -1,
    ));

    // Build a lookup table for existing terms (by title and slug)
    $existing_terms_lookup = [];
    foreach ($existing_terms as $existing_term) {
        $existing_terms_lookup[sanitize_title($existing_term->post_title)] = $existing_term->ID;
        if (!empty($existing_term->post_name)) {
            $existing_terms_lookup[sanitize_title($existing_term->post_name)] = $existing_term->ID;
        }
    }

    // Fetch existing tags
    $existing_tags = get_terms(array(
        'taxonomy' => 'post_tag',
        'hide_empty' => false,
    ));
    $existing_tags_lookup = [];
    foreach ($existing_tags as $tag) {
        $existing_tags_lookup[sanitize_title($tag->slug)] = $tag->term_id;
    }

    // Fetch existing categories
    $existing_categories = get_terms(array(
        'taxonomy' => 'category',
        'hide_empty' => false,
    ));
    $existing_categories_lookup = [];
    foreach ($existing_categories as $category) {
        $existing_categories_lookup[sanitize_title($category->slug)] = $category->term_id;
    }

    $new_terms_count = 0;
    $matched_terms_count = 0;
    $touched_term_ids = array();

    $previous_cache_suspension = wp_suspend_cache_invalidation(true);
    $previous_term_defer = function_exists('wp_defer_term_counting') ? wp_defer_term_counting(true) : false;
    $previous_comment_defer = function_exists('wp_defer_comment_counting') ? wp_defer_comment_counting(true) : false;

    try {
        foreach ($terms_payload as $term) {
            if (!is_array($term)) {
                continue;
            }

            $title = isset($term['title']) ? sanitize_text_field($term['title']) : '';
            $raw_slug = isset($term['slug']) ? sanitize_title($term['slug']) : '';
            $identifier = $raw_slug !== '' ? $raw_slug : sanitize_title($title);

            $content_raw = isset($term['content']) ? $term['content'] : '';
            $content = wp_kses_post($content_raw);

            $related_inputs = isset($term['relatedTerms']) && is_array($term['relatedTerms']) ? $term['relatedTerms'] : [];
            $related_slugs = array();
            foreach ($related_inputs as $related_item) {
                if (is_array($related_item)) {
                    if (!empty($related_item['slug'])) {
                        $related_slugs[] = sanitize_title($related_item['slug']);
                    } elseif (!empty($related_item['title'])) {
                        $related_slugs[] = sanitize_title($related_item['title']);
                    }
                } else {
                    $related_slugs[] = sanitize_title($related_item);
                }
            }

            $categories = isset($term['categories']) && is_array($term['categories']) ? $term['categories'] : [];
            $tags = isset($term['tags']) && is_array($term['tags']) ? $term['tags'] : [];

            if (isset($existing_terms_lookup[$identifier])) {
                $matched_terms_count++;
                continue;
            }

            $post_id = wp_insert_post(array(
                'post_title' => $title,
                'post_content' => $content,
                'post_type' => 'acemedia_glossary',
                'post_status' => 'publish',
                'post_name' => $identifier,
            ));

            if (is_wp_error($post_id)) {
                continue;
            }

            $touched_term_ids[] = (int) $post_id;

            // Handle categories
            $category_ids = [];
            foreach ($categories as $category) {
                $slug = '';
                $name = '';

                if (is_array($category)) {
                    $slug = isset($category['slug']) ? sanitize_title($category['slug']) : '';
                    $name = isset($category['title']) ? sanitize_text_field($category['title']) : '';
                } else {
                    $slug = sanitize_title($category);
                    $name = ucwords(str_replace('-', ' ', $slug));
                }

                if ($slug === '' && $name !== '') {
                    $slug = sanitize_title($name);
                }

                if ($slug === '') {
                    continue;
                }

                $term_id = $existing_categories_lookup[$slug] ?? null;

                if (!$term_id) {
                    $term_result = wp_insert_term($name !== '' ? $name : $slug, 'category', ['slug' => $slug]);
                    if (!is_wp_error($term_result)) {
                        $term_id = $term_result['term_id'];
                        $existing_categories_lookup[$slug] = $term_id;
                    }
                }

                if ($term_id) {
                    $category_ids[] = $term_id;
                }
            }
            if (!empty($category_ids)) {
                wp_set_post_terms($post_id, $category_ids, 'category');
            }

            // Handle tags
            $tag_ids = [];
            foreach ($tags as $tag) {
                $slug = '';
                $name = '';

                if (is_array($tag)) {
                    $slug = isset($tag['slug']) ? sanitize_title($tag['slug']) : '';
                    $name = isset($tag['title']) ? sanitize_text_field($tag['title']) : '';
                } else {
                    $slug = sanitize_title($tag);
                    $name = ucwords(str_replace('-', ' ', $slug));
                }

                if ($slug === '' && $name !== '') {
                    $slug = sanitize_title($name);
                }

                if ($slug === '') {
                    continue;
                }

                $term_id = $existing_tags_lookup[$slug] ?? null;

                if (!$term_id) {
                    $term_result = wp_insert_term($name !== '' ? $name : $slug, 'post_tag', ['slug' => $slug]);
                    if (!is_wp_error($term_result)) {
                        $term_id = $term_result['term_id'];
                        $existing_tags_lookup[$slug] = $term_id;
                    }
                }

                if ($term_id) {
                    $tag_ids[] = $term_id;
                }
            }
            if (!empty($tag_ids)) {
                wp_set_post_terms($post_id, $tag_ids, 'post_tag');
            }

            // Save term-level options
            $auto_highlight = !empty($term['autoHighlight']);
            $enable_post_relations = !empty($term['enablePostRelations']);
            update_post_meta($post_id, 'auto_highlight', $auto_highlight);
            update_post_meta($post_id, 'enable_post_relations', $enable_post_relations);
            if (array_key_exists('priority', $term)) {
                update_post_meta($post_id, 'priority', !empty($term['priority']));
            }
            if (array_key_exists('synonyms', $term)) {
                update_post_meta($post_id, 'synonyms', is_array($term['synonyms']) ? array_values(array_filter(array_map('sanitize_text_field', $term['synonyms']))) : array());
            }

            // Handle related term references (first pass)
            $related_ids = [];
            foreach ($related_slugs as $related_slug) {
                if ($related_slug && isset($existing_terms_lookup[$related_slug])) {
                    $related_ids[] = $existing_terms_lookup[$related_slug];
                }
            }
            if (!empty($related_ids)) {
                update_post_meta($post_id, 'related_terms', $related_ids);
            }

            $new_terms_count++;
            $existing_terms_lookup[$identifier] = $post_id;
            $existing_terms_lookup[sanitize_title($title)] = $post_id;
        }

        // Handle bidirectional relationships
        foreach ($terms_payload as $term) {
            if (!is_array($term) || !isset($term['relatedTerms']) || !is_array($term['relatedTerms'])) {
                continue;
            }

            $identifier = '';
            if (!empty($term['slug'])) {
                $identifier = sanitize_title($term['slug']);
            } elseif (!empty($term['title'])) {
                $identifier = sanitize_title($term['title']);
            }

            if ($identifier === '' || !isset($existing_terms_lookup[$identifier])) {
                continue;
            }

            $current_term_id = $existing_terms_lookup[$identifier];
            $current_related_ids = get_post_meta($current_term_id, 'related_terms', true) ?: [];

            $touched_term_ids[] = (int) $current_term_id;
            acemedia_add_to_logs("Processing Term: " . $term['title'] . " (ID: $current_term_id)");

            foreach ($term['relatedTerms'] as $related_item) {
                $sanitized_slug = '';
                if (is_array($related_item)) {
                    if (!empty($related_item['slug'])) {
                        $sanitized_slug = sanitize_title($related_item['slug']);
                    } elseif (!empty($related_item['title'])) {
                        $sanitized_slug = sanitize_title($related_item['title']);
                    }
                } else {
                    $sanitized_slug = sanitize_title($related_item);
                }

                if ($sanitized_slug === '') {
                    continue;
                }

                if (isset($existing_terms_lookup[$sanitized_slug])) {
                    $related_term_id = $existing_terms_lookup[$sanitized_slug];
                    $related_term_related_ids = get_post_meta($related_term_id, 'related_terms', true) ?: [];

                    acemedia_add_to_logs(" - Related Term: " . $sanitized_slug . " (ID: $related_term_id)");

                    if (!in_array($current_term_id, $related_term_related_ids)) {
                        $related_term_related_ids[] = $current_term_id;
                        update_post_meta($related_term_id, 'related_terms', array_unique($related_term_related_ids));
                        $touched_term_ids[] = (int) $related_term_id;
                        acemedia_add_to_logs("   > Added $current_term_id to related_terms of $related_term_id");
                    }

                    if (!in_array($related_term_id, $current_related_ids)) {
                        $current_related_ids[] = $related_term_id;
                        $touched_term_ids[] = (int) $related_term_id;
                        acemedia_add_to_logs("   > Added $related_term_id to related_terms of $current_term_id");
                    }
                } else {
                    acemedia_add_to_logs(" - Warning: Related reference sanitized as '{$sanitized_slug}' not found in existing_terms_lookup");
                }
            }

            update_post_meta($current_term_id, 'related_terms', array_unique($current_related_ids));
            acemedia_add_to_logs("Updated related_terms for $current_term_id: " . implode(', ', $current_related_ids));
        }
    } finally {
        wp_suspend_cache_invalidation($previous_cache_suspension);

        if (function_exists('wp_defer_term_counting')) {
            wp_defer_term_counting($previous_term_defer);
        }
        if (function_exists('wp_defer_comment_counting')) {
            wp_defer_comment_counting($previous_comment_defer);
        }
    }

    if (!empty($touched_term_ids)) {
        $touched_term_ids = array_unique(array_filter(array_map('intval', $touched_term_ids)));
    }

    acemedia_glossary_flush_all_caches($touched_term_ids);

    return new WP_REST_Response(array(
        'message' => 'Import completed successfully',
        'new_terms' => $new_terms_count,
        'matched_terms' => $matched_terms_count,
    ), 200);
}



// Function to fetch a single glossary term with full data
function get_single_glossary_term($request) {
    $term_id = $request->get_param('id');
    $visibility_post = get_post($term_id);
    if (!acemedia_glossary_is_public($visibility_post) && !($visibility_post && $visibility_post->post_type === 'acemedia_glossary' && current_user_can('edit_post', $term_id))) {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status'=>404));
    }
    $can_edit_term = current_user_can('edit_post', $term_id);
    $cached_term = $can_edit_term ? false : get_transient(acemedia_glossary_api_cache_key("acemedia_glossary_term_{$term_id}"));
    if (is_array($cached_term)) {
        $cached_term['relatedTerms'] = array_values(array_filter(isset($cached_term['relatedTerms']) && is_array($cached_term['relatedTerms']) ? $cached_term['relatedTerms'] : array(), 'acemedia_glossary_is_public'));
        return new WP_REST_Response($cached_term, 200);
    }

    $term = get_post($term_id);
    
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    $related_terms = get_post_meta($term_id, 'related_terms', true);
    
    // Sanitize related terms - remove any that no longer exist
    if (is_array($related_terms) && !empty($related_terms)) {
        $valid_related_terms = array();
        $needs_cleanup = false;
        
        foreach ($related_terms as $related_id) {
            $related_post = get_post($related_id);
            if (acemedia_glossary_is_public($related_post) || ($can_edit_term && $related_post && $related_post->post_type === 'acemedia_glossary' && current_user_can('edit_post', $related_id))) {
                $valid_related_terms[] = intval($related_id);
            } else {
                $needs_cleanup = true;
            }
        }
        
        // Update the meta if we found orphaned references
        if ($needs_cleanup) {
            $related_terms = $valid_related_terms;
        }
    }

    // Fetch full category data
    $categories = wp_get_post_terms($term_id, 'category', array('fields' => 'all'));
    $categories_formatted = array_map(function($category) {
        return [
            'id' => $category->term_id,
            'slug' => $category->slug,
            'title' => $category->name,
        ];
    }, $categories);

    // Fetch full tag data
    $tags = wp_get_post_terms($term_id, 'post_tag', array('fields' => 'all'));
    $tags_formatted = array_map(function($tag) {
        return [
            'id' => $tag->term_id,
            'slug' => $tag->slug,
            'title' => $tag->name,
        ];
    }, $tags);

    $response = [
        'id' => $term->ID,
        'title' => get_the_title($term->ID),
        'content' => $term->post_content,
        'date' => $term->post_date,
        'modified' => $term->post_modified,
        'relatedTerms' => $related_terms ? array_map('intval', $related_terms) : [],
        'categories' => $categories_formatted,
        'tags' => $tags_formatted,
        'autoHighlight' => (bool) get_post_meta($term->ID, 'auto_highlight', true),
        'enablePostRelations' => (bool) get_post_meta($term->ID, 'enable_post_relations', true),
        'priority' => (bool) get_post_meta($term->ID, 'priority', true),
        'isOpen' => false,
        'isLoaded' => true,
    ];

    if (!$can_edit_term) { set_transient(acemedia_glossary_api_cache_key("acemedia_glossary_term_{$term_id}"), $response, HOUR_IN_SECONDS); }

    return new WP_REST_Response($response, 200);
}

// Function to update related terms with bidirectional relationships
function update_glossary_term_related($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $related_term_ids = isset($data['relatedTerms']) ? array_map('intval', $data['relatedTerms']) : [];

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // Get current related terms to determine what changed
    $current_related = get_post_meta($term_id, 'related_terms', true) ?: [];
    
    // Update the current term's related terms
    update_post_meta($term_id, 'related_terms', $related_term_ids);

    // Handle bidirectional relationships
    $added_relations = array_diff($related_term_ids, $current_related);
    $removed_relations = array_diff($current_related, $related_term_ids);

    // Add bidirectional relationships for new relations
    foreach ($added_relations as $related_id) {
        $related_terms = get_post_meta($related_id, 'related_terms', true) ?: [];
        if (!in_array($term_id, $related_terms)) {
            $related_terms[] = $term_id;
            update_post_meta($related_id, 'related_terms', $related_terms);
        }
        // Clear cache for the related term
        delete_transient("acemedia_glossary_term_{$related_id}");
    }

    // Remove bidirectional relationships for removed relations
    foreach ($removed_relations as $related_id) {
        $related_terms = get_post_meta($related_id, 'related_terms', true) ?: [];
        $key = array_search($term_id, $related_terms);
        if ($key !== false) {
            unset($related_terms[$key]);
            update_post_meta($related_id, 'related_terms', array_values($related_terms));
        }
        // Clear cache for the related term
        delete_transient("acemedia_glossary_term_{$related_id}");
    }

    acemedia_glossary_flush_all_caches(array_merge(array($term_id), $related_term_ids, $current_related));

    return new WP_REST_Response(['success' => true, 'relatedTerms' => $related_term_ids], 200);
}

// Function to update categories for a glossary term
function update_glossary_term_categories($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $category_ids = isset($data['categories']) ? array_map('intval', $data['categories']) : [];

    // Log the request for debugging

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // Check if we're in an autosave context and handle it appropriately
    $is_autosave = defined('DOING_AUTOSAVE') && DOING_AUTOSAVE;
    $is_ajax = defined('DOING_AJAX') && DOING_AJAX;
    
    
    // Additional permission check for autosave context
    if ($is_autosave) {
        if (!current_user_can('edit_post', $term_id)) {
            return new WP_Error('insufficient_permissions', 'Insufficient permissions to update categories during autosave', array('status' => 403));
        }
    }

    // Validate category IDs exist
    if (!empty($category_ids)) {
        foreach ($category_ids as $cat_id) {
            if (!term_exists($cat_id, 'category')) {
                return new WP_Error('invalid_category', "Category with ID {$cat_id} does not exist", array('status' => 400));
            }
        }
    }

    // Update categories with error handling
    $result = wp_set_post_terms($term_id, $category_ids, 'category');
    
    
    if (is_wp_error($result)) {
        return new WP_Error('update_failed', 'Failed to update categories: ' . $result->get_error_message(), array('status' => 500));
    }
    
    if ($result === false) {
        return new WP_Error('update_failed', 'Failed to update categories: wp_set_post_terms returned false', array('status' => 500));
    }

    acemedia_glossary_flush_all_caches(array($term_id));


    // Return success with debug info if needed
    $response_data = [
        'success' => true, 
        'categories' => $category_ids,
        'debug' => [
            'is_autosave' => $is_autosave,
            'is_ajax' => $is_ajax,
            'term_id' => $term_id,
            'result' => $result
        ]
    ];

    return new WP_REST_Response($response_data, 200);
}

// Function to update tags for a glossary term
function update_glossary_term_tags($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $tag_ids = isset($data['tags']) ? array_map('intval', $data['tags']) : [];

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // Check if we're in an autosave context and handle it appropriately
    $is_autosave = defined('DOING_AUTOSAVE') && DOING_AUTOSAVE;
    
    // Additional permission check for autosave context
    if ($is_autosave) {
        if (!current_user_can('edit_post', $term_id)) {
            return new WP_Error('insufficient_permissions', 'Insufficient permissions to update tags during autosave', array('status' => 403));
        }
    }

    // Validate tag IDs exist
    if (!empty($tag_ids)) {
        foreach ($tag_ids as $tag_id) {
            if (!term_exists($tag_id, 'post_tag')) {
                return new WP_Error('invalid_tag', "Tag with ID {$tag_id} does not exist", array('status' => 400));
            }
        }
    }

    // Update tags with error handling
    $result = wp_set_post_terms($term_id, $tag_ids, 'post_tag');
    
    if (is_wp_error($result)) {
        return new WP_Error('update_failed', 'Failed to update tags: ' . $result->get_error_message(), array('status' => 500));
    }
    
    if ($result === false) {
        return new WP_Error('update_failed', 'Failed to update tags: wp_set_post_terms returned false', array('status' => 500));
    }

    acemedia_glossary_flush_all_caches(array($term_id));

    // Return success with debug info if needed
    $response_data = [
        'success' => true, 
        'tags' => $tag_ids,
        'debug' => [
            'is_autosave' => $is_autosave,
            'term_id' => $term_id,
            'result' => $result
        ]
    ];

    return new WP_REST_Response($response_data, 200);
}

// Function to get auto highlight option
function get_auto_highlight_option($request) {
    $auto_highlight = get_option('acemedia_glossary_auto_highlight', false);
    return new WP_REST_Response(['value' => $auto_highlight === 'true' || $auto_highlight === true], 200);
}

// Function to update auto highlight option
function update_auto_highlight_option($request) {
    $data = $request->get_json_params();
    $value = isset($data['value']) ? $data['value'] : false;

    $is_enabled = ($value === 'true' || $value === true || $value === 1);
    update_option('acemedia_glossary_auto_highlight', $is_enabled ? 'true' : 'false');

    return new WP_REST_Response(['success' => true, 'value' => $is_enabled], 200);
}

function get_glossary_templates_option($request) {
    $templates_enabled = get_option('acemedia_glossary_templates_enabled', 'true');
    $is_enabled = ($templates_enabled === 'true' || $templates_enabled === true || $templates_enabled === 1);

    return new WP_REST_Response(array('value' => $is_enabled), 200);
}

function update_glossary_templates_option($request) {
    $data = $request->get_json_params();
    $value = isset($data['value']) ? $data['value'] : true;

    $is_enabled = ($value === 'true' || $value === true || $value === 1);
    update_option('acemedia_glossary_templates_enabled', $is_enabled ? 'true' : 'false');

    if (!$is_enabled && class_exists('AceMediaGlossary_Block_Templates')) {
        AceMediaGlossary_Block_Templates::unregister_templates();
    }

    if (class_exists('AceMediaGlossary_PostType')) {
        AceMediaGlossary_PostType::registerPostTypeNow();
    }

    if (function_exists('flush_rewrite_rules')) {
        flush_rewrite_rules(false);
    }

    return new WP_REST_Response(array('success' => true, 'value' => $is_enabled), 200);
}

function get_glossary_slug_option($request) {
    $slug = get_option('acemedia_glossary_archive_slug', 'glossary');
    $sanitized = sanitize_title($slug);
    $sanitized = trim($sanitized, '/');
    if ($sanitized === '') {
        $sanitized = 'glossary';
    }

    return new WP_REST_Response(array('value' => $sanitized), 200);
}

function update_glossary_slug_option($request) {
    $data = $request->get_json_params();
    $value = isset($data['value']) ? $data['value'] : '';

    $sanitized = sanitize_title($value);
    $sanitized = trim($sanitized, '/');

    if ($sanitized === '') {
        return new WP_Error('invalid_slug', __('Archive slug cannot be empty.', 'acemedia-glossary'), array('status' => 400));
    }

    update_option('acemedia_glossary_archive_slug', $sanitized);

    if (class_exists('AceMediaGlossary_PostType')) {
        AceMediaGlossary_PostType::registerPostTypeNow();
    }

    if (function_exists('flush_rewrite_rules')) {
        flush_rewrite_rules(false);
    }

    return new WP_REST_Response(array('success' => true, 'value' => $sanitized), 200);
}

function get_glossary_styles_option($request) {
    $styles = AceMediaGlossary_Style_Settings::get_styles();

    return new WP_REST_Response(array(
        'value' => $styles,
    ), 200);
}

function update_glossary_styles_option($request) {
    $data = $request->get_json_params();
    $value = isset($data['value']) && is_array($data['value']) ? $data['value'] : array();

    if (empty($value)) {
        $body_params = $request->get_body_params();
        if (isset($body_params['value']) && is_array($body_params['value'])) {
            $value = $body_params['value'];
        }
    }

    $sanitized = AceMediaGlossary_Style_Settings::sanitize_styles($value);
    AceMediaGlossary_Style_Settings::update_styles($sanitized);

    return new WP_REST_Response(array(
        'success' => true,
        'value' => $sanitized,
    ), 200);
}

// Function to get custom CSS
function get_custom_css($request) {
    $custom_css = get_option('acemedia_glossary_custom_css', '');
    return new WP_REST_Response(['css' => $custom_css], 200);
}

// Function to save custom CSS
function save_custom_css($request) {
    $data = $request->get_json_params();
    $css = isset($data['css']) ? sanitize_textarea_field($data['css']) : '';
    
    update_option('acemedia_glossary_custom_css', $css);
    
    return new WP_REST_Response(['success' => true, 'css' => $css], 200);
}

// Function to get logs (if you have a logging system)
function get_logs($request) {
    $logs = get_option('acemedia_glossary_logs', '');
    return new WP_REST_Response(['logs' => $logs], 200);
}

// Function to clear logs
function clear_logs($request) {
    update_option('acemedia_glossary_logs', '');
    return new WP_REST_Response(['success' => true], 200);
}

// Fetch posts that relate to a glossary entry by matching the term text and associated taxonomies
function get_glossary_related_posts($request) {
    $per_page = (int) $request->get_param('per_page') ?: 3;
    $per_page = max(1, min($per_page, 12));
    $page = (int) $request->get_param('page') ?: 1;
    $page = max(1, $page);

    $term_id = (int) $request->get_param('term_id');
    $search_term = trim((string) $request->get_param('search'));

    if ($term_id && !acemedia_glossary_is_public($term_id)) { return new WP_Error('term_not_found', 'Glossary term not found', array('status'=>404)); }
    if ($term_id && $search_term === '') {
        $term_post = get_post($term_id);
        if ($term_post && $term_post->post_type === 'acemedia_glossary') {
            $search_term = $term_post->post_title;
        }
    }

    $categories_param = (string) $request->get_param('categories');
    $tags_param = (string) $request->get_param('tags');

    $category_ids = array_filter(array_map('intval', array_filter(explode(',', $categories_param))));
    $tag_ids = array_filter(array_map('intval', array_filter(explode(',', $tags_param))));

    if ($search_term === '') {
        return new WP_REST_Response([
            'posts' => array(),
            'meta' => array(
                'reason' => 'missing_search_term',
            ),
        ], 200);
    }

    $post_types = apply_filters('acemedia_glossary_related_post_types', array('post'));

    global $wpdb;
    $search_like = '%' . $wpdb->esc_like($search_term) . '%';

    $query_args = array(
        'post_type' => $post_types,
        'post_status' => 'publish',
        'has_password' => false,
        'posts_per_page' => $per_page,
        'paged' => $page,
        'orderby' => 'date',
        'order' => 'DESC',
        'ignore_sticky_posts' => true,
        'no_found_rows' => false,
        'acemedia_glossary_related' => true,
    );

    $where_filter = function ($where, $wp_query) use ($wpdb, $search_like) {
        if ($wp_query->get('acemedia_glossary_related')) {
            $where .= $wpdb->prepare(
                " AND ( {$wpdb->posts}.post_title LIKE %s OR {$wpdb->posts}.post_content LIKE %s )",
                $search_like,
                $search_like
            );
        }

        return $where;
    };

    add_filter('posts_where', $where_filter, 10, 2);
    $query = new WP_Query($query_args);
    remove_filter('posts_where', $where_filter, 10);

    $used_fallback = false;

    if (!$query->have_posts() && (!empty($category_ids) || !empty($tag_ids))) {
        $tax_query = array('relation' => 'OR');
        if (!empty($category_ids)) {
            $tax_query[] = array(
                'taxonomy' => 'category',
                'field' => 'term_id',
                'terms' => $category_ids,
            );
        }
        if (!empty($tag_ids)) {
            $tax_query[] = array(
                'taxonomy' => 'post_tag',
                'field' => 'term_id',
                'terms' => $tag_ids,
            );
        }

        $fallback_args = array(
            'post_type' => $post_types,
            'post_status' => 'publish',
            'has_password' => false,
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => 'date',
            'order' => 'DESC',
            'ignore_sticky_posts' => true,
            'no_found_rows' => false,
        );

        if (count($tax_query) > 1) {
            $fallback_args['tax_query'] = $tax_query;
        }

        $query = new WP_Query($fallback_args);
        $used_fallback = true;
    }

    $posts = array();
    foreach ($query->posts as $post) {
        $posts[] = array(
            'id' => $post->ID,
            'title' => html_entity_decode(get_the_title($post), ENT_QUOTES),
            'link' => get_permalink($post),
            'excerpt' => wp_trim_words(wp_strip_all_tags(get_post_field('post_content', $post)), 30, '...'),
            'date' => get_post_time(DATE_W3C, true, $post),
        );
    }

    $response_payload = array(
        'posts' => $posts,
        'meta' => array(
            'search_term' => $search_term,
            'used_fallback' => $used_fallback,
            'category_ids' => $category_ids,
            'tag_ids' => $tag_ids,
            'found_posts' => (int) $query->found_posts,
            'total_pages' => (int) $query->max_num_pages,
        ),
    );

    $response = rest_ensure_response($response_payload);
    $response->header('X-WP-Total', (int) $query->found_posts);
    $response->header('X-WP-TotalPages', (int) $query->max_num_pages);

    return $response;
}

// Function to prefetch initial data for tags and categories
function get_prefetch_data($request) {
    $cached_data = get_transient('acemedia_glossary_prefetch_data');
    
    if ($cached_data !== false) {
        return new WP_REST_Response($cached_data, 200);
    }

    // Get first 10 categories
    $categories = get_terms(array(
        'taxonomy' => 'category',
        'hide_empty' => false,
        'number' => 10,
        'orderby' => 'name',
        'order' => 'ASC'
    ));

    $categories_formatted = array_map(function($category) {
        return [
            'id' => $category->term_id,
            'name' => $category->name,
            'slug' => $category->slug,
        ];
    }, $categories);

    // Get first 10 tags
    $tags = get_terms(array(
        'taxonomy' => 'post_tag',
        'hide_empty' => false,
        'number' => 10,
        'orderby' => 'name', 
        'order' => 'ASC'
    ));

    $tags_formatted = array_map(function($tag) {
        return [
            'id' => $tag->term_id,
            'name' => $tag->name,
            'slug' => $tag->slug,
        ];
    }, $tags);

    // Get total counts for "has more" logic
    $total_categories = wp_count_terms('category');
    $total_tags = wp_count_terms('post_tag');

    $response = [
        'categories' => $categories_formatted,
        'tags' => $tags_formatted,
        'hasMoreCategories' => $total_categories > 10,
        'hasMoreTags' => $total_tags > 10
    ];

    set_transient('acemedia_glossary_prefetch_data', $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}

// Function to get related terms lookup data (id -> title mapping)
function get_related_terms_lookup($request) {
    $cached_lookup = get_transient(acemedia_glossary_api_cache_key('acemedia_glossary_related_terms_lookup'));
    
    if (is_array($cached_lookup)) {
        foreach ($cached_lookup as $id=>$title) { if (!acemedia_glossary_is_public($id)) { unset($cached_lookup[$id]); } }
        return new WP_REST_Response($cached_lookup, 200);
    }

    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'post_status' => 'publish',
        'has_password' => false,
        'numberposts' => -1,
        'fields' => 'ids'
    ));

    $lookup = [];
    foreach ($terms as $term_id) {
        $lookup[$term_id] = get_the_title($term_id);
    }

    // Sort by title: # terms first (alphabetically), then all others alphabetically
    uasort($lookup, function($a, $b) {
        $a_is_hash = strpos($a, '#') === 0;
        $b_is_hash = strpos($b, '#') === 0;
        
        // If one starts with # and the other doesn't
        if ($a_is_hash && !$b_is_hash) return -1;
        if (!$a_is_hash && $b_is_hash) return 1;
        
        // Both have same prefix type, sort alphabetically (case-insensitive)
        return strcasecmp($a, $b);
    });

    set_transient(acemedia_glossary_api_cache_key('acemedia_glossary_related_terms_lookup'), $lookup, HOUR_IN_SECONDS);

    return new WP_REST_Response($lookup, 200);
}

// Autosave-specific function to update categories for a glossary term
function update_glossary_term_categories_autosave($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $category_ids = isset($data['categories']) ? array_map('intval', $data['categories']) : [];

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // For autosave context, we use a different approach
    // Store as temporary meta that can be restored later or ignored
    $meta_key = '_temp_autosave_categories';
    
    // Store the categories as meta data instead of directly updating terms
    $result = update_post_meta($term_id, $meta_key, $category_ids);
    
    if ($result === false) {
        return new WP_Error('autosave_failed', 'Failed to save categories during autosave', array('status' => 500));
    }

    // Also store timestamp for cleanup
    update_post_meta($term_id, '_temp_autosave_categories_timestamp', time());

    return new WP_REST_Response([
        'success' => true, 
        'categories' => $category_ids,
        'autosave' => true,
        'meta_key' => $meta_key
    ], 200);
}

// Autosave-specific function to update tags for a glossary term
function update_glossary_term_tags_autosave($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $tag_ids = isset($data['tags']) ? array_map('intval', $data['tags']) : [];

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // For autosave context, we use a different approach
    // Store as temporary meta that can be restored later or ignored
    $meta_key = '_temp_autosave_tags';
    
    // Store the tags as meta data instead of directly updating terms
    $result = update_post_meta($term_id, $meta_key, $tag_ids);
    
    if ($result === false) {
        return new WP_Error('autosave_failed', 'Failed to save tags during autosave', array('status' => 500));
    }

    // Also store timestamp for cleanup
    update_post_meta($term_id, '_temp_autosave_tags_timestamp', time());

    return new WP_REST_Response([
        'success' => true, 
        'tags' => $tag_ids,
        'autosave' => true,
        'meta_key' => $meta_key
    ], 200);
}

// Cleanup old autosave temporary data
add_action('wp_loaded', 'cleanup_old_autosave_data');

function cleanup_old_autosave_data() {
    // Only run this occasionally (every hour)
    if (get_transient('acemedia_glossary_cleanup_ran')) {
        return;
    }
    
    // Set transient to prevent running too frequently
    set_transient('acemedia_glossary_cleanup_ran', true, HOUR_IN_SECONDS);
    
    global $wpdb;
    
    // Clean up autosave data older than 24 hours
    $cutoff_time = time() - (24 * HOUR_IN_SECONDS);
    
    // Find posts with old autosave timestamps
    $posts_to_clean = $wpdb->get_results($wpdb->prepare("
        SELECT post_id 
        FROM {$wpdb->postmeta} 
        WHERE meta_key IN ('_temp_autosave_categories_timestamp', '_temp_autosave_tags_timestamp')
        AND meta_value < %d
    ", $cutoff_time));
    
    foreach ($posts_to_clean as $post) {
        delete_post_meta($post->post_id, '_temp_autosave_categories');
        delete_post_meta($post->post_id, '_temp_autosave_categories_timestamp');
        delete_post_meta($post->post_id, '_temp_autosave_tags');
        delete_post_meta($post->post_id, '_temp_autosave_tags_timestamp');
    }
}

// Hook to apply autosave data when post is actually saved
add_action('save_post', 'apply_autosave_data_on_save');

function apply_autosave_data_on_save($post_id) {
    // Only apply to glossary terms
    if (get_post_type($post_id) !== 'acemedia_glossary') {
        return;
    }
    
    // Check if we have temporary autosave data to apply
    $temp_categories = get_post_meta($post_id, '_temp_autosave_categories', true);
    $temp_tags = get_post_meta($post_id, '_temp_autosave_tags', true);
    
    if ($temp_categories !== false && is_array($temp_categories)) {
        wp_set_post_terms($post_id, $temp_categories, 'category');
        delete_post_meta($post_id, '_temp_autosave_categories');
        delete_post_meta($post_id, '_temp_autosave_categories_timestamp');
    }
    
    if ($temp_tags !== false && is_array($temp_tags)) {
        wp_set_post_terms($post_id, $temp_tags, 'post_tag');
        delete_post_meta($post_id, '_temp_autosave_tags');
        delete_post_meta($post_id, '_temp_autosave_tags_timestamp');
    }
}

// Diagnostic function to help debug autosave issues
function get_glossary_diagnostic($request) {
    $diagnostic_info = [
        'is_autosave' => defined('DOING_AUTOSAVE') && DOING_AUTOSAVE,
        'is_ajax' => defined('DOING_AJAX') && DOING_AJAX,
        'current_user_id' => get_current_user_id(),
        'current_user_can_edit_posts' => current_user_can('edit_posts'),
        'php_version' => PHP_VERSION,
        'wordpress_version' => get_bloginfo('version'),
        'time' => time(),
        'wp_debug' => defined('WP_DEBUG') && WP_DEBUG,
        'request_method' => isset($_SERVER['REQUEST_METHOD']) && is_string($_SERVER['REQUEST_METHOD']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_METHOD'])) : 'unknown',
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) && is_string($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : 'unknown'
    ];
    
    return new WP_REST_Response($diagnostic_info, 200);
}
