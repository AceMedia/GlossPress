<?php

add_action('rest_api_init', function() {
    // Fetch glossary terms
    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'GET',
        'callback' => 'get_glossary_terms',
        'permission_callback' => '__return_true'  // Public access for reading terms
    ));

    // Save glossary term
    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'POST',
        'callback' => 'save_glossary_term',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

    // Delete glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_glossary_term',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        },
        'args' => array(
            'id' => array(
                'required' => true,
                'validate_callback' => function ($param, $request, $key) {
                    return is_numeric($param);
                }
            )
        )
    ));

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
            return current_user_can('edit_posts'); // Allow only editors and above
        }
    ));

    // Save Custom CSS
    register_rest_route('wp/v2', '/save-custom-css', array(
        'methods' => 'POST',
        'callback' => 'save_custom_css',
        'permission_callback' => function () {
            return current_user_can('edit_posts'); // Allow only editors and above
        }
    ));


});

// Function to fetch glossary terms
function get_glossary_terms($request) {
    $cached_terms = get_transient('acemedia_glossary_terms');

    if ($cached_terms !== false) {
        return new WP_REST_Response($cached_terms, 200);
    }

    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
    ));

    $response = array_map(function($term) {
        $related_terms = get_post_meta($term->ID, 'related_terms', true);

        // Fetch full category data
        $categories = wp_get_post_terms($term->ID, 'category', array('fields' => 'all'));
        $categories_formatted = array_map(function($category) {
            return [
                'id' => $category->term_id,
                'slug' => $category->slug,
                'title' => $category->name,
            ];
        }, $categories);

        // Fetch full tag data
        $tags = wp_get_post_terms($term->ID, 'post_tag', array('fields' => 'all'));
        $tags_formatted = array_map(function($tag) {
            return [
                'id' => $tag->term_id,
                'slug' => $tag->slug,
                'title' => $tag->name,
            ];
        }, $tags);

        return [
            'id' => $term->ID,
            'title' => get_the_title($term->ID),
            'content' => $term->post_content,
            'date' => $term->post_date,
            'modified' => $term->post_modified,
            'relatedTerms' => $related_terms ? array_map('intval', $related_terms) : [],
            'categories' => $categories_formatted,
            'tags' => $tags_formatted,
        ];
    }, $terms);

    set_transient('acemedia_glossary_terms', $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}



// Function to save a glossary term
function save_glossary_term($request) {
    $data = $request->get_json_params();

    $title = isset($data['title']) ? sanitize_text_field($data['title']) : '';
    $content = isset($data['content']) ? sanitize_textarea_field($data['content']) : '';
    $term_id = isset($data['id']) ? intval($data['id']) : 0;
    $related_terms = isset($data['relatedTerms']) && is_array($data['relatedTerms']) ? array_map('intval', $data['relatedTerms']) : [];
    $categories = isset($data['categories']) ? array_map('intval', $data['categories']) : [];
    $tags = isset($data['tags']) ? array_map('intval', $data['tags']) : [];

    if (empty($title)) {
        return new WP_Error('missing_title', 'The title is required', array('status' => 400));
    }

    if ($term_id && get_post($term_id)) {
        $post_id = wp_update_post(array(
            'ID' => $term_id,
            'post_title' => $title,
            'post_content' => $content,
        ));
    } else {
        $post_id = wp_insert_post(array(
            'post_title' => $title,
            'post_content' => $content,
            'post_type' => 'acemedia_glossary',
            'post_status' => 'publish',
        ));
    }

    if (is_wp_error($post_id)) {
        return new WP_Error('term_creation_failed', 'Failed to create or update glossary term', array('status' => 500));
    }

    // Update metadata
    update_post_meta($post_id, 'related_terms', $related_terms);

    // Update categories
    if (!empty($categories)) {
        wp_set_post_terms($post_id, $categories, 'category');
    }

    // Update tags
    if (!empty($tags)) {
        wp_set_post_terms($post_id, $tags, 'post_tag');
    }

    // Clear transient cache
    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response(array('id' => $post_id), 201);
}



// Function to delete a glossary term
function delete_glossary_term($request) {
    $term_id = intval($request['id']);
    $post = get_post($term_id);
    if (!$post || $post->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Term not found', array('status' => 404));
    }

    $result = wp_delete_post($term_id, true);
    if (!$result) {
        return new WP_Error('term_deletion_failed', 'Failed to delete the term', array('status' => 500));
    }

    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response(null, 204);
}


