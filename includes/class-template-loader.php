<?php
if (!defined('ABSPATH')) {
    exit;
}

class AceMediaGlossary_Template_Loader {
    public function __construct() {
        add_filter('template_include', array($this, 'maybe_load_template'));
    }

    public function maybe_load_template($template) {
        if (function_exists('wp_is_block_theme') && wp_is_block_theme()) {
            return $template;
        }

        if (is_post_type_archive('acemedia_glossary')) {
            return $this->resolve_template('archive-acemedia_glossary.php', $template);
        }

        if (is_singular('acemedia_glossary')) {
            return $this->resolve_template('single-acemedia_glossary.php', $template);
        }

        return $template;
    }

    private function resolve_template($template_name, $default) {
        $theme_template = locate_template($template_name);
        if (!empty($theme_template)) {
            return $theme_template;
        }

        $plugin_template = ACEMEDIA_GLOSSARY_PATH . 'templates/' . $template_name;
        if (file_exists($plugin_template)) {
            return $plugin_template;
        }

        return $default;
    }
}
