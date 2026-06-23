<?php
if (!defined('ABSPATH')) {
    exit;
}

class AceMediaGlossary_Block_Templates {
    public function __construct() {
        add_action('init', array($this, 'register_templates'));

        if (did_action('init')) {
            $this->register_templates();
        }
    }

    public function register_templates() {
        if (!function_exists('register_block_template')) {
            return;
        }

        if (!post_type_exists('acemedia_glossary')) {
            return;
        }

        foreach (self::template_definitions() as $slug => $template) {
            if (!file_exists($template['file'])) {
                continue;
            }

            $content = file_get_contents($template['file']);
            if ($content === false) {
                continue;
            }

            register_block_template(
                'acemedia-glossary//' . $slug,
                array(
                    'title'       => $template['title'],
                    'description' => $template['description'],
                    'content'     => $content,
                    'post_types'  => $template['post_types'],
                    'plugin'      => 'acemedia-glossary',
                )
            );
        }
    }

    public static function unregister_templates() {
        if (!function_exists('register_block_template')) {
            return;
        }

        $registry = class_exists('WP_Block_Templates_Registry') ? WP_Block_Templates_Registry::get_instance() : null;

        foreach (self::template_definitions() as $slug => $_template) {
            $id = 'acemedia-glossary//' . $slug;

            if (function_exists('unregister_block_template')) {
                unregister_block_template($id);
                continue;
            }

            if ($registry && method_exists($registry, 'unregister')) {
                $registry->unregister($id);
            }
        }
    }

    private static function template_definitions() {
        return array(
            'archive-acemedia_glossary' => array(
                'title'       => __('Glossary Archive', 'acemedia-glossary'),
                'description' => __('Archive display for glossary terms.', 'acemedia-glossary'),
                'file'        => ACEMEDIA_GLOSSARY_PATH . 'block-templates/archive-acemedia_glossary.html',
                'post_types'  => array('acemedia_glossary'),
            ),
            'single-acemedia_glossary' => array(
                'title'       => __('Glossary Item', 'acemedia-glossary'),
                'description' => __('Single glossary term layout.', 'acemedia-glossary'),
                'file'        => ACEMEDIA_GLOSSARY_PATH . 'block-templates/single-acemedia_glossary.html',
                'post_types'  => array('acemedia_glossary'),
            ),
        );
    }
}
