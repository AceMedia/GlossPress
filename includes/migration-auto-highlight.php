<?php
/**
 * Migration script to enable auto-highlight for all existing glossary terms
 * Run this once to set all existing terms to auto-highlight = true
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

function migrate_auto_highlight_for_existing_terms() {
    $terms = get_posts([
        'post_type' => 'acemedia_glossary',
        'numberposts' => -1,
        'meta_query' => [
            [
                'key' => 'auto_highlight',
                'compare' => 'NOT EXISTS'
            ]
        ]
    ]);

    $updated_count = 0;
    foreach ($terms as $term) {
        update_post_meta($term->ID, 'auto_highlight', true);
        $updated_count++;
    }

    // Clear caches
    delete_transient('acemedia_glossary_terms');
    delete_transient('acemedia_glossary_terms_summary');
    delete_transient('acemedia_glossary_prefetch_data');

    return $updated_count;
}

// Hook to run migration on admin page load (one time)
add_action('admin_init', function() {
    // Only run if we're on the glossary admin page and haven't run the migration yet
    if (isset($_GET['page']) && $_GET['page'] === 'acemedia-glossary-admin' && !get_option('acemedia_glossary_auto_highlight_migrated')) {
        $updated_count = migrate_auto_highlight_for_existing_terms();
        update_option('acemedia_glossary_auto_highlight_migrated', true);
        
        if ($updated_count > 0) {
            add_action('admin_notices', function() use ($updated_count) {
                echo '<div class="notice notice-success is-dismissible">';
                echo '<p><strong>GlossPress:</strong> Auto-highlight has been enabled for ' . $updated_count . ' existing glossary terms. You can now manage this setting individually for each term.</p>';
                echo '</div>';
            });
        }
    }
});
