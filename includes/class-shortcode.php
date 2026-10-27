<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Shortcode {
    /**
     * Most "See also" links rendered per term. A handful of terms relate to
     * hundreds of others; listing them all bloated the page for no reader.
     */
    const SEE_ALSO_LIMIT = 8;

    public function __construct() {
        add_shortcode('glossary', array($this, 'renderShortcode'));
    }

    /**
     * Renders the Glossary Shortcode.
     *
     * Every definition is rendered on the server so crawlers and readers get
     * the same complete HTML. The front-end script only enhances it (search,
     * A to Z rail, related articles) and never replaces it.
     *
     * @param array $atts Shortcode attributes.
     * @return string HTML output for the glossary.
     */
    public function renderShortcode($atts) {
        $global_styles = AceMediaGlossary_Style_Settings::get_styles();

        // Merge default attributes with user-defined ones
        $atts = shortcode_atts(array(
            'sort' => 'alphabetical',
            'textColor' => '',
            'headingBackgroundColor' => '',
            'headingTextColor' => '',
            'cardBackgroundColor' => '',
            'contentGap' => '1.5rem',
            'headingPadding' => '1.25rem',
        ), $atts, 'glossary');

        foreach (array_keys(AceMediaGlossary_Style_Settings::get_default_styles()) as $style_key) {
            if (array_key_exists($style_key, $global_styles)) {
                $atts[$style_key] = $global_styles[$style_key];
            }
        }

        self::enqueueAssets();

        $page_url = self::currentPageUrl();
        $cache_key = 'acemedia_glossary_data_' . md5(wp_json_encode(array(
            $atts,
            $page_url,
            acemedia_glossary_terms_version(),
            ACEMEDIA_GLOSSARY_VERSION,
        )));

        $html = get_transient($cache_key);
        if (!is_string($html) || $html === '') {
            $html = $this->renderGlossary($atts, $page_url);
            set_transient($cache_key, $html, 12 * HOUR_IN_SECONDS);
        }

        return $html;
    }

    /**
     * Registers and enqueues the front-end script and stylesheet. The script
     * has no dependencies: it enhances the server-rendered markup in place.
     */
    public static function enqueueAssets() {
        $asset_file = ACEMEDIA_GLOSSARY_PATH . 'build/glossary-frontend.asset.php';
        $asset = file_exists($asset_file) ? require $asset_file : array('dependencies' => array());

        if (!wp_script_is('acemedia-glossary-frontend', 'registered')) {
            wp_register_script(
                'acemedia-glossary-frontend',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
                isset($asset['dependencies']) ? $asset['dependencies'] : array(),
                AceMediaGlossary::assetVersion('build/glossary-frontend.js'),
                array('in_footer' => true, 'strategy' => 'defer')
            );
        }
        wp_enqueue_script('acemedia-glossary-frontend');

        if (!wp_style_is('acemedia-glossary-frontend', 'enqueued')) {
            wp_enqueue_style(
                'acemedia-glossary-frontend',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.css',
                array(),
                AceMediaGlossary::assetVersion('build/glossary-frontend.css')
            );
            // Lets WordPress print it inline when it fits the inline style
            // budget, saving a render-blocking request on the glossary page.
            wp_style_add_data('acemedia-glossary-frontend', 'path', ACEMEDIA_GLOSSARY_PATH . 'build/glossary-frontend.css');

            $custom_css = get_option('acemedia_glossary_custom_css', '');
            if (!empty($custom_css)) {
                wp_add_inline_style('acemedia-glossary-frontend', $custom_css);
            }
        }
    }

    /**
     * The canonical URL of the page the glossary sits on, used for the
     * schema @id and the per-term anchors.
     */
    private static function currentPageUrl() {
        if (is_post_type_archive('acemedia_glossary')) {
            $url = get_post_type_archive_link('acemedia_glossary');
        } elseif (is_singular()) {
            $url = get_permalink();
        } else {
            $url = home_url(add_query_arg(array()));
        }

        return $url ? strtok($url, '#') : home_url('/');
    }

    private static function currentPageTitle() {
        if (is_post_type_archive('acemedia_glossary')) {
            return post_type_archive_title('', false);
        }
        if (is_singular()) {
            return wp_strip_all_tags(get_the_title());
        }

        return __('Glossary', 'acemedia-glossary');
    }

    /**
     * Translatable strings for the front-end script, passed on the root
     * element so the script needs no i18n dependency.
     */
    private static function scriptStrings() {
        return array(
            /* translators: 1: matching terms, 2: total terms, 3: search text. */
            'count' => __('%1$s of %2$s terms match “%3$s”', 'acemedia-glossary'),
            /* translators: %s: search text. */
            'none' => __('No terms match “%s”', 'acemedia-glossary'),
            'showRelated' => __('Show related articles', 'acemedia-glossary'),
            'hideRelated' => __('Hide related articles', 'acemedia-glossary'),
            'loadingRelated' => __('Loading related articles', 'acemedia-glossary'),
            'noRelated' => __('No related articles yet.', 'acemedia-glossary'),
            'relatedError' => __('Related articles could not be loaded.', 'acemedia-glossary'),
        );
    }

    /**
     * Inline CSS custom properties from the shared style settings.
     */
    private static function styleAttribute($atts) {
        $style_variables = array();
        $colours = array(
            'textColor' => '--glossary-text-color',
            'headingBackgroundColor' => '--glossary-heading-background',
            'headingTextColor' => '--glossary-heading-text-color',
            'cardBackgroundColor' => '--glossary-card-background',
        );

        foreach ($colours as $key => $var) {
            if (!empty($atts[$key])) {
                $color = sanitize_hex_color($atts[$key]);
                if ($color) {
                    $style_variables[$var] = $color;
                }
            }
        }

        // A text colour that is unreadable on the card background (white on a
        // pale card, say) would hide every definition, so fall back to the
        // theme's text colour instead.
        if (isset($style_variables['--glossary-text-color'], $style_variables['--glossary-card-background'])
            && self::contrastRatio($style_variables['--glossary-text-color'], $style_variables['--glossary-card-background']) < 4.5) {
            unset($style_variables['--glossary-text-color']);
        }

        $content_gap = AceMediaGlossary_Style_Settings::sanitize_css_unit($atts['contentGap']);
        if (!empty($content_gap)) {
            $style_variables['--glossary-content-gap'] = $content_gap;
        }

        $heading_padding = AceMediaGlossary_Style_Settings::sanitize_css_unit($atts['headingPadding']);
        if (!empty($heading_padding)) {
            $style_variables['--glossary-heading-padding'] = $heading_padding;
        }

        if (empty($style_variables)) {
            return '';
        }

        $declarations = array();
        foreach ($style_variables as $var => $value) {
            $declarations[] = $var . ':' . $value;
        }

        return ' style="' . esc_attr(implode(';', $declarations)) . '"';
    }

    /**
     * WCAG contrast ratio between two hex colours.
     */
    private static function contrastRatio($hex_a, $hex_b) {
        $luminance = function ($hex) {
            $hex = ltrim($hex, '#');
            if (strlen($hex) === 3) {
                $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
            }
            $channels = array();
            foreach (str_split(substr($hex, 0, 6), 2) as $pair) {
                $c = hexdec($pair) / 255;
                $channels[] = $c <= 0.03928 ? $c / 12.92 : pow(($c + 0.055) / 1.055, 2.4);
            }
            return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];
        };

        $a = $luminance($hex_a);
        $b = $luminance($hex_b);

        return (max($a, $b) + 0.05) / (min($a, $b) + 0.05);
    }

    /**
     * Anchor id for a term, matching the ids the old React front end used so
     * existing #links keep working.
     */
    private static function anchorId($title) {
        $id = strtolower(html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $id = preg_replace('/\s+/', '-', $id);
        return preg_replace('/[^a-z0-9_\-]/', '', $id);
    }

    /**
     * Index letter for a term: A to Z, or # for anything else.
     */
    private static function indexLetter($title) {
        $first = strtoupper(substr(remove_accents(trim(html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'))), 0, 1));
        return ($first !== '' && ctype_alpha($first)) ? $first : '#';
    }

    private static function letterId($letter) {
        return 'glossary-letter-' . ($letter === '#' ? 'num' : strtolower($letter));
    }

    /**
     * Definition HTML, rendered like post content but without the_content
     * filters (ads, related posts and other injections have no place here).
     */
    private static function definitionHtml($content) {
        if ($content === '') {
            return '';
        }

        $html = has_blocks($content) ? do_blocks($content) : wpautop($content);

        return wptexturize($html);
    }

    private static function plainText($content) {
        $text = wp_strip_all_tags(has_blocks($content) ? do_blocks($content) : $content);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Builds the complete glossary markup.
     */
    private function renderGlossary($atts, $page_url) {
        $posts = get_posts(array(
            'post_type' => 'acemedia_glossary',
            'post_status' => 'publish',
            'has_password' => false,
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
            'suppress_filters' => false,
        ));

        // First pass: anchors (unique) and titles, so "See also" links can
        // point at any term without further queries.
        $terms = array();
        $anchors_used = array();
        foreach ($posts as $post) {
            $anchor = self::anchorId($post->post_title);
            if ($anchor === '') {
                $anchor = 'term-' . $post->ID;
            }
            $base = $anchor;
            $n = 2;
            while (isset($anchors_used[$anchor])) {
                $anchor = $base . '-' . $n++;
            }
            $anchors_used[$anchor] = true;

            $terms[$post->ID] = array(
                'post' => $post,
                'title' => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'anchor' => $anchor,
                'priority' => (bool) get_post_meta($post->ID, 'priority', true),
            );
        }

        $sort_updated = $atts['sort'] === 'updated';
        uasort($terms, function ($a, $b) use ($sort_updated) {
            if ($sort_updated) {
                return strcmp($b['post']->post_modified, $a['post']->post_modified);
            }
            return strnatcasecmp($a['title'], $b['title']);
        });

        $groups = array();
        foreach ($terms as $id => $term) {
            $groups[self::indexLetter($term['title'])][] = $id;
        }
        uksort($groups, function ($a, $b) {
            if ($a === '#') {
                return -1;
            }
            if ($b === '#') {
                return 1;
            }
            return strcmp($a, $b);
        });

        $total = count($terms);
        $related_endpoint = rest_url('wp/v2/related-posts');
        $schema_terms = array();
        $schema_limit = (int) apply_filters('acemedia_glossary_schema_term_limit', 50);

        ob_start();
        ?>
<div id="acemedia-glossary-root" class="acemedia-glossary" data-strings="<?php echo esc_attr(wp_json_encode(self::scriptStrings())); ?>"<?php
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- styleAttribute validates each CSS value and escapes the complete attribute.
echo self::styleAttribute($atts); ?>>
<?php if ($total === 0) : ?>
<p class="glossary-empty"><?php esc_html_e('No glossary terms found.', 'acemedia-glossary'); ?></p>
<?php else : ?>
<div class="glossary-search" hidden>
<label class="glossary-label" for="glossary-search-input"><?php esc_html_e('Search the glossary', 'acemedia-glossary'); ?></label>
<div class="glossary-search__field">
<svg class="glossary-search__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" fill="currentColor"/></svg>
<?php /* translators: %s: Number of glossary terms available to search. */ ?>
<input type="search" id="glossary-search-input" class="glossary-search__input" placeholder="<?php echo esc_attr(sprintf(_n('Search %s term', 'Search %s terms', $total, 'acemedia-glossary'), number_format_i18n($total))); ?>" autocomplete="off" spellcheck="false">
</div>
<p class="glossary-search__status" role="status" aria-live="polite"></p>
</div>
<nav class="glossary-az" id="glossary-az" aria-labelledby="glossary-az-label">
<p class="glossary-label" id="glossary-az-label"><?php esc_html_e('Browse A to Z', 'acemedia-glossary'); ?></p>
<ul class="glossary-az__list">
<?php foreach (array_merge(array('#'), range('A', 'Z')) as $letter) :
    if (isset($groups[$letter])) : ?>
<li><a class="glossary-az__link" href="#<?php echo esc_attr(self::letterId($letter)); ?>" data-letter="<?php echo esc_attr($letter); ?>"><?php echo esc_html($letter); ?></a></li>
<?php elseif ($letter !== '#') : ?>
<li aria-hidden="true"><span class="glossary-az__link is-empty"><?php echo esc_html($letter); ?></span></li>
<?php endif;
endforeach; ?>
</ul>
</nav>
<div class="glossary-sections">
<?php foreach ($groups as $letter => $ids) :
    $letter_id = self::letterId($letter);
    $count = count($ids); ?>
<section class="glossary-letter" id="<?php echo esc_attr($letter_id); ?>" data-letter="<?php echo esc_attr($letter); ?>">
<div class="glossary-letter__head">
<h2 class="glossary-letter__title" tabindex="-1"><?php echo esc_html($letter); ?></h2>
<?php /* translators: %s: Number of terms under this letter. */ ?>
<span class="glossary-letter__count"><?php echo esc_html(sprintf(_n('%s term', '%s terms', $count, 'acemedia-glossary'), number_format_i18n($count))); ?></span>
</div>
<div class="glossary-letter__terms">
<?php foreach ($ids as $id) :
        $term = $terms[$id];
        $post = $term['post'];
        $definition = self::definitionHtml($post->post_content);

        if ($term['priority'] && count($schema_terms) < $schema_limit) {
            $schema_terms[] = array(
                '@type' => 'DefinedTerm',
                '@id' => $page_url . '#' . $term['anchor'],
                'name' => $term['title'],
                'description' => self::plainText($post->post_content),
                'url' => $page_url . '#' . $term['anchor'],
            );
        }

        $see_also = array();
        $related_ids = get_post_meta($id, 'related_terms', true);
        if (is_array($related_ids)) {
            foreach ($related_ids as $related_id) {
                $related_id = (int) $related_id;
                if ($related_id !== $id && isset($terms[$related_id])) {
                    $see_also[$related_id] = $terms[$related_id];
                }
                if (count($see_also) >= self::SEE_ALSO_LIMIT) {
                    break;
                }
            }
        }

        $taxonomy_links = array();
        foreach (array('category' => __('Categories', 'acemedia-glossary'), 'post_tag' => __('Tags', 'acemedia-glossary')) as $taxonomy => $label) {
            $taxonomy_terms = get_the_terms($id, $taxonomy);
            if (is_array($taxonomy_terms) && !empty($taxonomy_terms)) {
                $taxonomy_links[$label] = $taxonomy_terms;
            }
        }

        $related_url = '';
        if (get_post_meta($id, 'enable_post_relations', true)) {
            $related_url = add_query_arg(array('term_id' => $id, 'per_page' => 3), $related_endpoint);
        }
        ?>
<article class="glossary-term" id="<?php echo esc_attr($term['anchor']); ?>">
<h3 class="glossary-term__title"><?php echo esc_html($term['title']); ?></h3>
<div class="glossary-term__definition"><?php
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Stored WordPress post content uses core save-time KSES permissions; retain rendered block HTML.
echo $definition !== '' ? $definition : '<p>' . esc_html__('No definition yet.', 'acemedia-glossary') . '</p>'; ?></div>
<?php if (!empty($see_also)) : ?>
<p class="glossary-term__meta"><span class="glossary-term__label"><?php esc_html_e('See also', 'acemedia-glossary'); ?></span> <?php
            echo wp_kses_post(implode(', ', array_map(function ($related) {
                return '<a href="#' . esc_attr($related['anchor']) . '">' . esc_html($related['title']) . '</a>';
            }, $see_also)));
        ?></p>
<?php endif; ?>
<?php foreach ($taxonomy_links as $label => $taxonomy_terms) : ?>
<p class="glossary-term__meta"><span class="glossary-term__label"><?php echo esc_html($label); ?></span> <?php
            echo wp_kses_post(implode(', ', array_map(function ($taxonomy_term) {
                $link = get_term_link($taxonomy_term);
                return is_wp_error($link) ? esc_html($taxonomy_term->name) : '<a href="' . esc_url($link) . '">' . esc_html($taxonomy_term->name) . '</a>';
            }, $taxonomy_terms)));
        ?></p>
<?php endforeach; ?>
<?php if ($related_url) : ?>
<button type="button" class="glossary-term__related-toggle" data-related-url="<?php echo esc_url($related_url); ?>" aria-expanded="false" hidden><?php esc_html_e('Show related articles', 'acemedia-glossary'); ?></button>
<?php endif; ?>
</article>
<?php endforeach; ?>
</div>
</section>
<?php endforeach; ?>
</div>
<p class="glossary-empty" hidden><?php esc_html_e('No terms match your search. Try a shorter or different word.', 'acemedia-glossary'); ?></p>
<?php endif; ?>
</div>
<?php
        $html = ob_get_clean();

        // One DefinedTermSet for the page. Only priority terms are listed, so
        // the structured data stays a sensible size however big the glossary gets.
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'DefinedTermSet',
            '@id' => $page_url . '#glossary',
            'name' => self::currentPageTitle(),
            'url' => $page_url,
        );
        if (!empty($schema_terms)) {
            foreach ($schema_terms as &$schema_term) {
                $schema_term['inDefinedTermSet'] = array('@id' => $page_url . '#glossary');
            }
            unset($schema_term);
            $schema['hasDefinedTerm'] = $schema_terms;
        }

        $html .= '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . '</script>';

        return $html;
    }
}

/**
 * Version stamp for the glossary term set. Bumped whenever a glossary post is
 * saved/trashed/deleted or its taxonomies change, so every cached term list and
 * highlight-output transient invalidates at once. autoload=false (read rarely,
 * only on cache-miss / save).
 */
function acemedia_glossary_terms_version() {
    $version = get_option('acemedia_glossary_terms_version');
    if ($version === false) {
        $version = '1';
        update_option('acemedia_glossary_terms_version', $version, false);
    }
    return $version;
}

function acemedia_glossary_bump_terms_version() {
    update_option('acemedia_glossary_terms_version', wp_generate_uuid4(), false);
}
add_action('save_post_acemedia_glossary', 'acemedia_glossary_bump_terms_version');
add_action('trashed_post', function ($post_id) {
    if (get_post_type($post_id) === 'acemedia_glossary') {
        acemedia_glossary_bump_terms_version();
    }
});
add_action('untrashed_post', function ($post_id) {
    if (get_post_type($post_id) === 'acemedia_glossary') {
        acemedia_glossary_bump_terms_version();
    }
});
add_action('before_delete_post', function ($post_id) {
    if (get_post_type($post_id) === 'acemedia_glossary') {
        acemedia_glossary_bump_terms_version();
    }
});
add_action('set_object_terms', function ($object_id) {
    if (get_post_type($object_id) === 'acemedia_glossary') {
        acemedia_glossary_bump_terms_version();
    }
}, 10, 1);

// Meta the rendered glossary depends on is often written after save_post has
// already fired (and related terms are updated on other posts with no save at
// all), so bump the version when it changes too.
function acemedia_glossary_bump_on_meta_change($meta_id, $object_id, $meta_key) {
    if (in_array($meta_key, array('priority', 'related_terms', 'enable_post_relations', 'auto_highlight', 'synonyms'), true)
        && get_post_type($object_id) === 'acemedia_glossary') {
        acemedia_glossary_bump_terms_version();
    }
}
add_action('added_post_meta', 'acemedia_glossary_bump_on_meta_change', 10, 3);
add_action('updated_post_meta', 'acemedia_glossary_bump_on_meta_change', 10, 3);
add_action('deleted_post_meta', 'acemedia_glossary_bump_on_meta_change', 10, 3);

/**
 * Alternative spellings for a term (e.g. "Hendo's" for Henderson's Relish,
 * "gennel" for ginnel). Stored in the `synonyms` post meta as an array or a
 * newline/comma separated string. Matching any synonym highlights the term.
 */
function acemedia_glossary_term_synonyms($post_id) {
    $raw = get_post_meta($post_id, 'synonyms', true);
    if (is_string($raw)) {
        $raw = preg_split('/[\r\n,]+/', $raw);
    }
    if (!is_array($raw)) {
        return array();
    }
    $synonyms = array();
    foreach ($raw as $synonym) {
        $synonym = trim(wp_strip_all_tags((string) $synonym));
        if ($synonym !== '') {
            $synonyms[] = $synonym;
        }
    }
    return array_values(array_unique($synonyms));
}

/**
 * Post types the auto-highlighter may rewrite. An empty list means every
 * singular view (the pre-1.2 behaviour). Set the
 * `acemedia_glossary_highlight_post_types` option to an array of post type
 * names to scope it, or use the filter of the same name.
 */
function acemedia_glossary_highlight_post_types() {
    $post_types = get_option('acemedia_glossary_highlight_post_types', array());
    if (is_string($post_types)) {
        $post_types = preg_split('/[\s,]+/', $post_types);
    }
    if (!is_array($post_types)) {
        $post_types = array();
    }
    $post_types = array_values(array_filter(array_map('sanitize_key', $post_types)));

    /**
     * Filters the post types eligible for glossary auto-highlighting.
     *
     * @param string[] $post_types Post type names; empty means all singular views.
     */
    $post_types = apply_filters('acemedia_glossary_highlight_post_types', $post_types);

    return is_array($post_types) ? $post_types : array();
}

/**
 * Whether the auto-highlighter should touch the content for the current
 * request. Public so themes and other plugins can share the decision.
 */
function acemedia_glossary_should_highlight($post = null) {
    if (get_option('acemedia_glossary_auto_highlight', 'false') !== 'true') {
        return false;
    }

    // Never rewrite REST, feed, AJAX or excerpt output: those are consumed by
    // machines (schema, API clients, meta descriptions), not by readers.
    if ((defined('REST_REQUEST') && REST_REQUEST) || (function_exists('wp_is_serving_rest_request') && wp_is_serving_rest_request()) || wp_doing_ajax() || wp_doing_cron()) {
        return false;
    }
    if (isset($_SERVER['REQUEST_URI']) && is_string($_SERVER['REQUEST_URI']) && strpos(sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'])), '/wp-json/') !== false) {
        return false;
    }
    if (is_feed() || is_embed() || doing_filter('get_the_excerpt') || doing_filter('wp_trim_excerpt')) {
        return false;
    }

    if (!is_singular() || is_front_page() || is_archive()) {
        return false;
    }

    $post = $post ? get_post($post) : get_post();
    if (!$post instanceof WP_Post) {
        return false;
    }

    $allowed = acemedia_glossary_highlight_post_types();
    if (!empty($allowed) && !in_array($post->post_type, $allowed, true)) {
        return false;
    }

    /**
     * Final say on whether this post gets auto-highlighted.
     *
     * @param bool    $should Default decision.
     * @param WP_Post $post   The post being rendered.
     */
    return (bool) apply_filters('acemedia_glossary_should_highlight', true, $post);
}

/**
 * Plain text with entities decoded and whitespace collapsed. DOMDocument
 * escapes attributes and text itself, so a pre-encoded &#039; or &amp; would
 * otherwise show literally in the tooltip, and a title saved as
 * "Rock &amp; Roll" would never match "Rock & Roll" in a post. Stray bytes
 * that are not UTF-8 (old imports) are scrubbed first, or the /u regexes
 * would fail and the term would vanish.
 */
function acemedia_glossary_plain_text($text) {
    $text = html_entity_decode(wp_strip_all_tags(wp_check_invalid_utf8((string) $text, true)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim((string) preg_replace('/\s+/u', ' ', $text));
}

/**
 * The auto-highlight term set, cached globally (identical for every page render)
 * and busted by the terms-version stamp. Returns each enabled term with its
 * stripped definition and taxonomy ids, pre-sorted longest-title-first so longer
 * phrases win over substrings. Replaces the per-request get_posts(-1) +
 * per-term meta/taxonomy lookups that previously ran on every article view.
 */
function acemedia_glossary_get_highlight_terms() {
    $cache_key = 'acemedia_glossary_hl_terms_' . md5(acemedia_glossary_terms_version() . '|' . ACEMEDIA_GLOSSARY_VERSION);
    $terms = get_transient($cache_key);
    if (is_array($terms)) {
        return $terms;
    }

    $glossary_posts = get_posts([
        'post_type'   => 'acemedia_glossary',
        'numberposts' => -1,
        'post_status' => 'publish',
            'has_password' => false,
    ]);

    $terms = array();
    foreach ($glossary_posts as $glossary_post) {
        if (!(bool) get_post_meta($glossary_post->ID, 'auto_highlight', true)) {
            continue; // Skip terms that don't have auto-highlight enabled
        }
        $terms[] = array(
            'title'      => acemedia_glossary_plain_text($glossary_post->post_title),
            'synonyms'   => array_values(array_filter(array_map('acemedia_glossary_plain_text', acemedia_glossary_term_synonyms($glossary_post->ID)), 'strlen')),
            'definition' => acemedia_glossary_plain_text($glossary_post->post_content),
            'categories' => wp_get_post_categories($glossary_post->ID),
            'tags'       => wp_get_post_tags($glossary_post->ID, array('fields' => 'ids')),
        );
    }

    // Sort by the longest matchable form (title or synonym) descending so
    // longer phrases are claimed before anything nested inside them.
    $longest = function ($term) {
        $max = strlen($term['title']);
        foreach ($term['synonyms'] as $synonym) {
            $max = max($max, strlen($synonym));
        }
        return $max;
    };
    usort($terms, function ($a, $b) use ($longest) {
        return $longest($b) - $longest($a);
    });

    set_transient($cache_key, $terms, 12 * HOUR_IN_SECONDS);
    return $terms;
}

/**
 * Tooltip renderer: 'components' (React + wp-components, the original) or
 * 'light' (a few KB of vanilla CSS/JS, no React).
 */
function acemedia_glossary_tooltip_mode() {
    $mode = get_option('acemedia_glossary_tooltip_mode', 'components');
    /**
     * Filters the tooltip renderer: 'components' (React + wp-components, the
     * original) or 'light' (a few KB of vanilla CSS/JS, no React).
     */
    $mode = apply_filters('acemedia_glossary_tooltip_mode', $mode);
    return $mode === 'light' ? 'light' : 'components';
}

/**
 * One of the plugin's own stylesheets as a string, with comments and spare
 * whitespace stripped, read from disk at most once per request.
 */
function acemedia_glossary_inline_css($relative_path) {
    static $css = array();
    if (!isset($css[$relative_path])) {
        $file = ACEMEDIA_GLOSSARY_PATH . ltrim($relative_path, '/');
        $text = is_readable($file) ? (string) file_get_contents($file) : '';
        $text = preg_replace('#/\*.*?\*/#s', '', $text);
        $text = preg_replace('/\s+/', ' ', $text);
        $css[$relative_path] = trim(preg_replace('/\s*([{};])\s*/', '$1', $text));
    }
    return $css[$relative_path];
}

/**
 * Enqueues the tooltip CSS/JS. Called on both cache miss and cache hit so the
 * assets are present whenever the content has highlights.
 *
 * Block themes render the content before wp_head, so the assets wait for
 * wp_enqueue_scripts and the CSS lands in <head>. Classic themes render it
 * after wp_head, when that hook has already run, so the assets are enqueued
 * straight away and WordPress prints them in the footer instead of never.
 */
function acemedia_glossary_enqueue_tooltip_assets() {
    if (did_action('wp_enqueue_scripts')) {
        acemedia_glossary_load_tooltip_assets();
    } elseif (!has_action('wp_enqueue_scripts', 'acemedia_glossary_load_tooltip_assets')) {
        add_action('wp_enqueue_scripts', 'acemedia_glossary_load_tooltip_assets');
    }
}

function acemedia_glossary_load_tooltip_assets() {
    $light = acemedia_glossary_tooltip_mode() === 'light';
    $css = $light ? 'assets/tooltips-light.css' : 'build/glossary-tooltips.css';
    $js = $light ? 'assets/tooltips-light.js' : 'build/glossary-tooltips.js';

    if (!$light) {
        wp_enqueue_style(
            'wp-components',
            includes_url('/css/dist/components/style.css'),
            [],
            null // No versioning to match WP core
        );
    }

    // The tooltip CSS is a kilobyte or two, so it is printed inline instead of
    // costing a render-blocking request. The handle keeps its name, so a theme
    // that dequeues it or lists it as a dependency carries on working.
    if (!wp_style_is('acemedia-glossary-tooltips', 'registered')) {
        wp_register_style('acemedia-glossary-tooltips', false, array(), null);
        wp_add_inline_style('acemedia-glossary-tooltips', acemedia_glossary_inline_css($css));
    }
    wp_enqueue_style('acemedia-glossary-tooltips');

    // Deferred: nothing needs the tooltips until a term is hovered, focused or
    // tapped. Before WordPress 6.3 the args array is read as a truthy
    // $in_footer, so the script still loads in the footer there.
    wp_enqueue_script(
        'acemedia-glossary-tooltips',
        ACEMEDIA_GLOSSARY_URL . $js,
        $light ? array() : array('wp-element', 'wp-components'),
        AceMediaGlossary::assetVersion($js),
        array('in_footer' => true, 'strategy' => 'defer')
    );
}

/**
 * Elements whose text is never highlighted: headings, links and form
 * controls (a tooltip there fights the click, and inside <summary> or <label>
 * it used to swallow it), code, quoted and captioned material, and elements
 * that cannot hold a <span> at all. Wrap anything else in class="no-glossary"
 * to keep terms out of it.
 *
 * @return string[] Lower-case element names.
 */
function acemedia_glossary_skip_elements() {
    $elements = array(
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'button', 'label', 'summary', 'select', 'option', 'textarea',
        'code', 'pre', 'kbd', 'samp',
        'blockquote', 'figcaption',
        'script', 'style', 'noscript', 'template', 'title', 'svg', 'math', 'iframe', 'object',
    );

    /**
     * Filters the elements whose text the auto-highlighter leaves alone.
     *
     * @param string[] $elements Lower-case element names.
     */
    $elements = apply_filters('acemedia_glossary_skip_elements', $elements);

    return array_values(array_filter(array_map(function ($name) {
        return preg_replace('/[^a-z0-9]/', '', strtolower((string) $name));
    }, (array) $elements)));
}

/**
 * Regex for one term: its title and synonyms, longest first, as whole words.
 * A letter or digit on either side blocks the match in any script, which \b
 * does not do next to é or ß, and a straight or curly apostrophe in a term
 * matches either, since wptexturize has curled the post's quotes by now.
 *
 * @param array $term Term with 'title' and optional 'synonyms'.
 * @return string Pattern, or '' when the term has nothing to match.
 */
function acemedia_glossary_term_pattern($term) {
    $forms = array_merge(array($term['title']), isset($term['synonyms']) ? (array) $term['synonyms'] : array());
    $forms = array_values(array_unique(array_filter(array_map('trim', $forms), 'strlen')));
    if (!$forms) {
        return '';
    }
    usort($forms, function ($a, $b) {
        return strlen($b) - strlen($a);
    });

    $apostrophe = "['\u{2019}]";
    $forms = array_map(function ($form) use ($apostrophe) {
        return strtr(preg_quote($form, '/'), array("'" => $apostrophe, "\u{2019}" => $apostrophe));
    }, $forms);

    return '/(?<![\p{L}\p{N}_])(?:' . implode('|', $forms) . ')(?![\p{L}\p{N}_])/iu';
}

/**
 * Lowercased strpos needles for each term, used to skip terms that cannot match.
 *
 * Forms with non-ASCII bytes (other than the curly apostrophe, folded to a
 * straight one on both sides) get null, so they always run the full regex and
 * keep its Unicode case folding.
 *
 * @param array $glossary_data Terms with 'title' and 'synonyms'.
 * @param array $patterns      Patterns keyed like $glossary_data.
 * @return array Needle lists (or null) keyed like $patterns.
 */
function acemedia_glossary_term_needles($glossary_data, $patterns) {
    $needles = array();
    foreach ($patterns as $i => $pattern) {
        $term = $glossary_data[$i];
        $forms = array_merge(array($term['title']), isset($term['synonyms']) ? (array) $term['synonyms'] : array());
        $forms = array_values(array_unique(array_filter(array_map('trim', $forms), 'strlen')));
        $list = array();
        foreach ($forms as $form) {
            $form = str_replace("\u{2019}", "'", $form);
            if (preg_match('/[\x80-\xff]/', $form)) {
                $list = null;
                break;
            }
            $list[] = strtolower($form);
        }
        $needles[$i] = $list;
    }
    return $needles;
}

/**
 * Wraps the first free occurrence of each term in span.glossary-highlight.
 *
 * Terms arrive longest first, so a longer phrase claims its text before a
 * shorter term nested inside it can. Every occurrence is claimed, not only
 * the highlighted one, so once "Garden Centre" has been used, "Garden" still
 * never lands inside a later "Garden Centre", and a term that first turns up
 * inside a longer one is highlighted where it stands alone instead.
 *
 * @param string $content       Post HTML.
 * @param array  $glossary_data Terms with 'title', 'synonyms' and 'definition'.
 * @return array 'html' (the content, untouched when nothing matched) and 'has'.
 */
function acemedia_glossary_highlight_html($content, $glossary_data) {
    if (!class_exists('DOMDocument') || !class_exists('DOMXPath')) {
        return array('html' => $content, 'has' => false);
    }
    $patterns = array();
    foreach ($glossary_data as $i => $term) {
        $pattern = acemedia_glossary_term_pattern($term);
        if ($pattern !== '') {
            $patterns[$i] = $pattern;
        }
    }
    if (!$patterns || trim($content) === '') {
        return array('html' => $content, 'has' => false);
    }
    $needles = acemedia_glossary_term_needles($glossary_data, $patterns);

    // Parse inside a wrapper div, with an encoding hint so UTF-8 survives.
    $dom = new DOMDocument('1.0', 'UTF-8');
    $previous = libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8" ?><div>' . $content . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    $skip = array_map(function ($name) {
        return 'self::' . $name;
    }, acemedia_glossary_skip_elements());
    $skip[] = 'contains(concat(" ", normalize-space(@class), " "), " glossary-highlight ")';
    $skip[] = 'contains(concat(" ", normalize-space(@class), " "), " no-glossary ")';

    $xpath = new DOMXPath($dom);
    $text_nodes = $xpath->query('//text()[not(ancestor::*[' . implode(' or ', $skip) . '])]');
    if (!$text_nodes) {
        return array('html' => $content, 'has' => false);
    }

    // Only the first occurrence of each term is highlighted, across the post.
    $used = array();
    $has = false;

    foreach ($text_nodes as $text_node) {
        $text = $text_node->nodeValue;
        if (trim($text) === '') {
            continue;
        }

        $claimed = array();
        $found = array();
        // A cheap strpos on the lowercased node skips the regex for absent terms.
        $haystack = strtolower(str_replace("\u{2019}", "'", $text));
        foreach ($patterns as $i => $pattern) {
            if ($needles[$i] !== null) {
                $hit = false;
                foreach ($needles[$i] as $needle) {
                    if (strpos($haystack, $needle) !== false) {
                        $hit = true;
                        break;
                    }
                }
                if (!$hit) {
                    continue;
                }
            }
            if (!preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            $title = $glossary_data[$i]['title'];
            foreach ($matches[0] as $match) {
                $offset = $match[1];
                $end = $offset + strlen($match[0]);
                foreach ($claimed as $range) {
                    if ($offset < $range[1] && $range[0] < $end) {
                        continue 2;
                    }
                }
                $claimed[] = array($offset, $end);

                if (!isset($used[$title])) {
                    $used[$title] = true;
                    $found[] = array(
                        'term'         => $title,
                        'definition'   => $glossary_data[$i]['definition'],
                        'offset'       => $offset,
                        'length'       => $end - $offset,
                        'matched_text' => $match[0],
                    );
                }
            }
        }

        if (empty($found)) {
            continue;
        }

        // Rebuild the node left to right so the offsets stay meaningful.
        usort($found, function ($a, $b) {
            return $a['offset'] - $b['offset'];
        });

        $parent = $text_node->parentNode;
        $cursor = 0;

        foreach ($found as $match) {
            $before = substr($text, $cursor, $match['offset'] - $cursor);
            if ($before !== '') {
                $parent->insertBefore($dom->createTextNode($before), $text_node);
            }

            $span = $dom->createElement('span');
            $span->setAttribute('class', 'glossary-highlight');
            $span->setAttribute('data-term', $match['term']);
            $span->setAttribute('data-tooltip', $match['definition']);
            $span->appendChild($dom->createTextNode($match['matched_text']));
            $parent->insertBefore($span, $text_node);

            $cursor = $match['offset'] + $match['length'];
            $has = true;
        }

        $after = substr($text, $cursor);
        if ($after !== '') {
            $parent->insertBefore($dom->createTextNode($after), $text_node);
        }

        $parent->removeChild($text_node);
    }

    if (!$has) {
        return array('html' => $content, 'has' => false);
    }

    // Extract the content from the wrapper div.
    $html = '';
    $wrapper = $dom->getElementsByTagName('div')->item(0);
    if ($wrapper) {
        foreach ($wrapper->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }
    }

    return array('html' => $html, 'has' => true);
}

function highlight_glossary_terms($content) {
    global $post;

    // Skips disabled, REST/feed/excerpt, non-singular and out-of-scope post types.
    if (!acemedia_glossary_should_highlight($post)) {
        return $content;
    }
    $current_post_categories = wp_get_post_categories($post->ID);
    $current_post_tags = wp_get_post_tags($post->ID, array('fields' => 'ids'));

    // A term's own page does not explain the term to itself.
    $self_title = $post->post_type === 'acemedia_glossary' ? acemedia_glossary_plain_text($post->post_title) : '';

    // Output cache: the rewritten content depends only on the exact input
    // content, the term-set version, the plugin version (the matching rules),
    // the skipped elements, this post's taxonomy (which decides applicable
    // terms) and, on a term's own page, that term. A hit skips the term scan
    // AND the DOMDocument rewrite.
    $output_cache_key = 'acemedia_glossary_hl_' . md5(
        acemedia_glossary_terms_version() . '|' . ACEMEDIA_GLOSSARY_VERSION . '|' .
        implode(',', acemedia_glossary_skip_elements()) . '|' . md5($content) . '|' .
        implode(',', $current_post_categories) . '|' .
        implode(',', $current_post_tags) . '|' . $self_title
    );
    $cached = get_transient($output_cache_key);
    if (is_array($cached) && array_key_exists('html', $cached)) {
        if (!empty($cached['has'])) {
            acemedia_glossary_enqueue_tooltip_assets();
        }
        return $cached['html'];
    }

    // Build the applicable term list from the globally-cached term set, keeping
    // only terms that share a category/tag with the current post (or that have
    // none, meaning apply everywhere). Already sorted longest-first.
    $glossary_data = array();
    foreach (acemedia_glossary_get_highlight_terms() as $term) {
        if ($self_title !== '' && strcasecmp($term['title'], $self_title) === 0) {
            continue;
        }
        $has_shared_category = !empty(array_intersect($current_post_categories, $term['categories']));
        $has_shared_tag = !empty(array_intersect($current_post_tags, $term['tags']));

        if ($has_shared_category || $has_shared_tag || (empty($term['categories']) && empty($term['tags']))) {
            $glossary_data[] = array(
                'title'      => $term['title'],
                'synonyms'   => isset($term['synonyms']) ? $term['synonyms'] : array(),
                'definition' => $term['definition'],
            );
        }
    }

    $result = empty($glossary_data)
        ? array('html' => $content, 'has' => false)
        : acemedia_glossary_highlight_html($content, $glossary_data);

    if ($result['has']) {
        acemedia_glossary_enqueue_tooltip_assets();
    }

    set_transient($output_cache_key, $result, 12 * HOUR_IN_SECONDS);

    return $result['html'];
}

// Hook into the_content filter
add_filter('the_content', 'highlight_glossary_terms');


function acemedia_register_glossary_block() {
    wp_register_script(
        'acemedia-glossary-block',
        ACEMEDIA_GLOSSARY_URL . 'build/glossary-block.js',
        array('wp-blocks', 'wp-editor', 'wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
        AceMediaGlossary::assetVersion('build/glossary-block.js'),
        true
    );

    wp_register_style(
        'acemedia-glossary-block-editor',
        ACEMEDIA_GLOSSARY_URL . 'build/glossary-block-editor.css',
        array('wp-edit-blocks'),
        AceMediaGlossary::assetVersion('build/glossary-block-editor.css')
    );

    $styles = AceMediaGlossary_Style_Settings::get_styles();
    $palette = AceMediaGlossary_Style_Settings::get_color_palette();

    wp_localize_script(
        'acemedia-glossary-block',
        'AceMediaGlossaryBlockConfig',
        array(
            'styles' => $styles,
            'colorPalette' => $palette,
            'nonce' => wp_create_nonce('wp_rest'),
            'stylesPath' => '/wp/v2/options/glossary_styles',
            'canManageOptions' => current_user_can('manage_options'),
            'restRoot' => esc_url_raw(get_rest_url(null, '/')),
        )
    );

    register_block_type('acemedia/glossary', array(
        'api_version' => 3,
        'editor_script'   => 'acemedia-glossary-block',
        'editor_style'    => 'acemedia-glossary-block-editor',
        'style'           => 'acemedia-glossary-block-frontend',
        'render_callback' => 'acemedia_render_glossary_block',
        'attributes'      => array(
            'sort' => array(
                'type' => 'string',
                'default' => 'alphabetical',
            ),
            'textColor' => array(
                'type' => 'string',
                'default' => '',
            ),
            'headingBackgroundColor' => array(
                'type' => 'string',
                'default' => '',
            ),
            'headingTextColor' => array(
                'type' => 'string',
                'default' => '',
            ),
            'cardBackgroundColor' => array(
                'type' => 'string',
                'default' => '',
            ),
            'contentGap' => array(
                'type' => 'string',
                'default' => '1.5rem',
            ),
            'headingPadding' => array(
                'type' => 'string',
                'default' => '1.25rem',
            ),
        ),
    ));
}
add_action('init', 'acemedia_register_glossary_block');


function acemedia_render_glossary_block($attributes) {
    $shortcode_instance = new AceMediaGlossary_Shortcode();
    return $shortcode_instance->renderShortcode($attributes);
}
