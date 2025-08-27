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
        require_once ACEMEDIA_GLOSSARY_PATH . 'includes/migration-auto-highlight.php';
    }

    private function initHooks() {
        add_action('init', array($this, 'initPlugin'));
        add_action('wp_enqueue_scripts', array($this, 'enqueueFrontendScripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueueAdminScripts'));
        
        // Ensure REST API nonce is available for autosave
        add_action('wp_head', array($this, 'add_rest_nonce_to_head'));
        add_action('admin_head', array($this, 'add_rest_nonce_to_head'));
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

    public function enqueueAdminScripts() {
        // Only enqueue on admin pages where the glossary admin is used
        $screen = get_current_screen();
        if ($screen && (strpos($screen->id, 'acemedia_glossary') !== false || $screen->post_type === 'acemedia_glossary')) {
            wp_enqueue_script(
                'acemedia-glossary-admin',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.js',
                array('wp-element', 'wp-components', 'wp-api-fetch'), 
                ACEMEDIA_GLOSSARY_VERSION,
                true
            );
            
            wp_enqueue_style(
                'acemedia-glossary-admin',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-admin.css',
                array('wp-components'),
                ACEMEDIA_GLOSSARY_VERSION
            );
        }
    }
    
    // Add REST API nonce to ensure authentication works during autosave
    public function add_rest_nonce_to_head() {
        if (is_user_logged_in()) {
            $nonce = wp_create_nonce('wp_rest');
            ?>
            <meta name="wp-rest-nonce" content="<?php echo $nonce; ?>" />
            <script type="text/javascript">
                window.wpApiSettings = window.wpApiSettings || {};
                window.wpApiSettings.nonce = '<?php echo $nonce; ?>';
                window.wpApiSettings.root = '<?php echo esc_url_raw(rest_url()); ?>';
                
                // Set up apiFetch with proper authentication
                if (typeof wp !== 'undefined' && wp.apiFetch) {
                    wp.apiFetch.use(wp.apiFetch.createNonceMiddleware('<?php echo $nonce; ?>'));
                    wp.apiFetch.use(wp.apiFetch.createRootURLMiddleware('<?php echo esc_url_raw(rest_url()); ?>'));
                }
                
                // Also set global variables for manual access
                window.wpRestNonce = '<?php echo $nonce; ?>';
                window.wpRestUrl = '<?php echo esc_url_raw(rest_url()); ?>';
            </script>
            <?php
        }
    }
}

// Initialize the plugin
AceMediaGlossary::getInstance();
