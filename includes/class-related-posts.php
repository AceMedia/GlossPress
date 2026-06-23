<?php
if (!defined('ABSPATH')) {
    exit;
}

class AceMediaGlossary_Related_Posts {
    public static function fetch($args = array()) {
        $defaults = array(
            'term_id'       => 0,
            'search_term'   => '',
            'category_ids'  => array(),
            'tag_ids'       => array(),
            'per_page'      => 3,
            'page'          => 1,
            'post_types'    => null,
        );

        $args = wp_parse_args($args, $defaults);

        $term_id      = (int) $args['term_id'];
        $search_term  = sanitize_text_field($args['search_term']);
        $category_ids = array_filter(array_map('intval', (array) $args['category_ids']));
        $tag_ids      = array_filter(array_map('intval', (array) $args['tag_ids']));
        $per_page     = (int) $args['per_page'];
        $page         = (int) $args['page'];

        // Check if post relations are enabled for this term
        if ($term_id > 0) {
            $enable_post_relations = (bool) get_post_meta($term_id, 'enable_post_relations', true);
            if (!$enable_post_relations) {
                // Return empty result if post relations are disabled
                return array(
                    'posts'         => array(),
                    'found_posts'   => 0,
                    'max_num_pages' => 0,
                    'used_fallback' => false,
                    'query_args'    => array(),
                    'search_term'   => $search_term,
                );
            }
        }

        if ($term_id > 0 && '' === $search_term) {
            $term_post = get_post($term_id);
            if ($term_post) {
                $search_term = $term_post->post_title;
            }
        }

        // If we have a search term, check if there's a longer glossary term that contains it
        // This prevents "ace" from matching posts about "ace 123" when "ace 123" is its own term
        if ($search_term !== '') {
            $search_term = self::get_longest_matching_term($search_term);
        }

        $per_page = 0 === $per_page ? -1 : $per_page;
        if (0 !== $per_page) {
            $per_page = max(-1, $per_page);
        }

        $page = max(1, $page);

        $post_types = $args['post_types'];
        if (empty($post_types) || !is_array($post_types)) {
            $post_types = apply_filters('acemedia_glossary_related_post_types', array('post'));
        }

        $base_query = array(
            'post_type'           => $post_types,
            'post_status'         => 'publish',
            'ignore_sticky_posts' => true,
            'orderby'             => 'date',
            'order'               => 'DESC',
            'no_found_rows'       => false,
        );

        if ($per_page !== 0) {
            $base_query['posts_per_page'] = $per_page;
        }

        if ($per_page > 0) {
            $base_query['paged'] = $page;
        }

        $used_fallback = false;

        if ($search_term !== '') {
            $primary_query_args = $base_query;
            $primary_query_args['s'] = $search_term;
            $primary_query_args['sentence'] = true;
            $primary_query_args['exact'] = true;
            $primary_query_args['search_columns'] = array('post_title', 'post_content');
            $primary_query_args['no_found_rows'] = true;
            if (!isset($primary_query_args['posts_per_page']) || $primary_query_args['posts_per_page'] < 1) {
                $primary_query_args['posts_per_page'] = 25;
            } else {
                $primary_query_args['posts_per_page'] = max($primary_query_args['posts_per_page'], 25);
            }

            $primary_query = new WP_Query($primary_query_args);

            if ($primary_query->have_posts()) {
                $filtered_posts = self::filter_posts_by_exact_term($primary_query->posts, $search_term);

                if (!empty($filtered_posts)) {
                    $limited_posts = self::maybe_limit_posts($filtered_posts, $per_page);
                    $post_ids = array_map('intval', wp_list_pluck($limited_posts, 'ID'));

                    $query_overrides = array(
                        'posts'         => $limited_posts,
                        'found_posts'   => count($limited_posts),
                        'max_num_pages' => ($per_page > 0 && count($limited_posts) >= $per_page) ? 1 : 0,
                        'used_fallback' => false,
                        'query_args'    => array_merge(
                            $primary_query_args,
                            array(
                                'orderby'            => 'post__in',
                                'ignore_sticky_posts'=> true,
                                'posts_per_page'     => ($per_page > 0 ? $per_page : -1),
                            )
                        ),
                        'search_term'   => $search_term,
                    );

                    if (!empty($post_ids)) {
                        $query_overrides['query_args']['post__in'] = $post_ids;
                    }

                    return $query_overrides;
                }
            }
        }

        if (!empty($category_ids) || !empty($tag_ids)) {
            $fallback_args = $base_query;
            $fallback_args['tax_query'] = array('relation' => 'OR');

            if (!empty($category_ids)) {
                $fallback_args['tax_query'][] = array(
                    'taxonomy' => 'category',
                    'field'    => 'term_id',
                    'terms'    => $category_ids,
                );
            }

            if (!empty($tag_ids)) {
                $fallback_args['tax_query'][] = array(
                    'taxonomy' => 'post_tag',
                    'field'    => 'term_id',
                    'terms'    => $tag_ids,
                );
            }

            $fallback_query = new WP_Query($fallback_args);

            $limited_fallback_posts = self::maybe_limit_posts($fallback_query->posts, $per_page);
            $post_ids = array_map('intval', wp_list_pluck($limited_fallback_posts, 'ID'));

            $response = array(
                'posts'         => $limited_fallback_posts,
                'found_posts'   => count($limited_fallback_posts),
                'max_num_pages' => ($per_page > 0 && count($limited_fallback_posts) >= $per_page) ? 1 : 0,
                'used_fallback' => true,
                'query_args'    => array_merge(
                    $fallback_args,
                    array(
                        'orderby'            => !empty($post_ids) ? 'post__in' : 'date',
                        'ignore_sticky_posts'=> true,
                        'posts_per_page'     => ($per_page > 0 ? $per_page : -1),
                    )
                ),
                'search_term'   => $search_term,
            );

            if (!empty($post_ids)) {
                $response['query_args']['post__in'] = $post_ids;
            }

            return $response;
        }

        return array(
            'posts'         => array(),
            'found_posts'   => 0,
            'max_num_pages' => 0,
            'used_fallback' => false,
            'query_args'    => $base_query,
            'search_term'   => $search_term,
        );
    }