function export_glossary_terms() {
    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
    ));

    $response = array_map(function($term) {
        // Fetch related term slugs
        $related_term_ids = get_post_meta($term->ID, 'related_terms', true);
        $related_term_slugs = array_map(function($related_id) {
            $related_post = get_post($related_id);
            return $related_post ? sanitize_title($related_post->post_title) : null;
        }, $related_term_ids ?: []);

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
            'title' => get_the_title($term->ID),
            'content' => $term->post_content,
            'date' => $term->post_date,
            'modified' => $term->post_modified,
            'relatedTerms' => array_filter($related_term_slugs), // Remove nulls
            'categories' => $categories_formatted, // Full category data
            'tags' => $tags_formatted, // Full tag data
        ];
    }, $terms);

    return new WP_REST_Response($response, 200, array(
        'Content-Disposition' => 'attachment; filename="glossary-terms.json"',
        'Content-Type' => 'application/json',
    ));
}



function import_glossary_terms($request) {
    $data = $request->get_json_params();

    if (!is_array($data)) {
        return new WP_Error('invalid_import_data', 'Invalid data provided for import', array('status' => 400));
    }

    // Fetch existing glossary terms
    $existing_terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
    ));

    // Build a lookup table for existing terms
    $existing_terms_lookup = [];
    foreach ($existing_terms as $term) {
        $existing_terms_lookup[sanitize_title($term->post_title)] = $term->ID;
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

    foreach ($data as $term) {
        $title = isset($term['title']) ? sanitize_text_field($term['title']) : '';
        $content = isset($term['content']) ? sanitize_textarea_field($term['content']) : '';
        $related_slugs = isset($term['relatedTerms']) ? array_map('sanitize_title', $term['relatedTerms']) : [];
        $categories = isset($term['categories']) ? $term['categories'] : [];
        $tags = isset($term['tags']) ? $term['tags'] : [];

        $sanitized_title = sanitize_title($title);

        if (isset($existing_terms_lookup[$sanitized_title])) {
            $matched_terms_count++;
            continue;
        }

        $post_id = wp_insert_post(array(
            'post_title' => $title,
            'post_content' => $content,
            'post_type' => 'acemedia_glossary',
            'post_status' => 'publish',
        ));

        if (!is_wp_error($post_id)) {
            // Handle categories
            $category_ids = [];
            foreach ($categories as $category) {
                $slug = sanitize_title($category['slug']);
                $term_id = $existing_categories_lookup[$slug] ?? null;

                if (!$term_id) {
                    $term = wp_insert_term($category['title'], 'category', ['slug' => $slug]);
                    if (!is_wp_error($term)) {
                        $term_id = $term['term_id'];
                        $existing_categories_lookup[$slug] = $term_id;
                    }
                }

                if ($term_id) {
                    $category_ids[] = $term_id;
                }
            }
            wp_set_post_terms($post_id, $category_ids, 'category');

            // Handle tags
            $tag_ids = [];
            foreach ($tags as $tag) {
                $slug = sanitize_title($tag['slug']);
                $term_id = $existing_tags_lookup[$slug] ?? null;

                if (!$term_id) {
                    $term = wp_insert_term($tag['title'], 'post_tag', ['slug' => $slug]);
                    if (!is_wp_error($term)) {
                        $term_id = $term['term_id'];
                        $existing_tags_lookup[$slug] = $term_id;
                    }
                }

                if ($term_id) {
                    $tag_ids[] = $term_id;
                }
            }
            wp_set_post_terms($post_id, $tag_ids, 'post_tag');

            // Handle bidirectional related terms
            $related_ids = [];
            foreach ($related_slugs as $related_slug) {
                if (isset($existing_terms_lookup[$related_slug])) {
                    $related_ids[] = $existing_terms_lookup[$related_slug];
                }
            }
            update_post_meta($post_id, 'related_terms', $related_ids);

            $new_terms_count++;
        }

        $existing_terms_lookup[$sanitized_title] = $post_id;
    }

    // Handle bidirectional relationships
    // THIS NEEDS MORE WORK TO AUTOCORRECT RELATED TERMS IF MISMATCHED IN JSON
    // Ensure all terms have bidirectional relationships
    foreach ($data as $term) {
        if (!isset($term['relatedTerms'])) {
            continue;
        }
    
        // Get current term ID
        $current_term_id = $existing_terms_lookup[sanitize_title($term['title'])];
        $current_related_ids = get_post_meta($current_term_id, 'related_terms', true) ?: [];
    
        // Log current term details
        acemedia_add_to_logs("Processing Term: " . $term['title'] . " (ID: $current_term_id)");
    
        foreach ($term['relatedTerms'] as $related_slug) {
            // Sanitize the slug to ensure proper matching
            $sanitized_slug = sanitize_title($related_slug); // Lowercase, replace spaces with dashes, etc.
    
            if (isset($existing_terms_lookup[$sanitized_slug])) {
                $related_term_id = $existing_terms_lookup[$sanitized_slug];
    
                // Fetch and update the related term's related_terms
                $related_term_related_ids = get_post_meta($related_term_id, 'related_terms', true) ?: [];
    
                // Log related term details
                acemedia_add_to_logs(" - Related Term: " . $sanitized_slug . " (ID: $related_term_id)");
    
                // Ensure the current term is in the related term's list
                if (!in_array($current_term_id, $related_term_related_ids)) {
                    $related_term_related_ids[] = $current_term_id;
                    update_post_meta($related_term_id, 'related_terms', array_unique($related_term_related_ids));
                    acemedia_add_to_logs("   > Added $current_term_id to related_terms of $related_term_id");
                }
    
                // Ensure the related term is in the current term's list
                if (!in_array($related_term_id, $current_related_ids)) {
                    $current_related_ids[] = $related_term_id;
                    acemedia_add_to_logs("   > Added $related_term_id to related_terms of $current_term_id");
                }
            } else {
                // Log missing related slug
                acemedia_add_to_logs(" - Warning: Related slug '$related_slug' (sanitized as '$sanitized_slug') not found in existing_terms_lookup");
            }
        }
    
        // Save updated relationships for the current term
        update_post_meta($current_term_id, 'related_terms', array_unique($current_related_ids));
        acemedia_add_to_logs("Updated related_terms for $current_term_id: " . implode(', ', $current_related_ids));
    }
    
    
    

    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response(array(
        'message' => 'Import completed successfully',
        'new_terms' => $new_terms_count,
        'matched_terms' => $matched_terms_count,
    ), 200);
}



