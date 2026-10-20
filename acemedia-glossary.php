<?php
/**
 * Plugin Name: AceMedia Glossary
 * Description: A glossary system with React-based admin and frontend interfaces
 * Version: 1.2.1
 * Author: AceMedia
 * Author URI: https://github.com/AceMedia
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) exit;

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
        define('ACEMEDIA_GLOSSARY_VERSION', '1.2.1');
    }

    /**
     * Cache-busting version for a built asset.
     *
     * The plugin version alone doesn't change between builds, so a rebuilt CSS or
     * JS file can sit behind a long-lived CDN cache indefinitely. Falling back to
     * the file's modification time means every deploy publishes a fresh URL.
     */
    public static function assetVersion($relative_path) {
        $file = ACEMEDIA_GLOSSARY_PATH . ltrim($relative_path, '/');
        $mtime = file_exists($file) ? filemtime($file) : false;

        return $mtime ? ACEMEDIA_GLOSSARY_VERSION . '.' . $mtime : ACEMEDIA_GLOSSARY_VERSION;
    }

    private function loadDependencies() {
        require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-post-type.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-style-settings.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-shortcode.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-template-loader.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-related-posts.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-query-loop-integration.php';
    require_once ACEMEDIA_GLOSSARY_PATH . 'includes/class-block-templates.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'admin/class-admin.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'admin/class-api.php';
        require_once ACEMEDIA_GLOSSARY_PATH . 'includes/migration-auto-highlight.php';
    }

    private function initHooks() {
        add_action('init', array($this, 'initPlugin'));
        add_action('wp_enqueue_scripts', array($this, 'enqueueFrontendScripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueueAdminScripts'));
        add_action('template_redirect', array($this, 'maybeBlockGlossaryRoutes'));
        add_filter('document_title_parts', array($this, 'filterDocumentTitleParts'), 15);
        add_filter('get_the_archive_title', array($this, 'filterArchiveTitle'), 10);
        add_filter('wp_sitemaps_post_types', array($this, 'filterSitemapPostTypes'));
        add_filter('wp_sitemaps_posts_query_args', array($this, 'filterSitemapQueryArgs'), 10, 2);
        add_filter('wp_sitemaps_posts_pre_max_num_pages', array($this, 'filterSitemapMaxNumPages'), 10, 2);
        add_filter('wp_sitemaps_index_entry', array($this, 'filterSitemapIndexEntry'), 10, 4);
        add_action('init', array($this, 'addGlossarySitemapRewrite'), 5);
        
        // Exclude glossary from last modified time for performance
        add_filter('get_lastpostmodified_post_types', array($this, 'excludeGlossaryFromLastModified'));
        
        // Cache glossary sitemap URL list
        add_filter('wp_sitemaps_posts_pre_url_list', array($this, 'cacheGlossarySitemapUrls'), 10, 3);
        add_filter('wp_sitemaps_posts_url_list', array($this, 'setGlossarySitemapUrlsCache'), 10, 3);
    }

    public function initPlugin() {
        new AceMediaGlossary_PostType();
    new AceMediaGlossary_Shortcode();
    if ($this->areTemplatesEnabled()) {
        new AceMediaGlossary_Template_Loader();
        new AceMediaGlossary_Block_Templates();
        new AceMediaGlossary_Query_Loop_Integration();
    } else {
        AceMediaGlossary_Block_Templates::unregister_templates();
    }
        new AceMediaGlossary_Admin();
    }

    private function areTemplatesEnabled() {
        $enabled = get_option('acemedia_glossary_templates_enabled', 'true');
        return $enabled === 'true' || $enabled === true || $enabled === 1;
    }

    public function maybeBlockGlossaryRoutes() {
        if (is_admin() || $this->areTemplatesEnabled()) {
            return;
        }

        if (is_post_type_archive('acemedia_glossary') || is_singular('acemedia_glossary')) {
            global $wp_query;
            if ($wp_query) {
                $wp_query->set_404();
            }

            status_header(404);
            nocache_headers();

            $template = get_404_template();
            if ($template) {
                include $template;
            } else {
                include get_query_template('index');
            }
            exit;
        }
    }

    public function filterDocumentTitleParts($parts) {
        if (!is_array($parts)) {
            return $parts;
        }

        if (is_post_type_archive('acemedia_glossary') || is_singular('acemedia_glossary')) {
            if (isset($parts['title'])) {
                // Decode HTML entities first, then strip tags
                $parts['title'] = wp_strip_all_tags(html_entity_decode($parts['title'], ENT_QUOTES, 'UTF-8'));
            }
        }

        return $parts;
    }

    public function filterArchiveTitle($title) {
        if (is_post_type_archive('acemedia_glossary')) {
            // Get just the post type archive title without prefix and spans
            $title = post_type_archive_title('', false);
        }
        return $title;
    }

    public function filterSitemapPostTypes($post_types) {
        if (!is_array($post_types)) {
            return $post_types;
        }

        if (isset($post_types['glossary'])) {
            return $post_types;
        }

        if (isset($post_types['acemedia_glossary'])) {
            $post_types['glossary'] = $post_types['acemedia_glossary'];
            unset($post_types['acemedia_glossary']);
        }

        return $post_types;
    }

    public function filterSitemapQueryArgs($args, $post_type) {
        if ('glossary' !== $post_type) {
            return $args;
        }

        $args['post_type'] = 'acemedia_glossary';
        return $args;
    }

    public function filterSitemapMaxNumPages($max_num_pages, $post_type) {
        if ('glossary' !== $post_type) {
            return $max_num_pages;
        }

        $cache_key = 'glossary_sitemap_max_pages';
        $cached = wp_cache_get($cache_key, 'glossary_sitemap');
        if ($cached !== false) {
            return $cached;
        }

        $args = array(
            'orderby'                => 'ID',
            'order'                  => 'ASC',
            'post_type'              => 'acemedia_glossary',
            'posts_per_page'         => wp_sitemaps_get_max_urls('post'),
            'post_status'            => array('publish'),
            'no_found_rows'          => false,
            'fields'                 => 'ids',
            'update_post_term_cache' => false,
            'update_post_meta_cache' => false,
            'ignore_sticky_posts'    => true,
        );

        $query = new WP_Query($args);
        $result = isset($query->max_num_pages) ? max(0, $query->max_num_pages) : 1;
        wp_cache_set($cache_key, $result, 'glossary_sitemap', 3600); // Cache for 1 hour
        return $result;
    }

    public function addGlossarySitemapRewrite() {
        add_rewrite_rule(
            '^glossary\.xml$',
            'index.php?sitemap=posts&sitemap-subtype=glossary&paged=1',
            'top'
        );
        add_rewrite_rule(
            '^glossary-(\d+)\.xml$',
            'index.php?sitemap=posts&sitemap-subtype=glossary&paged=$matches[1]',
            'top'
        );
    }

    public function excludeGlossaryFromLastModified($post_types) {
        unset($post_types['acemedia_glossary']);
        return $post_types;
    }

    public function cacheGlossarySitemapUrls($url_list, $post_type, $page_num) {
        if ('glossary' !== $post_type) {
            return $url_list;
        }

        $cache_key = 'glossary_sitemap_urls_' . $page_num;
        $cached = wp_cache_get($cache_key, 'glossary_sitemap');
        if ($cached !== false) {
            return $cached;
        }
        return $url_list; // false to let generate
    }

    public function setGlossarySitemapUrlsCache($url_list, $post_type, $page_num) {
        if ('glossary' !== $post_type) {
            return $url_list;
        }

        $cache_key = 'glossary_sitemap_urls_' . $page_num;
        wp_cache_set($cache_key, $url_list, 'glossary_sitemap', 3600); // Cache for 1 hour
        return $url_list;
    }

    public function filterSitemapIndexEntry($sitemap_entry, $object_type, $object_subtype, $page) {
        if ($object_type === 'post' && $object_subtype === 'glossary') {
            $max_pages = $this->filterSitemapMaxNumPages(0, 'glossary');
            if ((int) $page === 1 && $max_pages <= 1) {
                $sitemap_entry['loc'] = home_url('/glossary.xml');
            } else {
                $sitemap_entry['loc'] = home_url("/glossary-{$page}.xml");
            }
        }
        return $sitemap_entry;
    }

    public function enqueueFrontendScripts() {
        // Enqueue early where we can tell the glossary is on the page, so the
        // stylesheet lands in <head> on classic themes too. The block and
        // shortcode enqueue again on render as a fallback.
        if ($this->hasGlossaryContent() || is_post_type_archive('acemedia_glossary')) {
            AceMediaGlossary_Shortcode::enqueueAssets();
        }
    }
    
    private function hasGlossaryContent() {
        global $post;
        if (!$post) {
            return false;
        }
    
        return has_block('acemedia/glossary', $post->post_content) || has_shortcode($post->post_content, 'glossary');
    }

    public function enqueueAdminScripts() {
        // Only enqueue on admin pages where the glossary admin is used
        $screen = get_current_screen();
        if ($screen && (strpos($screen->id, 'acemedia_glossary') !== false || $screen->post_type === 'acemedia_glossary')) {
            // Limit Gutenberg component/runtime packages to glossary admin UI only.
            wp_enqueue_script('wp-components');
            wp_enqueue_script('react');
            wp_enqueue_script('react-dom');

            $asset_file = ACEMEDIA_GLOSSARY_PATH . 'build/glossary-admin.asset.php';
            $asset_data = file_exists($asset_file) ? require $asset_file : array('dependencies' => array('wp-element'), 'version' => ACEMEDIA_GLOSSARY_VERSION);
            
            // Ensure dependencies are loaded
            foreach ($asset_data['dependencies'] as $dep) {
                wp_enqueue_script($dep);
            }
            
            wp_enqueue_script(
                'acemedia-glossary-admin',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.js',
                $asset_data['dependencies'],
                $asset_data['version'],
                true
            );
            
            wp_enqueue_style(
                'acemedia-glossary-admin',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.css',
                array('wp-components'),
                self::assetVersion('build/glossary-admin.css')
            );
        }
    }
}

// Initialize the plugin
AceMediaGlossary::getInstance();
