<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Shortcode {
    public function __construct() {
        add_shortcode('acemedia_glossary', array($this, 'renderShortcode'));
    }

    public function renderShortcode($atts) {
        wp_enqueue_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'frontend/js/dist/glossary.js',
            array('wp-element'),
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );

        wp_enqueue_style(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'frontend/css/glossary.css',
            array(),
            ACEMEDIA_GLOSSARY_VERSION
        );

        return '<div id="acemedia-glossary-root"></div>';
    }
}