add_action('save_post_acemedia_glossary', function ($post_id, $post, $update) {
    // Clear transient when a glossary term is saved via the WordPress admin.
    delete_transient('acemedia_glossary_terms');
}, 10, 3);

add_action('deleted_post', function ($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_type === 'acemedia_glossary') {
        // Clear transient when a glossary term is deleted via the WordPress admin.
        delete_transient('acemedia_glossary_terms');
    }
});




// Register a new REST API endpoint to fetch related posts.
add_action('rest_api_init', function () {
    register_rest_route('wp/v2', '/related-posts', array(
        'methods' => 'GET',
        'callback' => 'get_related_posts',
        'permission_callback' => '__return_true', // Public access
        'args' => array(
            'categories' => array(
                'required' => false,
                'type' => 'string', // Accept as a string (comma-separated)
                'validate_callback' => function ($param) {
                    return is_string($param);
                }
            ),
            'tags' => array(
                'required' => false,
                'type' => 'string', // Accept as a string (comma-separated)
                'validate_callback' => function ($param) {
                    return is_string($param);
                }
            ),
            'per_page' => array(
                'required' => false,
                'default' => 3,
                'type' => 'integer',
                'validate_callback' => function ($param) {
                    return $param > 0;
                }
            ),
        )
    ));
});

