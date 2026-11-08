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
        add_filter('wpseo_breadcrumb_links', array(__CLASS__, 'breadcrumbs'));
        add_filter('ace_seo_breadcrumb_items', array(__CLASS__, 'ace_seo_breadcrumbs'));
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
        register_block_type('acemedia/glossary-term-articles-title', array(
            'api_version'     => 3,
            'render_callback' => array(__CLASS__, 'render_articles_title'),
            'supports'        => array('html' => false),
            'attributes'      => array(
                'label' => array('type' => 'string', 'default' => ''),
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

    /** The first sentence of a plain-text definition, or '' when it cannot be told apart. */
    public static function first_sentence($text) {
        $text = trim((string) $text);
        if ($text === '') {
            return '';
        }
        if (preg_match('/^(.+?[.!?])(?=\s+[A-Z0-9"“‘(])/u', $text, $m)) {
            return trim($m[1]);
        }
        return $text;
    }

    /** A title's base name (before any trailing qualifier) and the qualifier itself. */
    public static function split_title($title) {
        $title = trim((string) $title);
        if (preg_match('/^(.*?)\s*\(([^)]+)\)\s*$/u', $title, $m) && trim($m[1]) !== '') {
            return array(trim($m[1]), trim($m[2]));
        }
        return array($title, '');
    }

    /** Other terms with the same base name: "Break (Snooker)" for "Break (Tennis)". */
    public static function namesakes(WP_Post $post) {
        list($base) = self::split_title(html_entity_decode(get_the_title($post), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $key = function_exists('mb_strtolower') ? mb_strtolower($base) : strtolower($base);
        $out = array();
        foreach (self::ordered_terms() as $row) {
            if ((int) $row[0] === (int) $post->ID) {
                continue;
            }
            list($b, $q) = self::split_title($row[1]);
            if ((function_exists('mb_strtolower') ? mb_strtolower($b) : strtolower($b)) === $key) {
                $out[] = array('id' => (int) $row[0], 'title' => $row[1], 'qualifier' => $q);
            }
        }
        return apply_filters('acemedia_glossary_namesakes', $out, $post);
    }

    /** "In snooker" for a qualifier, keeping acronyms such as F1 or MMA as written. */
    private static function in_phrase($qualifier) {
        $words = array_map(function ($w) {
            return preg_match('/^[A-Z0-9]{2,}$/', $w) ? $w : (function_exists('mb_strtolower') ? mb_strtolower($w) : strtolower($w));
        }, preg_split('/\s+/', $qualifier));
        return implode(' ', $words);
    }

    /** A one-line summary of a term for cards: its first sentence, kept short. */
    public static function one_line($post) {
        $plain = self::plain($post->post_content);
        $line  = self::first_sentence($plain);
        if (function_exists('mb_strlen') && mb_strlen($line) > 140) {
            $line = rtrim(mb_substr($line, 0, 137), " ,;:") . '…';
        }
        return $line;
    }

    /**
     * The term page's header: where it sits in the glossary, the term with its definition led by
     * its first sentence and the rest under "In plain English", its topics, then panels (related
     * terms as cards, and anything a site adds through the acemedia_glossary_term_panels filter),
     * and the terms either side of it in the A to Z. The definition is rendered without
     * the_content filters, so nothing is injected into it.
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
        // No label above the term by default: the breadcrumb already says where it sits.
        $kicker = trim((string) ($attributes['kicker'] ?? ''));
        $def    = AceMediaGlossary_Shortcode::definitionHtml($post->post_content);

        // Lead with the first sentence; the rest reads as "In plain English". Only split when the
        // first sentence can be lifted cleanly out of the HTML, so nothing is lost or repeated.
        $plain = self::plain($post->post_content);
        $lead  = self::first_sentence($plain);
        $rest  = '';
        if ($def !== '' && $lead !== '' && mb_strlen($plain) - mb_strlen($lead) >= 40) {
            $needle = esc_html($lead);
            $pos    = strpos($def, wptexturize($needle));
            $len    = strlen(wptexturize($needle));
            if (false === $pos) {
                $pos = strpos($def, $needle);
                $len = strlen($needle);
            }
            if (false !== $pos) {
                $rest = substr($def, 0, $pos) . substr($def, $pos + $len);
                $rest = preg_replace('#<p>\s*</p>#', '', $rest);
                if (trim(wp_strip_all_tags($rest)) === '') {
                    $rest = '';
                }
            }
        }

        $h  = '<div class="glossary-entry">';
        $h .= '<nav class="glossary-entry__crumbs" aria-label="' . esc_attr__('Breadcrumb', 'acemedia-glossary') . '"><ol>';
        $h .= '<li><a href="' . esc_url(self::glossary_url()) . '">' . esc_html($set) . '</a></li>';
        $h .= '<li><a href="' . esc_url(self::letter_url($letter)) . '">' . esc_html(sprintf(__('Letter %s', 'acemedia-glossary'), $letter)) . '</a></li>';
        $h .= '<li aria-current="page">' . esc_html($title) . '</li></ol></nav>';
        $h .= '<header class="glossary-entry__card">';
        if ($kicker !== '') {
            $h .= '<p class="glossary-entry__kicker">' . esc_html($kicker) . '</p>';
        }
        $h .= '<h1 class="glossary-entry__title">' . esc_html($title) . '</h1>';

        $synonyms = get_post_meta($post->ID, 'synonyms', true);
        $synonyms = is_array($synonyms) ? array_values(array_filter(array_map('strval', $synonyms))) : array();
        if ($synonyms) {
            $h .= '<p class="glossary-entry__aka"><span class="glossary-term__label">' . esc_html__('Also known as', 'acemedia-glossary') . '</span> ' . esc_html(implode(', ', $synonyms)) . '</p>';
        }
        $same = self::namesakes($post);
        if ($same) {
            $h .= '<ul class="glossary-entry__namesakes">';
            foreach ($same as $n) {
                $label = $n['qualifier'] !== ''
                    /* translators: %s: a sport or field, such as "snooker". */
                    ? sprintf(__('Also a term in %s:', 'acemedia-glossary'), self::in_phrase($n['qualifier']))
                    : __('Also a general term:', 'acemedia-glossary');
                $h .= '<li><span>' . esc_html($label) . '</span> <a href="' . esc_url(get_permalink($n['id'])) . '">' . esc_html($n['title']) . '</a></li>';
            }
            $h .= '</ul>';
        }
        if ($rest !== '') {
            $h .= '<p class="glossary-entry__lead">' . esc_html($lead) . '</p>';
            $h .= '<section class="glossary-entry__more" aria-labelledby="glossary-entry-more"><h2 class="glossary-entry__h2" id="glossary-entry-more">' . esc_html__('In plain English', 'acemedia-glossary') . '</h2><div class="glossary-entry__def">' . $rest . '</div></section>';
        } else {
            $h .= '<div class="glossary-entry__def is-lead">' . ($def !== '' ? $def : '<p>' . esc_html__('No definition yet.', 'acemedia-glossary') . '</p>') . '</div>';
        }

        $cats = get_the_terms($post->ID, 'category');
        $cats = is_array($cats) ? array_filter($cats, function ($c) {
            return $c->slug !== 'uncategorized';
        }) : array();
        if ($cats) {
            $h .= '<div class="glossary-entry__facts"><div class="glossary-entry__fact"><span class="glossary-term__label">' . esc_html__('Topics', 'acemedia-glossary') . '</span><ul class="glossary-entry__chips">';
            foreach ($cats as $c) {
                $link = get_term_link($c);
                $h   .= '<li>' . (is_wp_error($link) ? '<span class="glossary-tag">' . esc_html($c->name) . '</span>' : '<a class="glossary-tag" href="' . esc_url($link) . '">' . esc_html($c->name) . '</a>') . '</li>';
            }
            $h .= '</ul></div></div>';
        }
        $h .= '</header>';

        // Panels: related terms as cards, plus whatever the site adds.
        $panels  = array();
        $related = array();
        $ids     = get_post_meta($post->ID, 'related_terms', true);
        foreach (is_array($ids) ? $ids : array() as $id) {
            $r = get_post((int) $id);
            if ($r instanceof WP_Post && 'acemedia_glossary' === $r->post_type && 'publish' === $r->post_status && $r->ID !== $post->ID) {
                $related[] = $r;
            }
            if (count($related) >= 8) {
                break;
            }
        }
        if ($related) {
            $cards = '';
            foreach ($related as $r) {
                $cards .= '<li><a class="glossary-relcard" href="' . esc_url(get_permalink($r)) . '"><span class="glossary-relcard__title">' . esc_html(get_the_title($r)) . '</span><span class="glossary-relcard__line">' . esc_html(self::one_line($r)) . '</span></a></li>';
            }
            $panels[] = array(
                'id'    => 'related',
                'title' => __('Related terms', 'acemedia-glossary'),
                'html'  => '<ul class="glossary-relcards">' . $cards . '</ul>',
                'wide'  => true,
                'order' => 50,
            );
        }
        /**
         * Panels on a term page. Each is array( id, title, html, wide (bool), order (int) ); the
         * html is the site's own and is printed as given.
         */
        $panels = apply_filters('acemedia_glossary_term_panels', $panels, $post);
        if (is_array($panels) && $panels) {
            usort($panels, function ($a, $b) {
                return ((int) ($a['order'] ?? 10)) <=> ((int) ($b['order'] ?? 10));
            });
            $h .= '<div class="glossary-entry__panels">';
            foreach ($panels as $panel) {
                if (empty($panel['html'])) {
                    continue;
                }
                $pid = 'glossary-panel-' . sanitize_html_class((string) ($panel['id'] ?? 'panel'));
                $h  .= '<section class="glossary-panel' . (!empty($panel['wide']) ? ' is-wide' : '') . '" aria-labelledby="' . esc_attr($pid) . '">';
                $h  .= '<h2 class="glossary-panel__title" id="' . esc_attr($pid) . '">' . esc_html((string) ($panel['title'] ?? '')) . '</h2>';
                // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Panel HTML comes from code hooked to the filter, not from users.
                $h  .= $panel['html'];
                $h  .= '</section>';
            }
            $h .= '</div>';
        }

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

        return $h . '</div>';
    }

    /**
     * "Seen in our articles", with how many when the count is exact. Uses the same lookup as the
     * term page's article grid, cached until the term set changes.
     */
    public static function render_articles_title($attributes = array()) {
        if (!is_singular('acemedia_glossary') || !class_exists('AceMediaGlossary_Related_Posts')) {
            return '';
        }
        $post  = get_queried_object();
        $label = trim((string) ($attributes['label'] ?? '')) ?: __('Seen in our articles', 'acemedia-glossary');
        $count = 0;
        if ($post instanceof WP_Post) {
            $key   = 'acemedia_glossary_seen_' . $post->ID . '_' . (function_exists('acemedia_glossary_terms_version') ? acemedia_glossary_terms_version() : '0') . '_' . (defined('ACEMEDIA_GLOSSARY_VERSION') ? ACEMEDIA_GLOSSARY_VERSION : '');
            $count = get_transient($key);
            if (false === $count) {
                $res   = AceMediaGlossary_Related_Posts::fetch(array(
                    'term_id'      => $post->ID,
                    'category_ids' => wp_get_post_terms($post->ID, 'category', array('fields' => 'ids')),
                    'tag_ids'      => wp_get_post_terms($post->ID, 'post_tag', array('fields' => 'ids')),
                    'per_page'     => -1,
                ));
                // The primary search reads up to 25 matches; a fallback by topic is not a count of uses.
                $count = empty($res['used_fallback']) ? (int) ($res['found_posts'] ?? 0) : -1;
                set_transient($key, $count, 6 * HOUR_IN_SECONDS);
            }
        }
        if (-1 === (int) $count) {
            $label = __('More from the same topics', 'acemedia-glossary');
        }
        $n = '';
        if ((int) $count >= 25) {
            $n = '<span class="glossary-articles-title__n">' . esc_html__('25+ articles', 'acemedia-glossary') . '</span>';
        } elseif ((int) $count > 0) {
            $n = '<span class="glossary-articles-title__n">' . esc_html(sprintf(_n('%s article', '%s articles', (int) $count, 'acemedia-glossary'), number_format_i18n((int) $count))) . '</span>';
        }
        return '<h2 class="glossary-articles-title">' . esc_html($label) . $n . '</h2>';
    }

    /** Ace SEO breadcrumbs (and their BreadcrumbList): Home, the glossary, then the term. */
    public static function ace_seo_breadcrumbs($items) {
        if (!is_singular('acemedia_glossary') || !is_array($items) || count($items) < 2) {
            return $items;
        }
        $url = self::glossary_url();
        foreach ($items as $item) {
            if (!empty($item['url']) && untrailingslashit((string) $item['url']) === untrailingslashit($url)) {
                return $items;
            }
        }
        $set = (string) apply_filters('acemedia_glossary_term_set_name', get_post_type_object('acemedia_glossary')->labels->name);
        array_splice($items, count($items) - 1, 0, array(array('label' => $set, 'url' => $url, 'is_current' => false)));
        return $items;
    }

    /** Yoast breadcrumbs (and their schema): Home, the glossary, then the term. */
    public static function breadcrumbs($links) {
        if (!is_singular('acemedia_glossary') || !is_array($links) || count($links) < 2) {
            return $links;
        }
        $url = self::glossary_url();
        foreach ($links as $l) {
            if (!empty($l['url']) && untrailingslashit($l['url']) === untrailingslashit($url)) {
                return $links;
            }
        }
        $set = (string) apply_filters('acemedia_glossary_term_set_name', get_post_type_object('acemedia_glossary')->labels->name);
        array_splice($links, count($links) - 1, 0, array(array('url' => $url, 'text' => $set)));
        return $links;
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
