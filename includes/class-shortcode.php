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
        wp_enqueue_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
            array('wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
            ACEMEDIA_GLOSSARY_VERSION,
            true
        );

        wp_enqueue_style(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.css',
            array(),
            ACEMEDIA_GLOSSARY_VERSION
        );

        wp_localize_script(
            'acemedia-glossary-frontend',
            'AceMediaGlossaryData',
            array(
                'restUrl' => esc_url(rest_url('wp/v2/glossary')),
                'nonce'   => wp_create_nonce('wp_rest'),
                'sort'    => esc_attr($atts['sort']),
            )
        );

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