    private static function maybe_limit_posts($posts, $per_page) {
        if ($per_page > 0 && count($posts) > $per_page) {
            return array_slice($posts, 0, $per_page);
        }

        return $posts;
    }

    private static function filter_posts_by_exact_term($posts, $term) {
        $term = trim((string) $term);
        if ($term === '') {
            return $posts;
        }

        // Get all glossary terms sorted by length (longest first)
        $all_glossary_terms = self::get_all_glossary_terms_sorted();
        
        $pattern = self::build_term_boundary_pattern($term);
        $filtered = array();

        $charset = get_bloginfo('charset');

        foreach ($posts as $post) {
            $haystacks = array(
                isset($post->post_title) ? html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, $charset) : '',
                isset($post->post_excerpt) ? html_entity_decode($post->post_excerpt, ENT_QUOTES | ENT_HTML5, $charset) : '',
                isset($post->post_content) ? wp_strip_all_tags($post->post_content) : '',
            );

            $should_include = false;
            
            foreach ($haystacks as $haystack) {
                if ($haystack === '') {
                    continue;
                }
                
                // First, check if any longer term that contains our term matches
                // If it does, we need to check if the LONGER term is what's actually in the content
                $longer_term_matches = array();
                
                foreach ($all_glossary_terms as $other_term) {
                    // Skip if it's the same term (case-insensitive)
                    if (mb_strtolower($other_term, 'UTF-8') === mb_strtolower($term, 'UTF-8')) {
                        continue;
                    }
                    
                    // Skip if the other term is not longer
                    if (strlen($other_term) <= strlen($term)) {
                        continue;
                    }
                    
                    // Check if this longer term contains our term
                    $other_term_lower = mb_strtolower($other_term, 'UTF-8');
                    $term_lower = mb_strtolower($term, 'UTF-8');
                    
                    if (strpos($other_term_lower, $term_lower) !== false) {
                        // Check if this longer term matches in the content
                        $other_pattern = self::build_term_boundary_pattern($other_term);
                        if (preg_match($other_pattern, $haystack)) {
                            $longer_term_matches[] = $other_term;
                        }
                    }
                }
                
                // Now check if the current term matches AS A STANDALONE WORD
                // (not as part of a longer term that we found)
                if (preg_match($pattern, $haystack)) {
                    // If we found longer term matches, we need to check if the shorter term
                    // appears OUTSIDE of those longer terms
                    if (!empty($longer_term_matches)) {
                        // Remove all instances of longer terms from the haystack
                        $haystack_without_longer_terms = $haystack;
                        foreach ($longer_term_matches as $longer_term) {
                            $longer_pattern = self::build_term_boundary_pattern($longer_term);
                            $haystack_without_longer_terms = preg_replace($longer_pattern, '', $haystack_without_longer_terms);
                        }
                        
                        // Now check if the shorter term still appears in the modified haystack
                        if (preg_match($pattern, $haystack_without_longer_terms)) {
                            // The shorter term appears independently, so include this post
                            $should_include = true;
                            break;
                        }
                        // Otherwise, the shorter term only appears as part of longer terms,
                        // so don't include this post
                    } else {
                        // No longer terms matched, so this post is valid for the shorter term
                        $should_include = true;
                        break;
                    }
                }
            }
            
            if ($should_include) {
                $filtered[] = $post;
            }
        }