function get_related_posts($request) {
    // Parse categories and tags from the request.
    $categories = $request->get_param('categories') ? explode(',', $request->get_param('categories')) : [];
    $tags = $request->get_param('tags') ? explode(',', $request->get_param('tags')) : [];
    $per_page = $request->get_param('per_page');

    // Exclude category ID 1
    $categories = array_filter($categories, function ($category_id) {
        return intval($category_id) !== 1;
    });

    // Generate a unique cache key based on input parameters
    $cache_key = 'related_posts_' . md5(serialize([
        'categories' => $categories,
        'tags' => $tags,
        'per_page' => $per_page,
    ]));

    // Check if cached data exists
    $cached_response = get_transient($cache_key);
    if ($cached_response !== false) {
        return new WP_REST_Response($cached_response, 200);
    }

    $query_args = array(
        'post_type' => 'post',
        'posts_per_page' => $per_page,
        'post_status' => 'publish',
        'tax_query' => array('relation' => 'OR'),
    );

    if (!empty($categories)) {
        $query_args['tax_query'][] = array(
            'taxonomy' => 'category',
            'field' => 'term_id',
            'terms' => $categories,
        );
    }

    if (!empty($tags)) {
        $query_args['tax_query'][] = array(
            'taxonomy' => 'post_tag',
            'field' => 'term_id',
            'terms' => $tags,
        );
    }

    $query = new WP_Query($query_args);
    $posts = $query->posts;

    $response = array_map(function ($post) {
        return array(
            'id' => $post->ID,
            'title' => get_the_title($post),
            'excerpt' => get_the_excerpt($post),
            'link' => get_permalink($post),
        );
    }, $posts);

    // Save the response to a transient
    set_transient($cache_key, $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}



function clear_related_posts_cache($post_id) {
    // Only clear cache for published posts.
    if (get_post_status($post_id) !== 'publish') {
        return;
    }

    global $wpdb;

    // Delete all related posts transients
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_related_posts_%'");
}
add_action('save_post', 'clear_related_posts_cache');
add_action('delete_post', 'clear_related_posts_cache');




// Function to add logs
function acemedia_add_to_logs($message) {
    $current_logs = get_option('acemedia_import_logs', '');
    $timestamp = current_time('mysql');
    $new_log = "[{$timestamp}] {$message}\n";
    $updated_logs = $current_logs . $new_log;
    update_option('acemedia_import_logs', $updated_logs);
}



add_action('rest_api_init', function () {
    register_rest_route('wp/v2', '/logs', array(
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(get_option('acemedia_import_logs', ''), 200);
        },
        'permission_callback' => function () {
            return current_user_can('edit_posts'); // Allow editors and above
        }
    ));
});

add_action('rest_api_init', function () {
    register_rest_route('wp/v2', '/logs/clear', array(
        'methods' => 'POST',
        'callback' => function() {
            update_option('acemedia_import_logs', '');
            return new WP_REST_Response('Logs cleared.', 200);
        },
        'permission_callback' => function () {
            return current_user_can('edit_posts'); // Allow editors and above
        }
    ));
});


function get_auto_highlight_option() {
    $option_value = get_option('auto_highlight', 'false'); // Default to 'false'
    return new WP_REST_Response(array('value' => $option_value === 'true'), 200); // Return as boolean
}


// Function to update the Auto Highlight option
function update_auto_highlight_option(WP_REST_Request $request) {
    $value = $request->get_param('value') === 'true' ? 'true' : 'false'; // Sanitize input
    update_option('auto_highlight', $value); // Update option
    return new WP_REST_Response(array('success' => true, 'value' => $value === 'true'), 200); // Respond with success
}



function get_custom_css() {
    $custom_css = get_option('acemedia_custom_css', ''); // Default to an empty string
    return new WP_REST_Response(array('css' => $custom_css), 200);
}

function save_custom_css(WP_REST_Request $request) {
    $css = $request->get_param('css');

    if (!is_string($css)) {
        return new WP_Error('invalid_data', 'CSS must be a string.', array('status' => 400));
    }

    // Sanitize and save the CSS
    $sanitized_css = sanitize_textarea_field($css);
    update_option('acemedia_custom_css', $sanitized_css);

    // Return a proper success response
    return rest_ensure_response(array(
        'success' => true,
        'message' => 'Custom CSS saved successfully.',
    ));
}




add_action('rest_api_init', function () {
    // Bulk delete glossary terms
    register_rest_route('wp/v2', '/glossary/bulk-delete', array(
        'methods' => 'POST',
        'callback' => 'bulk_delete_glossary_terms',
        'permission_callback' => function () {
            return current_user_can('manage_options'); // Restrict to admins
        }
    ));
});

function bulk_delete_glossary_terms(WP_REST_Request $request) {
    $ids = $request->get_param('ids');

    if (!is_array($ids) || empty($ids)) {
        return new WP_Error('invalid_request', 'Invalid or missing IDs.', array('status' => 400));
    }

    $deleted_ids = [];
    foreach ($ids as $id) {
        $term = get_post(intval($id));
        if ($term && $term->post_type === 'acemedia_glossary') {
            $result = wp_delete_post($id, true);
            if ($result) {
                $deleted_ids[] = $id;
            }
        }
    }

    // Clear transient cache
    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response($deleted_ids, 200);
}
