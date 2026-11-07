<?php
/**
 * A glossary term's own page: the structured data search engines read, a document title that
 * says what the page is, and a block that places the term in its glossary with its related terms.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AceMedia_Glossary_Term_Page {

    public static function init() {
        add_action('wp_head', array(__CLASS__, 'schema'), 20);
        add_filter('document_title_parts', array(__CLASS__, 'title'), 20);
        add_action('init', array(__CLASS__, 'register_block'));
    }

    /** The page the A to Z lives on: the page carrying the glossary's slug, else the archive. */
    public static function glossary_url() {
        $slug = (string) get_option('acemedia_glossary_archive_slug', 'glossary');
        $page = $slug !== '' ? get_page_by_path($slug) : null;
        if ($page instanceof WP_Post && 'publish' === $page->post_status) {
            return get_permalink($page);
        }
        $archive = get_post_type_archive_link('acemedia_glossary');
        return $archive ? $archive : home_url('/');
    }

    private static function plain($content) {
        $text = wp_strip_all_tags(has_blocks($content) ? do_blocks($content) : $content);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /** "<Term> | Glossary", so a result says what kind of page it is. Filterable. */
    public static function title($parts) {
        if (!is_singular('acemedia_glossary')) {
            return $parts;
        }
        $format = (string) apply_filters('acemedia_glossary_term_title_format', '%1$s | %2$s');
        $set    = (string) apply_filters('acemedia_glossary_term_set_name', get_post_type_object('acemedia_glossary')->labels->name);
        $parts['title'] = sprintf($format, wp_strip_all_tags(get_the_title()), $set);
        return $parts;
    }

    /** DefinedTerm JSON-LD for the term, tied to the glossary's DefinedTermSet. */
    public static function schema() {
        if (!is_singular('acemedia_glossary')) {
            return;
        }
        $post = get_queried_object();
        if (!$post instanceof WP_Post) {
            return;
        }
        $set    = self::glossary_url();
        $schema = array(
            '@context'         => 'https://schema.org',
            '@type'            => 'DefinedTerm',
            '@id'              => get_permalink($post) . '#term',
            'name'             => wp_strip_all_tags(get_the_title($post)),
            'description'      => self::plain($post->post_content),
            'url'              => get_permalink($post),
            'inDefinedTermSet' => array('@type' => 'DefinedTermSet', '@id' => $set . '#glossary', 'url' => $set),
        );
        $synonyms = get_post_meta($post->ID, 'synonyms', true);
        if (is_array($synonyms) && $synonyms) {
            $schema['alternateName'] = array_values(array_filter(array_map('strval', $synonyms)));
        }
        echo '<script type="application/ld+json">' . wp_json_encode(apply_filters('acemedia_glossary_term_schema', $schema, $post), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . '</script>' . "\n";
    }

    public static function register_block() {
        register_block_type('acemedia/glossary-term-nav', array(
            'api_version'     => 3,
            'render_callback' => array(__CLASS__, 'render_nav'),
            'supports'        => array('html' => false),
            'attributes'      => array(
                'label'   => array('type' => 'string', 'default' => ''),
                'related' => array('type' => 'string', 'default' => ''),
            ),
        ));
    }

    /** "Part of the Glossary" with the A to Z link, then the term's related terms as pills. */
    public static function render_nav($attributes = array()) {
        if (!is_singular('acemedia_glossary')) {
            return '';
        }
        $post  = get_queried_object();
        $set   = (string) apply_filters('acemedia_glossary_term_set_name', get_post_type_object('acemedia_glossary')->labels->name);
        $label = trim((string) ($attributes['label'] ?? '')) ?: sprintf(__('Part of the %s', 'acemedia-glossary'), $set);
        $html  = '<nav class="glossary-term-nav" aria-label="' . esc_attr__('Glossary', 'acemedia-glossary') . '">';
        $html .= '<a class="glossary-term-nav__set" href="' . esc_url(self::glossary_url()) . '">' . esc_html($label) . '</a>';
        $ids   = $post instanceof WP_Post ? get_post_meta($post->ID, 'related_terms', true) : array();
        $links = array();
        foreach (is_array($ids) ? $ids : array() as $id) {
            $term = get_post((int) $id);
            if ($term instanceof WP_Post && 'acemedia_glossary' === $term->post_type && 'publish' === $term->post_status) {
                $links[] = '<li><a href="' . esc_url(get_permalink($term)) . '">' . esc_html(get_the_title($term)) . '</a></li>';
            }
        }
        if ($links) {
            $heading = trim((string) ($attributes['related'] ?? '')) ?: __('Related terms', 'acemedia-glossary');
            $html   .= '<span class="glossary-term-nav__label">' . esc_html($heading) . '</span><ul class="glossary-term-nav__related">' . implode('', $links) . '</ul>';
        }
        return $html . '</nav>';
    }
}

AceMedia_Glossary_Term_Page::init();
