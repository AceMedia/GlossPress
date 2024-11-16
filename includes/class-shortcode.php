<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Shortcode {
    public function __construct() {
        add_shortcode('glossary', array($this, 'renderShortcode'));
    }

    /**
     * Renders the Glossary Shortcode
     *
     * @param array $atts Shortcode attributes.
     * @return string HTML output for the glossary.
     */
    public function renderShortcode($atts) {
        // Merge default attributes with user-defined ones.
        $atts = shortcode_atts(array(
            'sort' => 'alphabetical', // Default sort order
        ), $atts, 'glossary');

        // Enqueue the frontend script
        wp_enqueue_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
            array('wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );
        

        // Localize script to pass shortcode attributes as data
        wp_localize_script(
            'acemedia-glossary-frontend',
            'AceMediaGlossaryData',
            array(
                'restUrl' => esc_url(rest_url('wp/v2/glossary')),
                'nonce'   => wp_create_nonce('wp_rest'),
                'sort'    => esc_attr($atts['sort']),
            )
        );

        // Enqueue the frontend stylesheet
        wp_enqueue_style(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.css',
            array(),
            ACEMEDIA_GLOSSARY_VERSION
        );

        // Return the container where React will render the app
        return '<div id="acemedia-glossary-root"></div>';
    }
}
