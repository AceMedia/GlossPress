<?php
/**
 * Fixture test: the strpos prefilter in acemedia_glossary_highlight_html()
 * must give byte-identical output to the 1.2.2 per-term regex loop.
 *
 * Run: php8.4 tests/highlight-prefilter.php
 * Cases come from the glosspress-highlighter experiment: mixed case, curly
 * apostrophes, nested terms, non-ASCII synonyms and é/_ glued to terms.
 */
define('ABSPATH', __DIR__ . '/');
function add_action() {}
function add_filter() {}
function apply_filters($hook, $value) { return $value; }
require dirname(__DIR__) . '/includes/class-shortcode.php';
require __DIR__ . '/fixtures/highlight-baseline.php.inc';
require __DIR__ . '/fixtures/highlight-data.php';
ini_set('memory_limit', '1G');

$cases = 0;
$hits = 0;
foreach (array(10, 100, 1000) as $T) {
    $terms = gx_make_terms($T, 1000 + $T);
    foreach (array(2000, 20000) as $bytes) {
        foreach (array('natural', 'dense') as $dist) {
            $html = gx_make_html($terms, $bytes, $dist, 7 + $bytes + $T);
            $want = baseline_glossary_highlight_html($html, $terms);
            $got = acemedia_glossary_highlight_html($html, $terms);
            if ($got !== $want) {
                fwrite(STDERR, "Mismatch: T=$T bytes=$bytes dist=$dist\n");
                exit(1);
            }
            $cases++;
            $hits += $got['has'] ? 1 : 0;
        }
    }
}

// Hand cases: curly versus straight apostrophes, mixed case, boundaries, Unicode folding.
$terms = array(
    array('title' => "Builder's Yard", 'synonyms' => array(), 'definition' => 'A'),
    array('title' => 'Café', 'synonyms' => array('CAFE'), 'definition' => 'B'),
    array('title' => 'Garden', 'synonyms' => array(), 'definition' => 'C'),
);
foreach (array(
    "<p>The builder\u{2019}s yard by the GARDEN gate.</p>",
    "<p>BUILDER'S YARD, gardené, garden_x, CAFÉ and café.</p>",
    "<p>No terms here at all.</p>",
    "<p class=\"no-glossary\">Garden</p><p>garden</p>",
) as $html) {
    if (acemedia_glossary_highlight_html($html, $terms) !== baseline_glossary_highlight_html($html, $terms)) {
        fwrite(STDERR, "Mismatch on hand case: $html\n");
        exit(1);
    }
    $cases++;
}

if ($hits === 0) {
    fwrite(STDERR, "Generated cases never highlighted anything\n");
    exit(1);
}
echo "OK: $cases cases byte-identical\n";
