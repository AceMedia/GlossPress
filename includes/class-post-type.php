<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_PostType {

    public function __construct() {
        add_action('init', array($this, 'registerPostType'));
    }
    public function registerPostType() {
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
            'supports' => array('title', 'editor', 'custom-fields'),
            'menu_icon' => 'dashicons-book-alt',
            'has_archive' => true,
            'rewrite' => array('slug' => 'glossary'),
            'taxonomies' => array('category', 'post_tag'),  // Enable categories and tags
        ));
    }
    

}

// Initialize the post type on 'plugins_loaded' to ensure WordPress is fully loaded.
add_action('plugins_loaded', function() {
    new AceMediaGlossary_PostType();
});
