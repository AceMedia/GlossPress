<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_PostType {

    public function __construct() {
        add_action('init', array($this, 'registerPostType'));

        if (did_action('init')) {
            $this->registerPostType();
        }
    }
    public function registerPostType() {
        self::registerPostTypeInternal();
    }

    public static function registerPostTypeNow() {
        self::registerPostTypeInternal();
    }

    private static function registerPostTypeInternal() {
        $templates_enabled = get_option('acemedia_glossary_templates_enabled', 'true');
        $frontend_enabled = ($templates_enabled === 'true' || $templates_enabled === true || $templates_enabled === 1);
        $slug_option = get_option('acemedia_glossary_archive_slug', 'glossary');
        $archive_slug = self::sanitize_slug($slug_option);
        if ($archive_slug === '') {
            $archive_slug = 'glossary';
        }

        if (post_type_exists('acemedia_glossary')) {
            if (function_exists('unregister_post_type')) {
                unregister_post_type('acemedia_glossary');
            } else {
                return;
            }
        }

        register_post_type('acemedia_glossary', array(
            'labels' => array(
                'name' => 'Glossary',
                'singular_name' => 'Glossary Item',
                'add_new' => 'Add New Term',
                'add_new_item' => 'Add New Glossary Term',
                'edit_item' => 'Edit Glossary Term',
                'search_items' => 'Search Glossary',
            ),
            'public' => true,
            'show_in_rest' => true,
            'show_ui' => true,        // Keeps the post type accessible in the admin
            'show_in_menu' => false, // Hides it from the admin menu
            'publicly_queryable' => $frontend_enabled,
            'show_in_nav_menus' => $frontend_enabled,
            'supports' => array('title', 'editor', 'custom-fields'),
            'menu_icon' => 'dashicons-book-alt',
            'has_archive' => $frontend_enabled ? $archive_slug : false,
            'rewrite' => $frontend_enabled ? array('slug' => $archive_slug, 'with_front' => false) : false,
            'exclude_from_search' => !$frontend_enabled,
            'taxonomies' => array('category', 'post_tag'),  // Enable categories and tags
        ));
    }
    

    private static function sanitize_slug($slug) {
        $slug = is_string($slug) ? $slug : '';
        $slug = sanitize_title($slug);
        return trim($slug, '/');
    }

}

// Initialize the post type on 'plugins_loaded' to ensure WordPress is fully loaded.
add_action('plugins_loaded', function() {
    new AceMediaGlossary_PostType();
});
