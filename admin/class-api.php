<?php

add_action('rest_api_init', function() {
    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'GET',
        'callback' => 'get_glossary_terms',
        'permission_callback' => '__return_true'  // Public access for reading terms
    ));

    register_rest_route('wp/v2', '/glossary', array(
        'methods' => 'POST',
        'callback' => 'save_glossary_term',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ));

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
});

function get_glossary_terms($request) {
    // Attempt to retrieve cached data from the transient
    $cached_terms = get_transient('acemedia_glossary_terms');

    if ($cached_terms !== false) {
        return new WP_REST_Response($cached_terms, 200);
    }

    // Otherwise, fetch terms from the database
    $terms = get_posts(array(
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
    ));

    $response = array_map(function($term) {
        $related_terms = get_post_meta($term->ID, 'related_terms', true);
        return [
            'id' => $term->ID,
            'title' => get_the_title($term->ID),
            'content' => $term->post_content,
            'date' => $term->post_date,
            'modified' => $term->post_modified,
            'relatedTerms' => $related_terms ? array_map('intval', $related_terms) : [],
            'categories' => wp_get_post_terms($term->ID, 'category', array('fields' => 'ids')),
            'tags' => wp_get_post_terms($term->ID, 'post_tag', array('fields' => 'ids'))
        ];
    }, $terms);

    // Cache the response data in a transient for 1 hour
    set_transient('acemedia_glossary_terms', $response, HOUR_IN_SECONDS);

    return new WP_REST_Response($response, 200);
}

function save_glossary_term($request) {
    $data = $request->get_json_params();

    $title = isset($data['title']) ? sanitize_text_field($data['title']) : '';
    $content = isset($data['content']) ? sanitize_textarea_field($data['content']) : '';
    $term_id = isset($data['id']) ? intval($data['id']) : 0;
    $related_terms = isset($data['relatedTerms']) && is_array($data['relatedTerms']) ? array_map('intval', $data['relatedTerms']) : [];
    $categories = isset($data['categories']) && is_array($data['categories']) ? array_map('intval', $data['categories']) : [];
    $tags = isset($data['tags']) && is_array($data['tags']) ? array_map('intval', $data['tags']) : [];

    if ($term_id && get_post($term_id)) {
        // Update existing term
        $post_id = wp_update_post(array(
            'ID' => $term_id,
            'post_title' => $title,
            'post_content' => $content,
        ));
    } else {
        // Create new term
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

    // Save related terms as post meta
    update_post_meta($post_id, 'related_terms', $related_terms);

    // Set categories and tags
    wp_set_post_terms($post_id, $categories, 'category');
    wp_set_post_terms($post_id, $tags, 'post_tag');

    // Clear the transient cache since the data has changed
    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response(array('id' => $post_id), 201);
}


function delete_glossary_term($request) {
    $term_id = intval($request['id']);

    // Check if the term exists
    $post = get_post($term_id);
    if (!$post || $post->post_type !== 'acemedia_glossary') {
        return new WP_Error('term_not_found', 'Term not found', array('status' => 404));
    }

    // Delete the term
    $result = wp_delete_post($term_id, true); // True for force deletion
    if (!$result) {
        return new WP_Error('term_deletion_failed', 'Failed to delete the term', array('status' => 500));
    }

    // Clear the transient cache since the data has changed
    delete_transient('acemedia_glossary_terms');

    return new WP_REST_Response(null, 204); // No content response
}
