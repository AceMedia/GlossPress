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

        $style_variables = array();

        if (!empty($atts['textColor'])) {
            $color = sanitize_hex_color($atts['textColor']);
            if ($color) {
                $style_variables['--glossary-text-color'] = $color;
            }
        }

        if (!empty($atts['headingBackgroundColor'])) {
            $color = sanitize_hex_color($atts['headingBackgroundColor']);
            if ($color) {
                $style_variables['--glossary-heading-background'] = $color;
            }
        }

        if (!empty($atts['headingTextColor'])) {
            $color = sanitize_hex_color($atts['headingTextColor']);
            if ($color) {
                $style_variables['--glossary-heading-text-color'] = $color;
            }
        }

        if (!empty($atts['cardBackgroundColor'])) {
            $color = sanitize_hex_color($atts['cardBackgroundColor']);
            if ($color) {
                $style_variables['--glossary-card-background'] = $color;
            }
        }

        $content_gap = AceMediaGlossary_Style_Settings::sanitize_css_unit($atts['contentGap']);
        if (!empty($content_gap)) {
            $style_variables['--glossary-content-gap'] = $content_gap;
        }

        $heading_padding = AceMediaGlossary_Style_Settings::sanitize_css_unit($atts['headingPadding']);
        if (!empty($heading_padding)) {
            $style_variables['--glossary-heading-padding'] = $heading_padding;
        }

        $style_attr = '';
        if (!empty($style_variables)) {
            $declarations = array();
            foreach ($style_variables as $var => $value) {
                $declarations[] = $var . ':' . $value;
            }
            $style_attr = ' style="' . esc_attr(implode(';', $declarations)) . '"';
        }

        // Enqueue scripts and styles
        wp_register_script(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.js',
            array('wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
            AceMediaGlossary::assetVersion('build/glossary-frontend.js'),
            true
        );

        wp_enqueue_script('acemedia-glossary-frontend');

        wp_enqueue_style(
            'acemedia-glossary-frontend',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-frontend.css',
            array(),
            AceMediaGlossary::assetVersion('build/glossary-frontend.css')
        );



    // Check if there is custom CSS saved and add it
    $custom_css = get_option('acemedia_glossary_custom_css', '');
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
            
            // Sanitize related terms - filter out any that no longer exist
            $valid_related_terms = array();
            if (is_array($related_terms) && !empty($related_terms)) {
                $needs_cleanup = false;
                foreach ($related_terms as $related_id) {
                    $related_post = get_post($related_id);
                    if ($related_post && $related_post->post_type === 'acemedia_glossary') {
                        $valid_related_terms[] = intval($related_id);
                    } else {
                        $needs_cleanup = true;
                    }
                }
                
                // Update the meta if we found orphaned references
                if ($needs_cleanup) {
                    update_post_meta($term->ID, 'related_terms', $valid_related_terms);
                }
            }
            
            $preloaded_terms[] = array(
                'id' => $term->ID,
                'title' => html_entity_decode($term->post_title, ENT_QUOTES),
                'content' => html_entity_decode($term->post_content, ENT_QUOTES),
                'modified' => $term->post_modified,
                'relatedTerms' => $valid_related_terms,
                'categories' => is_array($categories) ? array_map(function($cat) {
                    return array('id' => $cat->term_id, 'title' => $cat->name, 'slug' => $cat->slug);
                }, $categories) : array(),
                'tags' => is_array($tags) ? array_map(function($tag) {
                    return array('id' => $tag->term_id, 'title' => $tag->name, 'slug' => $tag->slug);
                }, $tags) : array(),
                'autoHighlight' => (bool) get_post_meta($term->ID, 'auto_highlight', true),
                'enablePostRelations' => (bool) get_post_meta($term->ID, 'enable_post_relations', true),
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
                'styles' => array(
                    'textColor' => $style_variables['--glossary-text-color'] ?? '',
                    'headingBackgroundColor' => $style_variables['--glossary-heading-background'] ?? '',
                    'headingTextColor' => $style_variables['--glossary-heading-text-color'] ?? '',
                    'cardBackgroundColor' => $style_variables['--glossary-card-background'] ?? '',
                    'contentGap' => $style_variables['--glossary-content-gap'] ?? '',
                    'headingPadding' => $style_variables['--glossary-heading-padding'] ?? '',
                ),
            )
        );

        // Render terms as static HTML
        ob_start(); ?>
        <div id="acemedia-glossary-root" data-sort="<?php echo esc_attr($atts['sort']); ?>"<?php echo $style_attr; ?>>
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
    update_option('acemedia_glossary_terms_version', (string) time(), false);
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

