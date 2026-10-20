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

        // Ensure core editor scripts and media utilities are available
        wp_enqueue_editor();
        wp_enqueue_media();

        // Dequeue block editor scripts to avoid conflicts
        wp_dequeue_script('wp-edit-post');

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
        
        // Custom admin script - no dependencies since we enqueued everything above
        $asset = include ACEMEDIA_GLOSSARY_PATH . 'build/glossary-admin.asset.php';

        wp_enqueue_script(
            'acemedia-glossary-admin',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );

        // Custom admin styles
        wp_enqueue_style(
            'acemedia-glossary-admin-styles',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.css',
            array('wp-admin', 'wp-components'),
            ACEMEDIA_GLOSSARY_VERSION
        );

        // Enqueue WordPress block editor styles (but not full editor interface)
        wp_enqueue_style('wp-block-editor');
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('wp-block-library-theme');

        // Avoid loading the full editor chrome that conflicts with our layout
        wp_dequeue_style('wp-edit-post');
        wp_dequeue_style('wp-edit-site');

        // Add editor localization data required by block library
        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('wp-block-library', 'default');
        }

        // Localize script to pass PHP data to JavaScript
        wp_localize_script('acemedia-glossary-admin', 'AceMediaGlossaryAdmin', array(
            'apiUrl' => esc_url_raw(get_rest_url(null, '/')), // Ensure correct REST API URL
            'nonce' => wp_create_nonce('wp_rest'), // REST API nonce
            'siteUrl' => esc_url(home_url('/')),
            'styleDefaults' => AceMediaGlossary_Style_Settings::get_styles(),
            'colorPalette' => AceMediaGlossary_Style_Settings::get_color_palette(),
            'stylesEndpoint' => '/wp/v2/options/glossary_styles',
            'restRoot' => esc_url_raw(get_rest_url(null, '/')),
        ));
    }
}

function render_acemedia_glossary_settings_page() {
    if (!current_user_can('manage_options')) { wp_die(esc_html__('You cannot manage glossary settings.', 'acemedia-glossary')); }
    ?>
        <div class="wrap"><div id="ace-settings-root"></div></div>
    <?php
}