        return $filtered;
    }

    private static function build_term_boundary_pattern($term) {
        $escaped = preg_quote($term, '/');
        return '/(?<![\p{L}\p{N}_])' . $escaped . '(?![\p{L}\p{N}_])/iu';
    }

    /**
     * Get the longest matching glossary term to avoid partial matches
     * e.g., if searching for "ace" but "ace 123" exists as a term, return "ace"
     * because we want to exclude posts that only match the longer term
     */
    private static function get_longest_matching_term($search_term) {
        $all_terms = self::get_all_glossary_terms_sorted();

        if (empty($all_terms)) {
            return $search_term;
        }

        // Check each term (longest first) to see if it matches the search term
        // If we find the search term as an exact match, return it
        // This ensures we use the most specific term available
        $search_lower = mb_strtolower($search_term, 'UTF-8');
        
        foreach ($all_terms as $term) {
            $term_lower = mb_strtolower($term, 'UTF-8');
            // Exact match - this is our term
            if ($term_lower === $search_lower) {
                return $term;
            }
        }

        // No exact match found, return original
        return $search_term;
    }

    /**
     * Get all glossary term titles sorted by length (longest first)
     * Uses transient caching to avoid repeated queries
     * Optionally filters by categories/tags of the current post
     */
    private static function get_all_glossary_terms_sorted() {
        global $post;
        
        // Get current post's categories and tags for filtering
        $current_post_categories = array();
        $current_post_tags = array();
        
        if (isset($post) && $post->ID) {
            $current_post_categories = wp_get_post_categories($post->ID);
            $current_post_tags = wp_get_post_tags($post->ID, array('fields' => 'ids'));
        }
        
        // Create cache key based on current post's taxonomies
        $cache_suffix = '';
        if (!empty($current_post_categories) || !empty($current_post_tags)) {
            $cache_suffix = '_' . md5(serialize($current_post_categories) . serialize($current_post_tags));
        }
        $cache_key = 'acemedia_glossary_terms_titles_sorted' . $cache_suffix;
        $cached = get_transient($cache_key);
        
        if ($cached !== false && is_array($cached)) {
            return $cached;
        }

        // Get all glossary terms
        $glossary_posts = get_posts([
            'post_type' => 'acemedia_glossary',
            'numberposts' => -1,
            'post_status' => 'publish',
            'fields' => 'ids', // Only get IDs for efficiency
        ]);

        if (empty($glossary_posts)) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }

        // Get titles (only for terms with post relations enabled)
        $all_terms = array();
        foreach ($glossary_posts as $post_id) {
            // Skip terms that don't have post relations enabled
            $enable_post_relations = (bool) get_post_meta($post_id, 'enable_post_relations', true);
            if (!$enable_post_relations) {
                continue;
            }
            
            // Filter by categories/tags if we have a current post
            if (!empty($current_post_categories) || !empty($current_post_tags)) {
                // Get term's associated categories and tags using WordPress taxonomy functions
                $term_categories = wp_get_post_categories($post_id);
                $term_tags = wp_get_post_tags($post_id, array('fields' => 'ids'));

                // Check if the term shares at least one category or tag with the current post
                $has_shared_category = !empty(array_intersect($current_post_categories, $term_categories));
                $has_shared_tag = !empty(array_intersect($current_post_tags, $term_tags));

                // Skip terms that don't share categories/tags (unless they have no categories/tags - apply to all)
                if (!$has_shared_category && !$has_shared_tag && (!empty($term_categories) || !empty($term_tags))) {
                    continue;
                }
            }
            
            $title = get_the_title($post_id);
            if (!empty($title)) {
                $all_terms[] = $title;
            }
        }

        // Sort by length descending (longest first)
        usort($all_terms, function($a, $b) {
            return strlen($b) - strlen($a);
        });

        // Cache for 1 hour
        set_transient($cache_key, $all_terms, HOUR_IN_SECONDS);

        return $all_terms;
    }
}