/**
 * The auto-highlight term set, cached globally (identical for every page render)
 * and busted by the terms-version stamp. Returns each enabled term with its
 * stripped definition and taxonomy ids, pre-sorted longest-title-first so longer
 * phrases win over substrings. Replaces the per-request get_posts(-1) +
 * per-term meta/taxonomy lookups that previously ran on every article view.
 */
function acemedia_glossary_get_highlight_terms() {
    $cache_key = 'acemedia_glossary_hl_terms_' . acemedia_glossary_terms_version();
    $terms = get_transient($cache_key);
    if (is_array($terms)) {
        return $terms;
    }

    $glossary_posts = get_posts([
        'post_type'   => 'acemedia_glossary',
        'numberposts' => -1,
        'post_status' => 'publish',
    ]);

    $terms = array();
    foreach ($glossary_posts as $glossary_post) {
        if (!(bool) get_post_meta($glossary_post->ID, 'auto_highlight', true)) {
            continue; // Skip terms that don't have auto-highlight enabled
        }
        $terms[] = array(
            'title'      => $glossary_post->post_title,
            'definition' => wp_strip_all_tags($glossary_post->post_content),
            'categories' => wp_get_post_categories($glossary_post->ID),
            'tags'       => wp_get_post_tags($glossary_post->ID, array('fields' => 'ids')),
        );
    }

    // Sort by title length descending to prioritise longer terms.
    usort($terms, function ($a, $b) {
        return strlen($b['title']) - strlen($a['title']);
    });

    set_transient($cache_key, $terms, 12 * HOUR_IN_SECONDS);
    return $terms;
}

/**
 * Registers the tooltip CSS/JS. Called on both cache miss and cache hit so the
 * assets are present whenever the cached output contains highlights.
 */
function acemedia_glossary_enqueue_tooltip_assets() {
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
            AceMediaGlossary::assetVersion('build/glossary-tooltips.css')
        );

        wp_enqueue_script(
            'acemedia-glossary-tooltips',
            ACEMEDIA_GLOSSARY_URL . 'build/glossary-tooltips.js',
            ['wp-element', 'wp-components'], // Dependencies
            AceMediaGlossary::assetVersion('build/glossary-tooltips.js'),
            true // Load in the footer
        );
    });
}

