<?php
/**
 * Plugin Name: AceMedia Glossary
 * Description: A glossary system with React-based admin and frontend interfaces
 * Version: 1.0.0
 * Author: AceMedia
 */

if (!defined('ABSPATH')) exit;

function enqueue_wp_components() {
    wp_enqueue_script('wp-components');
    wp_enqueue_script('react');
    wp_enqueue_script('react-dom');
}
add_action('wp_enqueue_scripts', 'enqueue_wp_components');



class AceMediaGlossary {
    private static $instance = null;

    public static function getInstance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->defineConstants();
        $this->loadDependencies();
        $this->initHooks();
    }

    private function defineConstants() {
        define('ACEMEDIA_GLOSSARY_PATH', plugin_dir_path(__FILE__));
        define('ACEMEDIA_GLOSSARY_URL', plugin_dir_url(__FILE__));
        define('ACEMEDIA_GLOSSARY_VERSION', '1.0.0');
    }

    private function loadDependencies() {
        require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-post-type.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-shortcode.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'admin/class-admin.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'admin/class-api.php';
    }

    private function initHooks() {
        add_action('init', array($this, 'initPlugin'));
        add_action('wp_enqueue_scripts', array($this, 'enqueueFrontendScripts'));
    }

    public function initPlugin() {
        new AceMediaGlossary_PostType();
        new AceMediaGlossary_Shortcode();
        new AceMediaGlossary_Admin();
    }

    public function enqueueFrontendScripts() {
        // Enqueue frontend script for React UI
        wp_register_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
            array('wp-element'), // Ensure React is available
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );
    
        // Check if the glossary block or shortcode is present
        if ($this->hasGlossaryContent()) {
            wp_enqueue_script('acemedia-glossary-frontend');
        }
    }
    
    private function hasGlossaryContent() {
        global $post;
        if (!$post) {
            return false;
        }
    
        return has_block('acemedia/glossary', $post->post_content) || has_shortcode($post->post_content, 'glossary');
    }


}

// Initialize the plugin
AceMediaGlossary::getInstance();
