<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Admin {
    public function __construct() {
        add_action('admin_menu', array($this, 'addAdminMenu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueueAssets'));
    }

    public function addAdminMenu() {
        add_submenu_page(
            'edit.php?post_type=acemedia_glossary',
            'Glossary Settings',     // Page title
            'Glossary Settings',     // Menu title
            'manage_options',        // Capability
            'acemedia-glossary-settings', // Menu slug
            'render_acemedia_glossary_settings_page' // Callback function
        );
    }


    

    public function enqueueAssets($hook) {
        // Only enqueue scripts on the glossary settings page
        if ('acemedia_glossary_page_acemedia-glossary-settings' !== $hook) {
            return;
        }
    
        // Enqueue WordPress core admin styles for color schemes and other admin-specific styles
        wp_enqueue_style('wp-admin'); 
        
        // Enqueue WordPress component styles for consistent styling
        wp_enqueue_style('wp-components'); 
    
        // Enqueue the active admin color scheme
        global $_wp_admin_css_colors;
        $color_scheme = get_user_option('admin_color');
        if ($color_scheme && isset($_wp_admin_css_colors[$color_scheme])) {
            wp_enqueue_style(
                'admin-color-scheme',
                $_wp_admin_css_colors[$color_scheme]->url,
                array('wp-admin')
            );
        }
    
        // Enqueue the React-based admin script
        wp_enqueue_script(
            'acemedia-glossary-admin',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.js',
            array('wp-element', 'wp-components', 'wp-api-fetch'), // WordPress dependencies for React
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );
    
        // Enqueue your custom styles
        wp_enqueue_style(
            'acemedia-glossary-admin-styles',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.css',
            array('wp-admin', 'wp-components'), // Ensure wp-admin is a dependency
            ACEMEDIA_GLOSSARY_VERSION
        );
        wp_enqueue_style('wp-block-editor', includes_url('css/dist/block-editor.css'), array(), $GLOBALS['wp_version']);    
    
        // Localize script to pass PHP data to JavaScript (e.g., REST API URL)
        wp_localize_script('acemedia-glossary-admin', 'AceMediaGlossaryAdmin', array(
            'apiUrl' => esc_url_raw(rest_url('wp/v2')),
            'nonce' => wp_create_nonce('wp_rest')
        ));
    }
    

}


function render_acemedia_glossary_settings_page() {
    ?>
    <div class="wrap">
        <div id="acemedia-glossary-admin-root"></div>
    </div>
    <?php
}