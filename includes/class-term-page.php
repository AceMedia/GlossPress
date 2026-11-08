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
        register_block_type('acemedia/glossary-term-header', array(
            'api_version'     => 3,
            'render_callback' => array(__CLASS__, 'render_header'),
            'supports'        => array('html' => false),
            'attributes'      => array(
                'kicker' => array('type' => 'string', 'default' => ''),
            ),
        ));
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


    /** Every published term as [id, title], A to Z, cached until the term set changes. */
    private static function ordered_terms() {
        $key  = 'acemedia_glossary_order_' . (function_exists('acemedia_glossary_terms_version') ? acemedia_glossary_terms_version() : '0');
        $list = get_transient($key);
        if (is_array($list)) {
            return $list;
        }
        $list = array();
        foreach (get_posts(array('post_type' => 'acemedia_glossary', 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC', 'no_found_rows' => true)) as $p) {
            $list[] = array((int) $p->ID, html_entity_decode($p->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
        usort($list, function ($a, $b) {
            return strnatcasecmp($a[1], $b[1]);
        });
        set_transient($key, $list, DAY_IN_SECONDS);
        return $list;
    }

    /** The A to Z page, opened at a letter. */
    public static function letter_url($letter) {
        $base = self::glossary_url();
        $slug = $letter === '#' ? 'num' : strtolower($letter);
        return add_query_arg('letter', $slug, $base) . '#' . AceMediaGlossary_Shortcode::letterId($letter);
    }

    /**
     * The term page's header: where it sits in the glossary, the term and its definition, its
     * topics and related terms, and the terms either side of it in the A to Z. The definition is
     * rendered without the_content filters, so nothing is injected into it.
     */
    public static function render_header($attributes = array()) {
        if (!is_singular('acemedia_glossary')) {
            return '';
        }
        $post = get_queried_object();
        if (!$post instanceof WP_Post) {
            return '';
        }
        if (class_exists('AceMediaGlossary_Shortcode')) {
            AceMediaGlossary_Shortcode::enqueueAssets();
        }
        $set    = (string) apply_filters('acemedia_glossary_term_set_name', get_post_type_object('acemedia_glossary')->labels->name);
        $title  = html_entity_decode(get_the_title($post), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $letter = AceMediaGlossary_Shortcode::indexLetter($title);
        $kicker = trim((string) ($attributes['kicker'] ?? '')) ?: __('Glossary term', 'acemedia-glossary');
        $def    = AceMediaGlossary_Shortcode::definitionHtml($post->post_content);

        $h  = '<header class="glossary-entry">';
        $h .= '<nav class="glossary-entry__crumbs" aria-label="' . esc_attr__('Breadcrumb', 'acemedia-glossary') . '"><ol>';
        $h .= '<li><a href="' . esc_url(self::glossary_url()) . '">' . esc_html($set) . '</a></li>';
        $h .= '<li><a href="' . esc_url(self::letter_url($letter)) . '">' . esc_html(sprintf(__('Letter %s', 'acemedia-glossary'), $letter)) . '</a></li>';
        $h .= '<li aria-current="page">' . esc_html($title) . '</li></ol></nav>';
        $h .= '<div class="glossary-entry__card">';
        $h .= '<p class="glossary-entry__kicker">' . esc_html($kicker) . '</p>';
        $h .= '<h1 class="glossary-entry__title">' . esc_html($title) . '</h1>';

        $synonyms = get_post_meta($post->ID, 'synonyms', true);
        $synonyms = is_array($synonyms) ? array_values(array_filter(array_map('strval', $synonyms))) : array();
        if ($synonyms) {
            $h .= '<p class="glossary-entry__aka"><span class="glossary-term__label">' . esc_html__('Also known as', 'acemedia-glossary') . '</span> ' . esc_html(implode(', ', $synonyms)) . '</p>';
        }
        $h .= '<div class="glossary-entry__def">' . ($def !== '' ? $def : '<p>' . esc_html__('No definition yet.', 'acemedia-glossary') . '</p>') . '</div>';

        $cats = get_the_terms($post->ID, 'category');
        $cats = is_array($cats) ? array_filter($cats, function ($c) {
            return $c->slug !== 'uncategorized';
        }) : array();
        $related = array();
        $ids     = get_post_meta($post->ID, 'related_terms', true);
        foreach (is_array($ids) ? $ids : array() as $id) {
            $r = get_post((int) $id);
            if ($r instanceof WP_Post && 'acemedia_glossary' === $r->post_type && 'publish' === $r->post_status && $r->ID !== $post->ID) {
                $related[] = $r;
            }
        }
        if ($cats || $related) {
            $h .= '<div class="glossary-entry__facts">';
            if ($cats) {
                $h .= '<div class="glossary-entry__fact"><span class="glossary-term__label">' . esc_html__('Topics', 'acemedia-glossary') . '</span><ul class="glossary-entry__chips">';
                foreach ($cats as $c) {
                    $link = get_term_link($c);
                    $h   .= '<li>' . (is_wp_error($link) ? '<span class="glossary-tag">' . esc_html($c->name) . '</span>' : '<a class="glossary-tag" href="' . esc_url($link) . '">' . esc_html($c->name) . '</a>') . '</li>';
                }
                $h .= '</ul></div>';
            }
            if ($related) {
                $h .= '<div class="glossary-entry__fact"><span class="glossary-term__label">' . esc_html__('Related terms', 'acemedia-glossary') . '</span><ul class="glossary-entry__chips">';
                foreach ($related as $r) {
                    $h .= '<li><a class="glossary-mini" href="' . esc_url(get_permalink($r)) . '">' . esc_html(get_the_title($r)) . '</a></li>';
                }
                $h .= '</ul></div>';
            }
            $h .= '</div>';
        }
        $h .= '</div>';

        // The terms either side in the A to Z.
        $list = self::ordered_terms();
        $pos  = null;
        foreach ($list as $i => $row) {
            if ($row[0] === (int) $post->ID) {
                $pos = $i;
                break;
            }
        }
        if (null !== $pos && count($list) > 1) {
            $prev = $list[($pos - 1 + count($list)) % count($list)];
            $next = $list[($pos + 1) % count($list)];
            $h   .= '<nav class="glossary-entry__pager" aria-label="' . esc_attr__('More terms', 'acemedia-glossary') . '">';
            $h   .= '<a class="glossary-entry__step is-prev" href="' . esc_url(get_permalink($prev[0])) . '" rel="prev"><span class="glossary-term__label">' . esc_html__('Previous term', 'acemedia-glossary') . '</span><span class="glossary-entry__step-title">' . esc_html($prev[1]) . '</span></a>';
            $h   .= '<a class="glossary-entry__step is-index" href="' . esc_url(self::letter_url($letter)) . '"><span class="glossary-term__label">' . esc_html__('Back to', 'acemedia-glossary') . '</span><span class="glossary-entry__step-title">' . esc_html(sprintf(__('All %s terms', 'acemedia-glossary'), $letter)) . '</span></a>';
            $h   .= '<a class="glossary-entry__step is-next" href="' . esc_url(get_permalink($next[0])) . '" rel="next"><span class="glossary-term__label">' . esc_html__('Next term', 'acemedia-glossary') . '</span><span class="glossary-entry__step-title">' . esc_html($next[1]) . '</span></a>';
            $h   .= '</nav>';
        }

        return $h . '</header>';
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
