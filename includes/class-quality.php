<?php
/**
 * A quality bar for term pages. A term is "thin" when its definition is short and its page has
 * nothing else to offer: no panels from the acemedia_glossary_term_panels filter and no articles
 * that use the term. Thin terms keep working for readers and stay in the A to Z, but their own page
 * says noindex, follow, drops its canonical, and is left out of the glossary sitemap. They come back
 * on their own as soon as the definition is expanded or the page gains something more.
 *
 * Honoured by core (wp_robots, core sitemaps), Ace SEO (ace_seo_force_noindex, ace_seo_canonical)
 * and Yoast (wpseo_robots_array, wpseo_canonical, wpseo_exclude_from_sitemap_by_post_ids). The A to Z
 * page itself is never touched.
 *
 * Filters: acemedia_glossary_thin_chars (default 160), acemedia_glossary_term_enriched,
 * acemedia_glossary_term_is_thin, acemedia_glossary_quality_enabled.
 */

if (!defined('ABSPATH')) {
    exit;
}

final class AceMedia_Glossary_Quality {

    const CACHE = 'acemedia_glossary_thin_';

    /** True while the index is being built, so integrations can skip side effects (enqueues). */
    public static $probing = false;

    private static $ids = null;

    public static function init() {
        add_filter('wp_robots', array(__CLASS__, 'wp_robots'), 20);
        add_filter('wpseo_robots_array', array(__CLASS__, 'yoast_robots'));
        add_filter('wpseo_canonical', array(__CLASS__, 'drop_canonical'));
        add_action('template_redirect', array(__CLASS__, 'drop_core_canonical'));
        add_filter('wp_sitemaps_posts_query_args', array(__CLASS__, 'sitemap_args'), 20, 2);
        add_filter('wpseo_exclude_from_sitemap_by_post_ids', array(__CLASS__, 'yoast_sitemap_exclude'));
        // Ace Crawl Enhancer: its 1.0.98 acecrawl_ hook names, or the ace_seo_ ones of earlier versions.
        add_action('plugins_loaded', array(__CLASS__, 'crawl_hooks'));
        add_action('save_post_acemedia_glossary', array(__CLASS__, 'flush'));
        add_action('deleted_post', array(__CLASS__, 'flush'));
        // Admin: a column in the list, a view of thin terms, and a line on the settings page.
        add_filter('manage_acemedia_glossary_posts_columns', array(__CLASS__, 'column'));
        add_action('manage_acemedia_glossary_posts_custom_column', array(__CLASS__, 'column_value'), 10, 2);
        add_filter('views_edit-acemedia_glossary', array(__CLASS__, 'views'));
        add_action('pre_get_posts', array(__CLASS__, 'thin_view_query'));
        add_action('acemedia_glossary_settings_before', array(__CLASS__, 'settings_line'));
    }

    public static function enabled() {
        return (bool) apply_filters('acemedia_glossary_quality_enabled', true);
    }

    public static function threshold() {
        return max(0, (int) apply_filters('acemedia_glossary_thin_chars', 160));
    }

