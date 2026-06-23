<?php
if (!defined('ABSPATH')) {
    exit;
}

global $post;

get_header();
?>
<main id="primary" class="acemedia-glossary-archive">
    <?php echo do_shortcode('[glossary]'); ?>
</main>
<?php
get_footer();
