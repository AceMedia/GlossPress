<?php
// Seeded synthetic glossary + HTML. Terms are pre-sorted longest form first
// exactly as acemedia_glossary_get_highlight_terms() does (stable usort).
function gx_vocab(): array {
    static $v = null; if ($v) return $v;
    mt_srand(42);
    $syl = ['ra','ve','lo','min','tor','ca','den','sel','pa','gri','fon','ul','ber','sta','ki','mo','nu','plex','or','ent','tha','qui','zo','lan'];
    $v = [];
    while (count($v) < 4000) { $w = ''; $k = mt_rand(1, 3); for ($i = 0; $i < $k; $i++) $w .= $syl[mt_rand(0, count($syl) - 1)]; $v[$w] = true; }
    $v = array_keys($v);
    // a few real words with non-ASCII letters for boundary tests
    array_push($v, 'café', 'naïve', 'straße', 'émigré');
    return $v;
}
function gx_make_terms(int $T, int $seed): array {
    $v = gx_vocab(); mt_srand($seed); $terms = []; $seen = [];
    while (count($terms) < $T) {
        $n = mt_rand(1, 10) <= 5 ? 1 : (mt_rand(1, 10) <= 7 ? 2 : 3);
        $ws = []; for ($i = 0; $i < $n; $i++) $ws[] = $v[mt_rand(0, count($v) - 1)];
        // nesting: sometimes extend an existing term into a longer phrase
        if ($terms && mt_rand(1, 10) === 1) $ws = array_merge(explode(' ', strtolower($terms[mt_rand(0, count($terms) - 1)]['title'])), [$v[mt_rand(0, 3999)]]);
        $title = implode(' ', $ws);
        if (mt_rand(1, 20) === 1) $title = $ws[0] . "'s" . (count($ws) > 1 ? ' ' . implode(' ', array_slice($ws, 1)) : '');
        if (mt_rand(1, 4) === 1) $title = ucfirst($title);
        if (isset($seen[strtolower($title)])) continue; $seen[strtolower($title)] = true;
        $syn = [];
        if (mt_rand(1, 5) === 1) $syn[] = $v[mt_rand(0, 3999)] . ' ' . $v[mt_rand(0, 3999)];
        if (mt_rand(1, 50) === 1) $syn[] = 'über' . $v[mt_rand(0, 3999)]; // non-ASCII form -> regex fallback path
        $terms[] = ['title' => $title, 'synonyms' => $syn, 'definition' => "Definition of $title & <stuff> \"quoted\"."];
    }
    $longest = function ($t) { $m = strlen($t['title']); foreach ($t['synonyms'] as $s) $m = max($m, strlen($s)); return $m; };
    usort($terms, fn($a, $b) => $longest($b) - $longest($a));
    return $terms;
}
function gx_make_html(array $terms, int $bytes, string $dist, int $seed): string {
    $v = gx_vocab(); mt_srand($seed);
    $p = $dist === 'dense' ? 0.30 : 0.004;
    $out = ''; $para = [];
    $forms = [];
    foreach ($terms as $t) { $forms[] = $t['title']; foreach ($t['synonyms'] as $s) $forms[] = $s; }
    while (strlen($out) < $bytes) {
        $r = mt_rand() / mt_getrandmax();
        if ($r < $p) {
            $f = $forms[mt_rand(0, count($forms) - 1)];
            $c = mt_rand(1, 6);
            if ($c === 1) $f = strtoupper($f); elseif ($c === 2) $f = ucwords($f);
            if (mt_rand(1, 4) === 1) $f = str_replace("'", "\u{2019}", $f);
            if (mt_rand(1, 15) === 1) $f .= 'é';          // blocked by Unicode boundary
            if (mt_rand(1, 15) === 1) $f = '_' . $f;
            $para[] = $f;
        } else {
            $w = $v[(int) floor(pow(mt_rand() / mt_getrandmax(), 3) * (count($v) - 1))];
            $para[] = $w;
        }
        if (count($para) >= mt_rand(40, 90)) {
            $txt = htmlspecialchars(implode(' ', $para), ENT_NOQUOTES);
            $k = mt_rand(1, 12);
            if ($k === 1) $out .= "<h2>$txt</h2>\n";
            elseif ($k === 2) $out .= "<blockquote><p>$txt</p></blockquote>\n";
            elseif ($k === 3) { $h = intdiv(strlen($txt), 2); $sp = strrpos(substr($txt, 0, $h), ' ') ?: 0; $out .= '<p>' . mb_strcut_gx($txt, 0, $sp) . ' <a href="/x">' . mb_strcut_gx($txt, $sp, 40) . '</a>' . mb_strcut_gx($txt, $sp + strlen(mb_strcut_gx($txt, $sp, 40))) . "</p>\n"; }
            elseif ($k === 4) $out .= "<p class=\"no-glossary\">$txt</p>\n";
            elseif ($k === 5) $out .= "<ul><li>$txt</li><li><strong>$txt</strong> tail</li></ul>\n";
            else $out .= "<p>$txt</p>\n";
            $para = [];
        }
    }
    return $out;
}
function mb_strcut_gx(string $s, int $start, ?int $len = null): string { // UTF-8-safe byte cut (no mbstring on this host)
    $fix = function ($p) use ($s) { while ($p > 0 && $p < strlen($s) && (ord($s[$p]) & 0xC0) === 0x80) $p--; return $p; };
    $a = $fix($start); $b = $len === null ? strlen($s) : $fix(min(strlen($s), $start + $len));
    return substr($s, $a, max(0, $b - $a));
}
