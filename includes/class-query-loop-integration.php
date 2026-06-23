<?php
if (!defined('ABSPATH')) {
    exit;
}

class AceMediaGlossary_Query_Loop_Integration {
    private static $cache = array();

    public function __construct() {
        add_filter('query_loop_block_query_vars', array($this, 'filter_query_vars'), 10, 3);
    }

    public function filter_query_vars($query_vars, $block, $page) {
        if (!is_singular('acemedia_glossary')) {
            return $query_vars;
        }

        if (!($block instanceof WP_Block)) {
            return $query_vars;
        }

        $class_name = isset($block->parsed_block['attrs']['className']) ? (string) $block->parsed_block['attrs']['className'] : '';
        if ('' === $class_name || false === strpos(' ' . $class_name . ' ', ' acemedia-glossary-related-query ')) {
            return $query_vars;
        }

        if (!class_exists('AceMediaGlossary_Related_Posts')) {
            return $query_vars;
        }

        $term_id = get_the_ID();
        if (!$term_id) {
            return $query_vars;
        }

        $per_page = isset($query_vars['posts_per_page']) ? (int) $query_vars['posts_per_page'] : -1;
        if (0 === $per_page) {
            $per_page = -1;
        }

        $post_types = array();
        if (!empty($query_vars['post_type'])) {
            $post_types = (array) $query_vars['post_type'];
        }

        $cache_key = md5(wp_json_encode(array(
            'term_id'   => $term_id,
            'page'      => max(1, (int) $page),
            'per_page'  => $per_page,
            'post_type' => $post_types,
        )));

        if (!isset(self::$cache[$cache_key])) {
            $search_term = get_the_title($term_id);

            $category_ids = wp_get_post_terms($term_id, 'category', array('fields' => 'ids'));
            if (is_wp_error($category_ids)) {
                $category_ids = array();
            }

            $tag_ids = wp_get_post_terms($term_id, 'post_tag', array('fields' => 'ids'));
            if (is_wp_error($tag_ids)) {
                $tag_ids = array();
            }

            $results = AceMediaGlossary_Related_Posts::fetch(array(
                'term_id'      => $term_id,
                'search_term'  => $search_term,
                'category_ids' => $category_ids,
                'tag_ids'      => $tag_ids,
                'per_page'     => $per_page,
                'page'         => max(1, (int) $page),
                'post_types'   => $post_types,
            ));

            self::$cache[$cache_key] = $results;
        } else {
            $results = self::$cache[$cache_key];
        }

        if (empty($results['posts'])) {
            $query_vars['post__in'] = array(0);
            $query_vars['orderby'] = 'none';
            $query_vars['ignore_sticky_posts'] = true;
            unset($query_vars['s'], $query_vars['tax_query']);
            return $query_vars;
        }

        if (!empty($results['query_args']) && is_array($results['query_args'])) {
            $query_vars = array_merge($query_vars, $results['query_args']);
        }

        $query_vars['ignore_sticky_posts'] = true;
        $query_vars['paged'] = max(1, (int) $page);

        return $query_vars;
    }
}
