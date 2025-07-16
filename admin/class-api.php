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

    // Update categories for a glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/categories', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_categories',
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

    // Update tags for a glossary term
    register_rest_route('wp/v2', '/glossary/(?P<id>\d+)/tags', array(
        'methods' => 'POST',
        'callback' => 'update_glossary_term_tags',
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

    // Verify the term exists
    $term = get_post($term_id);
    if (!$term || $term->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Glossary term not found', array('status' => 404));
    }

    // Update categories
    wp_set_post_terms($term_id, $category_ids, 'category');

    // Clear caches
    delete_transient("acemedia_glossary_term_{$term_id}");
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');

    return new WP_REST_Response(['success' => true, 'categories' => $category_ids], 200);
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

    // Update tags
    wp_set_post_terms($term_id, $tag_ids, 'post_tag');

    // Clear caches
    delete_transient("acemedia_glossary_term_{$term_id}");
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');

    return new WP_REST_Response(['success' => true, 'tags' => $tag_ids], 200);
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

    set_transient('acemedia_glossary_related_terms_lookup', $lookup, HOUR_IN_SECONDS);

    return new WP_REST_Response($lookup, 200);
}
