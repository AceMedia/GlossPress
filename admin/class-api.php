<?php

add_action('rest_api_init', function() {
    // Fetch glossary terms (now returns only summary data)
    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'GET',
        'callback' => 'get_glossary_terms',
        'permission_callback' => '__return_true'  // Public access for reading terms
    ));

    // Fetch single glossary term with full data
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'get_single_glossary_term',
        'permission_callback' => '__return_true',
        'args' => array(
            'id' => array(
                'required' => true,
                'validate_callback' => function ($param, $request, $key) {
                    return is_numeric($param);
                }
            )
        )
    ));

    // Save glossary term
    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'POST',
        'callback' => 'save_glossary_term',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        }
    ));

    // Update related terms for a glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/related', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_related',
        'permission_callback' => function ($request) {
            // Check multiple authentication methods for autosave compatibility
            $is_logged_in = is_user_logged_in();
            $current_user_id = get_current_user_id();
            
            // Log initial authentication state
            error_log("GlossPress Related: Initial auth check - Logged in: " . ($is_logged_in ? 'YES' : 'NO') . ", User ID: {$current_user_id}");
            
            // If standard auth works, use it
            if ($is_logged_in && $current_user_id > 0) {
                error_log("GlossPress Related: Standard authentication successful");
                return true;
            }
            
            // Try alternative authentication for autosave context
            // Check if we have WordPress admin cookies
            $auth_cookie = isset($_COOKIE[LOGGED_IN_COOKIE]) ? $_COOKIE[LOGGED_IN_COOKIE] : null;
            if ($auth_cookie) {
                $user_id = wp_validate_auth_cookie($auth_cookie, 'logged_in');
                if ($user_id) {
                    error_log("GlossPress Related: Alternative auth successful - User ID: {$user_id}");
                    
                    // Set the current user for this request
                    wp_set_current_user($user_id);
                    
                    // Check if this user can edit posts
                    if (current_user_can('edit_posts')) {
                        return true;
                    }
                }
            }
            
            // Check for admin cookies as another fallback
            if (isset($_COOKIE[AUTH_COOKIE])) {
                $user_id = wp_validate_auth_cookie($_COOKIE[AUTH_COOKIE], 'auth');
                if ($user_id) {
                    error_log("GlossPress Related: Admin cookie auth successful - User ID: {$user_id}");
                    wp_set_current_user($user_id);
                    if (current_user_can('edit_posts')) {
                        return true;
                    }
                }
            }
            
            error_log("GlossPress Related: All authentication methods failed");
            return new WP_Error('not_logged_in', 'You must be logged in.', array('status' => 401));
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

    // Update categories for a glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/categories', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_categories',
        'permission_callback' => function ($request) {
            // Check multiple authentication methods for autosave compatibility
            $is_logged_in = is_user_logged_in();
            $current_user_id = get_current_user_id();
            
            // Log initial authentication state
            error_log("GlossPress: Initial auth check - Logged in: " . ($is_logged_in ? 'YES' : 'NO') . ", User ID: {$current_user_id}");
            
            // If standard auth works, use it
            if ($is_logged_in && $current_user_id > 0) {
                error_log("GlossPress: Standard authentication successful");
                return true;
            }
            
            // Try alternative authentication for autosave context
            // Check if we have WordPress admin cookies
            $auth_cookie = isset($_COOKIE[LOGGED_IN_COOKIE]) ? $_COOKIE[LOGGED_IN_COOKIE] : null;
            if ($auth_cookie) {
                $user_id = wp_validate_auth_cookie($auth_cookie, 'logged_in');
                if ($user_id) {
                    error_log("GlossPress: Alternative auth successful - User ID: {$user_id}");
                    
                    // Set the current user for this request
                    wp_set_current_user($user_id);
                    
                    // Check if this user can edit posts
                    if (current_user_can('edit_posts')) {
                        return true;
                    }
                }
            }
            
            // Check for admin cookies as another fallback
            if (isset($_COOKIE[AUTH_COOKIE])) {
                $user_id = wp_validate_auth_cookie($_COOKIE[AUTH_COOKIE], 'auth');
                if ($user_id) {
                    error_log("GlossPress: Admin cookie auth successful - User ID: {$user_id}");
                    wp_set_current_user($user_id);
                    if (current_user_can('edit_posts')) {
                        return true;
                    }
                }
            }
            
            error_log("GlossPress: All authentication methods failed");
            return new WP_Error('not_logged_in', 'You must be logged in.', array('status' => 401));
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

    // Alternative endpoint for autosave context
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/categories/autosave', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_categories_autosave',
        'permission_callback' => function ($request) {
            // More permissive permission check that works during autosave
            $term_id = $request->get_param('id');
            
            // Check if user is logged in
            if (!is_user_logged_in()) {
                return false;
            }
            
            // Check if user can edit posts in general
            if (!current_user_can('edit_posts')) {
                return false;
            }
            
            // Check if the specific post exists and user can edit it
            if ($term_id) {
                $post = get_post($term_id);
                if ($post && current_user_can('edit_post', $term_id)) {
                    return true;
                }
            }
            
            return current_user_can('edit_posts');
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

    // Update tags for a glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/tags', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_tags',
        'permission_callback' => function ($request) {
            // More permissive permission check that works during autosave
            $term_id = $request->get_param('id');
            
            // Check if user is logged in
            if (!is_user_logged_in()) {
                return false;
            }
            
            // Check if user can edit posts in general
            if (!current_user_can('edit_posts')) {
                return false;
            }
            
            // Check if the specific post exists and user can edit it
            if ($term_id) {
                $post = get_post($term_id);
                if ($post && current_user_can('edit_post', $term_id)) {
                    return true;
                }
            }
            
            return current_user_can('edit_posts');
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

    // Alternative endpoint for autosave context
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/tags/autosave', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_tags_autosave',
        'permission_callback' => function ($request) {
            // More permissive permission check that works during autosave
            $term_id = $request->get_param('id');
            
            // Check if user is logged in
            if (!is_user_logged_in()) {
                return false;
            }
            
            // Check if user can edit posts in general
            if (!current_user_can('edit_posts')) {
                return false;
            }
            
            // Check if the specific post exists and user can edit it
            if ($term_id) {
                $post = get_post($term_id);
                if ($post && current_user_can('edit_post', $term_id)) {
                    return true;
                }
            }
            
            return current_user_can('edit_posts');
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

    // Diagnostic endpoint to check autosave status
    register_rest_route('wp/v2', '/glossary/diagnostic', array(
        'methods' => 'GET',
        'callback' => 'get_glossary_diagnostic',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        }
    ));

    // Delete glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'delete_glossary_term',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
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

    // Get logs
    register_rest_route('wp/v2', '/logs', array(
        'methods' => 'GET',
        'callback' => 'get_logs',
        'permission_callback' => function () {
            return current_user_can('edit_posts'); // Allow only editors and above
        }
    ));

    // Clear logs
    register_rest_route('wp/v2', '/logs', array(
        'methods' => 'DELETE',
        'callback' => 'clear_logs',
        'permission_callback' => function () {
            return current_user_can('edit_posts'); // Allow only editors and above
        }
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

// Function to fetch glossary terms (summary data only for performance)
function get_glossary_terms($request) {
    $cached_terms = get_transient('acemedia_glossary_terms_summary');

    if ($cached_terms !== false) {
        return new WP_REST_Response($cached_terms, 200);
    }

    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
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
            'isOpen' => false,
            'isLoaded' => false, // Flag to track if full data is loaded
        ];
    }, $terms);

    set_transient('acemedia_glossary_terms_summary', $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}



// Function to save a glossary term
function save_glossary_term($request) {
    $data = $request->get_json_params();

    $title = isset($data['title']) ? sanitize_text_field($data['title']) : '';
    $content = isset($data['content']) ? $data['content'] : '';
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

    // Update metadata with bidirectional relationship handling
    $current_related = get_post_meta($post_id, 'related_terms', true) ?: [];
    
    // Update the current term's related terms
    update_post_meta($post_id, 'related_terms', $related_terms);

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

    // Update categories
    if (!empty($categories)) {
        wp_set_post_terms($post_id, $categories, 'category');
    }

    // Update tags
    if (!empty($tags)) {
        wp_set_post_terms($post_id, $tags, 'post_tag');
    }

    // Clear transient caches
    delete_transient('acemedia_glossary_terms');
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient("acemedia_glossary_term_{$post_id}");
    delete_transient('acemedia_glossary_prefetch_data');
    delete_transient('acemedia_glossary_related_terms_lookup');

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
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');
    delete_transient('acemedia_glossary_related_terms_lookup');

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



// Function to fetch a single glossary term with full data
function get_single_glossary_term($request) {
    $term_id = $request->get_param('id');
    
    $cached_term = get_transient("acemedia_glossary_term_{$term_id}");
    if ($cached_term !== false) {
        return new WP_REST_Response($cached_term, 200);
    }

    $term = get_post($term_id);
    
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    $related_terms = get_post_meta($term_id, 'related_terms', true);

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
        'isOpen' => false,
        'isLoaded' => true,
    ];

    set_transient("acemedia_glossary_term_{$term_id}", $response, HOUR_IN_SECONDS);

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

    // Clear caches
    delete_transient("acemedia_glossary_term_{$term_id}");
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_related_terms_lookup');

    return new WP_REST_Response(['success' => true, 'relatedTerms' => $related_term_ids], 200);
}

// Function to update categories for a glossary term
function update_glossary_term_categories($request) {
    $term_id = $request->get_param('id');
    $data = $request->get_json_params();
    $category_ids = isset($data['categories']) ? array_map('intval', $data['categories']) : [];

    // Log the request for debugging
    error_log("GlossPress: update_glossary_term_categories called - Term ID: {$term_id}, Categories: " . json_encode($category_ids));

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        error_log("GlossPress: Term not found or wrong type - Term ID: {$term_id}");
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // Check if we're in an autosave context and handle it appropriately
    $is_autosave = defined('DOING_AUTOSAVE') && DOING_AUTOSAVE;
    $is_ajax = defined('DOING_AJAX') && DOING_AJAX;
    
    error_log("GlossPress: Context - Autosave: " . ($is_autosave ? 'YES' : 'NO') . ", AJAX: " . ($is_ajax ? 'YES' : 'NO'));
    
    // Additional permission check for autosave context
    if ($is_autosave) {
        if (!current_user_can('edit_post', $term_id)) {
            error_log("GlossPress: Insufficient permissions during autosave for term {$term_id}");
            return new WP_Error('insufficient_permissions', 'Insufficient permissions to update categories during autosave', array('status' => 403));
        }
    }

    // Validate category IDs exist
    if (!empty($category_ids)) {
        foreach ($category_ids as $cat_id) {
            if (!term_exists($cat_id, 'category')) {
                error_log("GlossPress: Invalid category ID: {$cat_id}");
                return new WP_Error('invalid_category', "Category with ID {$cat_id} does not exist", array('status' => 400));
            }
        }
    }

    // Update categories with error handling
    $result = wp_set_post_terms($term_id, $category_ids, 'category');
    
    error_log("GlossPress: wp_set_post_terms result: " . json_encode($result));
    
    if (is_wp_error($result)) {
        error_log("GlossPress: wp_set_post_terms error: " . $result->get_error_message());
        return new WP_Error('update_failed', 'Failed to update categories: ' . $result->get_error_message(), array('status' => 500));
    }
    
    if ($result === false) {
        error_log("GlossPress: wp_set_post_terms returned false");
        return new WP_Error('update_failed', 'Failed to update categories: wp_set_post_terms returned false', array('status' => 500));
    }

    // Clear caches
    delete_transient("acemedia_glossary_term_{$term_id}");
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');

    error_log("GlossPress: Categories updated successfully for term {$term_id}");

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

    // Clear caches
    delete_transient("acemedia_glossary_term_{$term_id}");
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');

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
    
    // Convert to string for consistent storage
    $stored_value = $value ? 'true' : 'false';
    update_option('acemedia_glossary_auto_highlight', $stored_value);
    
    return new WP_REST_Response(['success' => true, 'value' => $value], 200);
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
    $cached_lookup = get_transient('acemedia_glossary_related_terms_lookup');
    
    if ($cached_lookup !== false) {
        return new WP_REST_Response($cached_lookup, 200);
    }

    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
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

    set_transient('acemedia_glossary_related_terms_lookup', $lookup, HOUR_IN_SECONDS);

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
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    return new WP_REST_Response($diagnostic_info, 200);
}