function highlight_glossary_terms($content) {
    // Check if auto_highlight is enabled (correct option name)
    $auto_highlight_enabled = get_option('acemedia_glossary_auto_highlight', 'false') === 'true';

    if (!$auto_highlight_enabled || !is_singular() || is_front_page() || is_archive()) {
        return $content; // Skip processing if auto_highlight is disabled
    }

    // Get the current post's categories and tags
    global $post;
    if (!$post instanceof WP_Post) {
        return $content;
    }
    $current_post_categories = wp_get_post_categories($post->ID);
    $current_post_tags = wp_get_post_tags($post->ID, array('fields' => 'ids'));

    $terms_version = acemedia_glossary_terms_version();

    // Output cache: the rewritten content depends only on the exact input
    // content, the term-set version, and this post's taxonomy (which decides
    // applicable terms). A hit skips the term scan AND the DOMDocument rewrite.
    $output_cache_key = 'acemedia_glossary_hl_' . md5(
        $terms_version . '|' . md5($content) . '|' .
        implode(',', $current_post_categories) . '|' .
        implode(',', $current_post_tags)
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
        $has_shared_category = !empty(array_intersect($current_post_categories, $term['categories']));
        $has_shared_tag = !empty(array_intersect($current_post_tags, $term['tags']));

        if ($has_shared_category || $has_shared_tag || (empty($term['categories']) && empty($term['tags']))) {
            $glossary_data[] = array(
                'title'      => $term['title'],
                'definition' => $term['definition'],
            );
        }
    }

    // If no terms apply, cache the passthrough so we don't rescan next time.
    if (empty($glossary_data)) {
        set_transient($output_cache_key, array('html' => $content, 'has' => false), 12 * HOUR_IN_SECONDS);
        return $content;
    }

    // Use DOMDocument for safe HTML parsing and manipulation
    $dom = new DOMDocument('1.0', 'UTF-8');
    // Suppress warnings for malformed HTML
    libxml_use_internal_errors(true);
    
    // Add UTF-8 meta tag and wrap in div to ensure proper parsing
    $dom->loadHTML('<?xml encoding="utf-8" ?><div>' . $content . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    
    $xpath = new DOMXPath($dom);
    $hasHighlights = false;
    
    // Track which terms have been used (only the first occurrence of each
    // term is highlighted, across the whole post)
    $used_terms = array();
    
    // Get all text nodes that are not inside glossary-highlight spans
    // and not inside heading elements (h1–h6)
    $textNodes = $xpath->query(
        '//text()[
            not(ancestor::span[@class="glossary-highlight"]) and
            not(ancestor::h1) and not(ancestor::h2) and not(ancestor::h3) and
            not(ancestor::h4) and not(ancestor::h5) and not(ancestor::h6)
        ]'
    );
    
    // For each text node, mark every distinct term that appears in it. Terms
    // are already sorted longest-first, so a longer phrase claims its span
    // before a shorter term nested inside it can.
    foreach ($textNodes as $textNode) {
        $text = $textNode->nodeValue;
        $found = array();

        foreach ($glossary_data as $term) {
            $term_title = $term['title'];

            // Skip if we've already highlighted this term elsewhere
            if (isset($used_terms[$term_title])) {
                continue;
            }

            // Check if the term appears as a word boundary in this text node
            $pattern = '/\b' . preg_quote($term_title, '/') . '\b/iu';

            if (!preg_match($pattern, $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            $offset = $matches[0][1];
            $length = strlen($matches[0][0]);

            // Don't let a shorter term land inside a span already claimed by a
            // longer one in this same node.
            $overlaps = false;
            foreach ($found as $claimed) {
                if ($offset < $claimed['offset'] + $claimed['length'] &&
                    $claimed['offset'] < $offset + $length) {
                    $overlaps = true;
                    break;
                }
            }
            if ($overlaps) {
                continue;
            }

            $found[] = array(
                'term'         => $term_title,
                'definition'   => esc_attr($term['definition']),
                'offset'       => $offset,
                'length'       => $length,
                'matched_text' => $matches[0][0],
            );
        }

        if (empty($found)) {
            continue;
        }

        // Rebuild the node left to right so the offsets stay meaningful.
        usort($found, function ($a, $b) {
            return $a['offset'] - $b['offset'];
        });

        $parent = $textNode->parentNode;
        $cursor = 0;

        foreach ($found as $match) {
            $before = substr($text, $cursor, $match['offset'] - $cursor);
            if ($before !== '') {
                $parent->insertBefore($dom->createTextNode($before), $textNode);
            }

            $span = $dom->createElement('span');
            $span->setAttribute('class', 'glossary-highlight');
            $span->setAttribute('data-tooltip', $match['definition']);
            $span->appendChild($dom->createTextNode($match['matched_text']));
            $parent->insertBefore($span, $textNode);

            $cursor = $match['offset'] + $match['length'];
            $used_terms[$match['term']] = true;
            $hasHighlights = true;
        }

        $after = substr($text, $cursor);
        if ($after !== '') {
            $parent->insertBefore($dom->createTextNode($after), $textNode);
        }

        $parent->removeChild($textNode);
    }

    // Extract the content from the wrapper div
    $body = $dom->getElementsByTagName('div')->item(0);
    $content = '';
    if ($body) {
        foreach ($body->childNodes as $child) {
            $content .= $dom->saveHTML($child);
        }
    }
    
    // Enqueue the tooltip script and styles if matches were found
    if ($hasHighlights) {
        acemedia_glossary_enqueue_tooltip_assets();
    }

    set_transient($output_cache_key, array('html' => $content, 'has' => $hasHighlights), 12 * HOUR_IN_SECONDS);

    return $content;
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
