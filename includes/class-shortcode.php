<?php
if (!defined('ABSPATH')) exit;

class AceMediaGlossary_Shortcode {
    public function __construct() {
        add_shortcode('glossary', array($this, 'renderShortcode'));
    }

    /**
     * Renders the Glossary Shortcode
     *
     * @param array $atts Shortcode attributes.
     * @return string HTML output for the glossary.
     */
    public function renderShortcode($atts) {
        // Merge default attributes with user-defined ones
        $atts = shortcode_atts(array(
            'sort' => 'alphabetical',
        ), $atts, 'glossary');

        // Enqueue scripts and styles
        wp_register_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
            array('wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );

        wp_enqueue_script('acemedia-glossary-frontend');

        wp_enqueue_style(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.css',
            array(),
            ACEMEDIA_GLOSSARY_VERSION
        );



    // Check if there is custom CSS saved and add it
    $custom_css = get_option('acemedia_custom_css', '');
    if (!empty($custom_css)) {
        wp_add_inline_style('acemedia-glossary-frontend', $custom_css);
    }

        // Generate a unique transient key based on attributes
        $transient_key = 'acemedia_glossary_data_' . md5(json_encode($atts));

        // Try to get cached glossary data
        $terms = get_transient($transient_key);

        if ($terms === false) {
            // Fetch glossary terms if not cached
            $args = array(
                'post_type' => 'acemedia_glossary',
                'posts_per_page' => -1,
                'orderby' => $atts['sort'] === 'updated' ? 'modified' : 'title',
                'order' => 'ASC',
            );
            $terms = get_posts($args);

            // Cache the glossary data for 12 hours
            set_transient($transient_key, $terms, 12 * HOUR_IN_SECONDS);
        }

        // Prepare preloaded terms data for JavaScript (same format as API response)
        $preloaded_terms = array();
        foreach ($terms as $term) {
            $related_terms = get_post_meta($term->ID, 'related_terms', true);
            $categories = get_the_terms($term->ID, 'category');
            $tags = get_the_terms($term->ID, 'post_tag');
            
            $preloaded_terms[] = array(
                'id' => $term->ID,
                'title' => html_entity_decode($term->post_title, ENT_QUOTES),
                'content' => html_entity_decode($term->post_content, ENT_QUOTES),
                'modified' => $term->post_modified,
                'relatedTerms' => is_array($related_terms) ? array_map('intval', $related_terms) : array(),
                'categories' => is_array($categories) ? array_map(function($cat) {
                    return array('id' => $cat->term_id, 'name' => $cat->name);
                }, $categories) : array(),
                'tags' => is_array($tags) ? array_map(function($tag) {
                    return array('id' => $tag->term_id, 'name' => $tag->name);
                }, $tags) : array(),
            );
        }

        wp_localize_script(
            'acemedia-glossary-frontend',
            'AceMediaGlossaryData',
            array(
                'restUrl' => esc_url(rest_url('wp/v2/glossary')),
                'nonce'   => wp_create_nonce('wp_rest'),
                'sort'    => esc_attr($atts['sort']),
                'autoHighlight' => get_option('acemedia_glossary_auto_highlight', 'false') === 'true',
                'preloadedTerms' => $preloaded_terms, // Add preloaded terms data
            )
        );

        // Render terms as static HTML
        ob_start(); ?>
        <div id="acemedia-glossary-root" data-sort="<?php echo esc_attr($atts['sort']); ?>">
            <div class="glossary-index">
                <ul>
                <?php
                foreach ($terms as $term): 
                    $term_name = esc_html($term->post_title);
                    $term_description = esc_html(wp_trim_words($term->post_content, 30));
                    $term_url = get_permalink($term->ID);

                    // Fetch related terms, categories, and tags
                    $related_terms = get_post_meta($term->ID, 'related_terms', true);
                    $categories = get_the_terms($term->ID, 'category');
                    $tags = get_the_terms($term->ID, 'post_tag');
                ?>
                    <li id="term-<?php echo esc_attr($term->ID); ?>">
                        <h3><?php echo $term_name; ?></h3>
                        <p><?php echo $term_description; ?></p>

                        <!-- JSON-LD Schema -->
                        <script type="application/ld+json">
                        {
                            "@context": "https://schema.org",
                            "@type": "DefinedTerm",
                            "name": "<?php echo $term_name; ?>",
                            "description": "<?php echo $term_description; ?>",
                            "url": "<?php echo $term_url; ?>"
                        }
                        </script>

                        <!-- "See Also" Section -->
                        <?php if (!empty($related_terms)): ?>
                            <div class="see-also">
                                <strong><?php _e('See Also:', 'acemedia-glossary'); ?></strong>
                                <ul>
                                    <?php foreach ($related_terms as $related_id): ?>
                                        <?php $related_term = get_post($related_id); ?>
                                        <?php if ($related_term): ?>
                                            <li>
                                                <a href="#term-<?php echo esc_attr($related_id); ?>">
                                                    <?php echo esc_html($related_term->post_title); ?>
                                                </a>
                                            </li>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        <?php endif; ?>

                        <!-- Categories Section -->
                        <?php if (!empty($categories)): ?>
                            <div class="categories">
                                <strong><?php _e('Categories:', 'acemedia-glossary'); ?></strong>
                                <ul>
                                    <?php foreach ($categories as $category): ?>
                                        <li>
                                            <a href="<?php echo esc_url(get_term_link($category)); ?>">
                                                <?php echo esc_html($category->name); ?>
                                            </a>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        <?php endif; ?>

                        <!-- Tags Section -->
                        <?php if (!empty($tags)): ?>
                            <div class="tags">
                                <strong><?php _e('Tags:', 'acemedia-glossary'); ?></strong>
                                <ul>
                                    <?php foreach ($tags as $tag): ?>
                                        <li>
                                            <a href="<?php echo esc_url(get_term_link($tag)); ?>">
                                                <?php echo esc_html($tag->name); ?>
                                            </a>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        <?php endif; ?>
                    </li>
                <?php endforeach; ?>
                </ul>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}


function highlight_glossary_terms($content) {
    // Check if auto_highlight is enabled (correct option name)
    $auto_highlight_enabled = get_option('acemedia_glossary_auto_highlight', 'false') === 'true';

    if (!$auto_highlight_enabled || !is_singular() || is_front_page() || is_archive()) {
        return $content; // Skip processing if auto_highlight is disabled
    }

    // Fetch glossary terms (assuming they are a custom post type 'glossary')
    $glossary_posts = get_posts([
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
    ]);

    if (empty($glossary_posts)) {
        return $content; // No glossary terms found, return content unchanged
    }

    // Extract titles and content (definitions) from WP_Post objects
    $glossary_data = array_map(function ($post) {
        return [
            'title' => $post->post_title,
            'definition' => wp_strip_all_tags($post->post_content), // Strip HTML from definition for tooltip
        ];
    }, $glossary_posts);

    // Sort glossary terms by length in descending order to prioritize longer terms
    usort($glossary_data, function ($a, $b) {
        return strlen($b['title']) - strlen($a['title']);
    });

    // Create a safe highlighting function that only affects plain text
    $hasHighlights = false;
    
    foreach ($glossary_data as $term) {
        $term_title = $term['title'];
        $term_definition = esc_attr($term['definition']);
        
        // Skip if already highlighted to prevent double highlighting
        if (strpos($content, 'data-tooltip=\'' . $term_definition . '\'') !== false) {
            continue;
        }
        
        // Only highlight if the term appears as standalone text, not within HTML attributes or tags
        // This is a very conservative approach that only matches text between > and < characters
        $safe_pattern = '/(?<=>)([^<]*?)(\b' . preg_quote($term_title, '/') . '\b)([^<]*?)(?=<)/i';
        
        $replacement_count = 0;
        $content = preg_replace_callback($safe_pattern, function($matches) use ($term_title, $term_definition, &$hasHighlights, &$replacement_count) {
            // Only allow one replacement to avoid multiple highlights of the same term
            if ($replacement_count > 0) {
                return $matches[0];
            }
            
            $before_text = $matches[1];
            $matched_term = $matches[2];
            $after_text = $matches[3];
            
            // Additional safety: don't highlight if the surrounding text suggests we're in an attribute
            if (strpos($before_text, '"') !== false || strpos($after_text, '"') !== false ||
                strpos($before_text, '=') !== false || strpos($after_text, '=') !== false ||
                strpos($before_text, 'glossary-highlight') !== false) {
                return $matches[0];
            }
            
            $replacement_count++;
            $hasHighlights = true;
            $highlighted = "<span class='glossary-highlight' data-tooltip='{$term_definition}'>" . esc_html($matched_term) . "</span>";
            return $before_text . $highlighted . $after_text;
        }, $content);
    }
    
    // Enqueue the tooltip script and styles if matches were found
    if ($hasHighlights) {
        add_action('wp_enqueue_scripts', function () {
            wp_enqueue_style(
                'wp-components',
                includes_url('/css/dist/components/style.css'),
                [],
                null // No versioning to match WP core
            );

            wp_enqueue_style(
                'acemedia-glossary-tooltips',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-tooltips.css',
                array(),
                ACEMEDIA_GLOSSARY_VERSION
            );

            wp_enqueue_script(
                'acemedia-glossary-tooltips',
                ACEMEDIA_GLOSSARY_URL . 'build/glossary-tooltips.js',
                ['wp-element', 'wp-components'], // Dependencies
                ACEMEDIA_GLOSSARY_VERSION,
                true // Load in the footer
            );
        });
    }

    return $content;
}

// Hook into the_content filter
add_filter('the_content', 'highlight_glossary_terms');


function acemedia_register_glossary_block() {
    wp_register_script(
        'acemedia-glossary-block',
        ACEMEDIA_GLOSSARY_URL . 'build/glossary-block.js',
        array('wp-blocks', 'wp-editor', 'wp-element', 'wp-components', 'wp-i18n'),
        ACEMEDIA_GLOSSARY_VERSION,
        true
    );

    wp_register_style(
        'acemedia-glossary-block-editor',
        ACEMEDIA_GLOSSARY_URL . 'build/glossary-block-editor.css',
        array('wp-edit-blocks'),
        ACEMEDIA_GLOSSARY_VERSION
    );

  

    register_block_type('acemedia/glossary', array(
        'editor_script'   => 'acemedia-glossary-block',
        'editor_style'    => 'acemedia-glossary-block-editor',
        'style'           => 'acemedia-glossary-block-frontend',
        'render_callback' => 'acemedia_render_glossary_block',
        'attributes'      => array(
            'sort' => array(
                'type' => 'string',
                'default' => 'alphabetical',
            ),
        ),
    ));
}
add_action('init', 'acemedia_register_glossary_block');


function acemedia_render_glossary_block($attributes) {
    $shortcode_instance = new AceMediaGlossary_Shortcode();
    return $shortcode_instance->renderShortcode($attributes);
}