    private static function plain($post) {
        $text = wp_strip_all_tags(has_blocks($post->post_content) ? do_blocks($post->post_content) : $post->post_content);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /** Whether the definition is short enough to need something else on the page. */
    public static function is_short(WP_Post $post) {
        $text = self::plain($post);
        return (function_exists('mb_strlen') ? mb_strlen($text) : strlen($text)) < self::threshold();
    }

    /** Whether the page offers more than the definition: site panels or articles that use the term. */
    public static function is_enriched(WP_Post $post) {
        $enriched = false;
        $panels   = apply_filters('acemedia_glossary_term_panels', array(), $post);
        foreach (is_array($panels) ? $panels : array() as $panel) {
            if (!empty($panel['html'])) {
                $enriched = true;
                break;
            }
        }
        if (!$enriched && class_exists('AceMediaGlossary_Related_Posts')) {
            $res = AceMediaGlossary_Related_Posts::fetch(array('term_id' => $post->ID, 'per_page' => 1));
            // A fallback by topic is not a use of the term.
            $enriched = empty($res['used_fallback']) && !empty($res['posts']);
        }
        return (bool) apply_filters('acemedia_glossary_term_enriched', $enriched, $post);
    }

    private static function key() {
        $version = function_exists('acemedia_glossary_terms_version') ? acemedia_glossary_terms_version() : '0';
        return self::CACHE . md5($version . '|' . (defined('ACEMEDIA_GLOSSARY_VERSION') ? ACEMEDIA_GLOSSARY_VERSION : '') . '|' . self::threshold());
    }

    /** IDs of the thin terms, worked out for the whole glossary and cached for twelve hours. */
    public static function thin_ids() {
        if (!self::enabled()) {
            return array();
        }
        if (is_array(self::$ids)) {
            return self::$ids;
        }
        $cached = get_transient(self::key());
        if (is_array($cached)) {
            return self::$ids = array_map('intval', $cached);
        }
        self::$probing = true;
        $ids = array();
        foreach (get_posts(array('post_type' => 'acemedia_glossary', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true)) as $post) {
            // Short first: most terms never need the more expensive check.
            if (!self::is_short($post)) {
                continue;
            }
            $thin = !self::is_enriched($post);
            if (apply_filters('acemedia_glossary_term_is_thin', $thin, $post)) {
                $ids[] = (int) $post->ID;
            }
        }
        self::$probing = false;
        set_transient(self::key(), $ids, 12 * HOUR_IN_SECONDS);
        self::$ids = $ids;
        self::note_change();
        return $ids;
    }

    public static function is_thin($post_id) {
        return in_array((int) $post_id, self::thin_ids(), true);
    }

    /** A short fingerprint of the thin set, for caches that depend on it. */
    public static function hash() {
        return substr(md5(implode(',', self::thin_ids())), 0, 8);
    }

    /**
     * When the thin set differs from last time, tell sitemap caches: Ace SEO's sitemap tools keep
     * rendered sitemaps under a version number, and other caches can listen for the action.
     */
    private static function note_change() {
        $hash = self::hash();
        if (get_option('acemedia_glossary_thin_hash') === $hash) {
            return;
        }
        update_option('acemedia_glossary_thin_hash', $hash, false);
        $p = self::crawl_prefix();
        if (function_exists($p['sitemap'] . 'bump_cache_version')) {
            call_user_func($p['sitemap'] . 'bump_cache_version');
        }
        // Ace SEO keeps generated sitemap files per scope: mark the glossary's for a rebuild.
        if (function_exists($p['gen'] . 'mark_dirty')) {
            $scopes = function_exists($p['gen'] . 'scopes_for') ? (array) call_user_func($p['gen'] . 'scopes_for', 'posts', 'glossary') : array('all');
            foreach ($scopes ?: array('all') as $scope) {
                call_user_func($p['gen'] . 'mark_dirty', $scope, true);
            }
        }
        do_action('acemedia_glossary_thin_changed', self::$ids);
    }

    /** Ace Crawl Enhancer 1.0.98 renamed its hooks and functions to acecrawl_; earlier versions used ace_seo_. */
    public static function crawl_prefix() {
        return defined('ACECRAWL_PATH')
            ? array('seo' => 'acecrawl_', 'sitemap' => 'acecrawl_sitemap_', 'gen' => 'acecrawl_sitemap_gen_', 'excluded' => 'acecrawl_sitemap_excluded_post_ids')
            : array('seo' => 'ace_seo_', 'sitemap' => 'ace_sitemap_powertools_', 'gen' => 'ace_sitemap_gen_', 'excluded' => 'ace_sitemap_powertools_excluded_post_ids');
    }

    /** One set of names only: Crawl's compatibility layer would otherwise run these callbacks twice. */
    public static function crawl_hooks() {
        $p = self::crawl_prefix();
        add_filter($p['seo'] . 'force_noindex', array(__CLASS__, 'force_noindex'));
        add_filter($p['seo'] . 'canonical', array(__CLASS__, 'drop_canonical'));
        add_filter($p['excluded'], array(__CLASS__, 'ace_sitemap_exclude'), 10, 2);
    }

    public static function flush() {
        self::$ids = null;
        delete_transient(self::key());
    }

    private static function current_is_thin() {
        if (!is_singular('acemedia_glossary')) {
            return false;
        }
        $id = get_queried_object_id();
        return $id && self::is_thin($id);
    }

    /* ---- robots and canonicals ---- */

    public static function wp_robots($robots) {
        if (self::current_is_thin()) {
            unset($robots['index']);
            $robots['noindex'] = true;
            $robots['follow']  = true;
        }
        return $robots;
    }

    public static function force_noindex($force) {
        return $force || self::current_is_thin();
    }

    public static function yoast_robots($robots) {
        if (self::current_is_thin() && is_array($robots)) {
            $robots['index']  = 'noindex';
            $robots['follow'] = 'follow';
        }
        return $robots;
    }

    /** A page that asks not to be indexed should not also name a canonical. */
    public static function drop_canonical($canonical) {
        return self::current_is_thin() ? false : $canonical;
    }

    public static function drop_core_canonical() {
        if (self::current_is_thin()) {
            remove_action('wp_head', 'rel_canonical');
        }
    }

    /* ---- sitemaps ---- */

    public static function sitemap_args($args, $post_type) {
        if (in_array($post_type, array('glossary', 'acemedia_glossary'), true)) {
            $thin = self::thin_ids();
            if ($thin) {
                $args['post__not_in'] = array_values(array_unique(array_merge((array) ($args['post__not_in'] ?? array()), $thin)));
            }
        }
        return $args;
    }

    /** Ace SEO's sitemap tools build their own page map; they take exclusions by post ID. */
    public static function ace_sitemap_exclude($ids, $post_type = '') {
        if (!in_array($post_type, array('glossary', 'acemedia_glossary'), true)) {
            return $ids;
        }
        return array_values(array_unique(array_merge(array_map('intval', (array) $ids), self::thin_ids())));
    }

    public static function yoast_sitemap_exclude($ids) {
        return array_values(array_unique(array_merge(array_map('intval', (array) $ids), self::thin_ids())));
    }

    /* ---- admin ---- */

    public static function column($columns) {
        $columns['acemedia_glossary_index'] = __('Search', 'acemedia-glossary');
        return $columns;
    }

    public static function column_value($column, $post_id) {
        if ('acemedia_glossary_index' !== $column) {
            return;
        }
        if ('publish' !== get_post_status($post_id)) {
            echo '&mdash;';
        } elseif (self::is_thin($post_id)) {
            echo '<strong>' . esc_html__('Thin: not indexed', 'acemedia-glossary') . '</strong>';
        } else {
            esc_html_e('Indexed', 'acemedia-glossary');
        }
    }

    public static function views($views) {
        $count = count(self::thin_ids());
        $url   = add_query_arg(array('post_type' => 'acemedia_glossary', 'glossary_thin' => 1), admin_url('edit.php'));
        $views['glossary_thin'] = '<a href="' . esc_url($url) . '"' . (!empty($_GET['glossary_thin']) ? ' class="current" aria-current="page"' : '') . '>' . esc_html__('Thin: not indexed', 'acemedia-glossary') . ' <span class="count">(' . (int) $count . ')</span></a>'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only view switch.
        return $views;
    }

    public static function thin_view_query($query) {
        if (!is_admin() || !$query->is_main_query() || empty($_GET['glossary_thin']) || 'acemedia_glossary' !== $query->get('post_type')) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only view switch.
            return;
        }
        $ids = self::thin_ids();
        $query->set('post__in', $ids ? $ids : array(0));
        $query->set('post_status', 'publish');
    }

    public static function settings_line() {
        $count = count(self::thin_ids());
        $url   = add_query_arg(array('post_type' => 'acemedia_glossary', 'glossary_thin' => 1), admin_url('edit.php'));
        echo '<div class="notice notice-info inline acemedia-glossary-thin-line"><p>';
        if ($count) {
            printf(
                /* translators: 1: number of thin terms, 2: number of characters. */
                esc_html(_n('%1$s term is thin and kept out of search: its definition is under %2$s characters and its page has nothing else yet. It comes back automatically once it is expanded.', '%1$s terms are thin and kept out of search: their definitions are under %2$s characters and their pages have nothing else yet. They come back automatically once they are expanded.', $count, 'acemedia-glossary')),
                '<strong>' . esc_html(number_format_i18n($count)) . '</strong>', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
                esc_html(number_format_i18n(self::threshold()))
            );
            echo ' <a href="' . esc_url($url) . '">' . esc_html__('See which terms to expand', 'acemedia-glossary') . '</a>';
        } else {
            esc_html_e('No glossary terms are thin: every term page is indexed.', 'acemedia-glossary');
        }
        echo '</p></div>';
    }
}

AceMedia_Glossary_Quality::init();
