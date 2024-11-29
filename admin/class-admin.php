<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Admin {
    public function __construct() {
        add_action('admin_menu', array($this, 'addAdminMenu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueueAssets'));
    }

    public function addAdminMenu() {
        add_menu_page(
            'Glossary',                          // Page title
            'Glossary',                          // Menu title
            'manage_options',                    // Capability
            'acemedia-glossary-settings',        // Menu slug
            'render_acemedia_glossary_settings_page', // Callback function
            'dashicons-book-alt',                // Icon
            20                                   // Position
        );
    }

    public function enqueueAssets($hook) {
        // Only enqueue scripts on the glossary settings page
        if ('toplevel_page_acemedia-glossary-settings' !== $hook) {
            return;
        }

        // Core WordPress scripts
        wp_enqueue_script('wp-element');
        wp_enqueue_script('wp-data');
        wp_enqueue_script('wp-core-data');
        wp_enqueue_script('wp-components');
        wp_enqueue_script('wp-api-fetch'); // Ensure this is included for API calls



    
        // Enqueue the Isolated Block Editor
        wp_enqueue_script(
            'isolated-block-editor',
            ACEMEDIA_GLOSSARY_URL . 'editor/isolated-block-editor.js',
            array('react', 'react-dom'),
            '2.29.0',
            true
        );
    
        wp_enqueue_style(
            'isolated-block-editor-core',
            ACEMEDIA_GLOSSARY_URL . 'editor/core.css',
            array(),
            '2.29.0'
        );
    
        wp_enqueue_style(
            'isolated-block-editor',
            ACEMEDIA_GLOSSARY_URL . 'editor/isolated-block-editor.css',
            array(),
            '2.29.0'
        );
    


        // Enqueue the admin color scheme for styling
        global $_wp_admin_css_colors;
        $color_scheme = get_user_option('admin_color');
        if ($color_scheme && isset($_wp_admin_css_colors[$color_scheme])) {
            wp_enqueue_style(
                'admin-color-scheme',
                $_wp_admin_css_colors[$color_scheme]->url,
                array('wp-admin')
            );
        }

        // Custom admin script
        wp_enqueue_script(
            'acemedia-glossary-admin',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.js',
            array('wp-editor', 'wp-block-editor', 'wp-element', 'wp-data', 'wp-core-data', 'wp-components', 'wp-api-fetch'),
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );

        // Custom admin styles
        wp_enqueue_style(
            'acemedia-glossary-admin-styles',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.css',
            array('wp-admin', 'wp-components'),
            ACEMEDIA_GLOSSARY_VERSION
        );

        // Enqueue block editor styles

        // Localize script to pass PHP data to JavaScript
        wp_localize_script('acemedia-glossary-admin', 'AceMediaGlossaryAdmin', array(
            'apiUrl' => esc_url_raw(get_rest_url(null, '/')), // Ensure correct REST API URL
            'nonce' => wp_create_nonce('wp_rest') // REST API nonce
        ));
    }
}

function render_acemedia_glossary_settings_page() {
    ?>
        <div class="wrap"><div id="ace-settings-root"></div></div>
    <?php
}
