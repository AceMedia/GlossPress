<?php
function baseline_glossary_term_pattern($term) {
    $forms = array_merge(array($term['title']), isset($term['synonyms']) ? (array) $term['synonyms'] : array());
    $forms = array_values(array_unique(array_filter(array_map('trim', $forms), 'strlen')));
    if (!$forms) {
        return '';
    }
    usort($forms, function ($a, $b) {
        return strlen($b) - strlen($a);
    });

    $apostrophe = "['\u{2019}]";
    $forms = array_map(function ($form) use ($apostrophe) {
        return strtr(preg_quote($form, '/'), array("'" => $apostrophe, "\u{2019}" => $apostrophe));
    }, $forms);

    return '/(?<![\p{L}\p{N}_])(?:' . implode('|', $forms) . ')(?![\p{L}\p{N}_])/iu';
}
function baseline_glossary_highlight_html($content, $glossary_data) {
    if (!class_exists('DOMDocument') || !class_exists('DOMXPath')) {
        return array('html' => $content, 'has' => false);
    }
    $patterns = array();
    foreach ($glossary_data as $i => $term) {
        $pattern = baseline_glossary_term_pattern($term);
        if ($pattern !== '') {
            $patterns[$i] = $pattern;
        }
    }
    if (!$patterns || trim($content) === '') {
        return array('html' => $content, 'has' => false);
    }

    // Parse inside a wrapper div, with an encoding hint so UTF-8 survives.
    $dom = new DOMDocument('1.0', 'UTF-8');
    $previous = libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8" ?><div>' . $content . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    $skip = array_map(function ($name) {
        return 'self::' . $name;
    }, baseline_glossary_skip_elements());
    $skip[] = 'contains(concat(" ", normalize-space(@class), " "), " glossary-highlight ")';
    $skip[] = 'contains(concat(" ", normalize-space(@class), " "), " no-glossary ")';

    $xpath = new DOMXPath($dom);
    $text_nodes = $xpath->query('//text()[not(ancestor::*[' . implode(' or ', $skip) . '])]');
    if (!$text_nodes) {
        return array('html' => $content, 'has' => false);
    }

    // Only the first occurrence of each term is highlighted, across the post.
    $used = array();
    $has = false;

    foreach ($text_nodes as $text_node) {
        $text = $text_node->nodeValue;
        if (trim($text) === '') {
            continue;
        }

        $claimed = array();
        $found = array();
        foreach ($patterns as $i => $pattern) {
            if (!preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            $title = $glossary_data[$i]['title'];
            foreach ($matches[0] as $match) {
                $offset = $match[1];
                $end = $offset + strlen($match[0]);
                foreach ($claimed as $range) {
                    if ($offset < $range[1] && $range[0] < $end) {
                        continue 2;
                    }
                }
                $claimed[] = array($offset, $end);

                if (!isset($used[$title])) {
                    $used[$title] = true;
                    $found[] = array(
                        'term'         => $title,
                        'definition'   => $glossary_data[$i]['definition'],
                        'offset'       => $offset,
                        'length'       => $end - $offset,
                        'matched_text' => $match[0],
                    );
                }
            }
        }

        if (empty($found)) {
            continue;
        }

        // Rebuild the node left to right so the offsets stay meaningful.
        usort($found, function ($a, $b) {
            return $a['offset'] - $b['offset'];
        });

        $parent = $text_node->parentNode;
        $cursor = 0;

        foreach ($found as $match) {
            $before = substr($text, $cursor, $match['offset'] - $cursor);
            if ($before !== '') {
                $parent->insertBefore($dom->createTextNode($before), $text_node);
            }

            $span = $dom->createElement('span');
            $span->setAttribute('class', 'glossary-highlight');
            $span->setAttribute('data-term', $match['term']);
            $span->setAttribute('data-tooltip', $match['definition']);
            $span->appendChild($dom->createTextNode($match['matched_text']));
            $parent->insertBefore($span, $text_node);

            $cursor = $match['offset'] + $match['length'];
            $has = true;
        }

        $after = substr($text, $cursor);
        if ($after !== '') {
            $parent->insertBefore($dom->createTextNode($after), $text_node);
        }

        $parent->removeChild($text_node);
    }

    if (!$has) {
        return array('html' => $content, 'has' => false);
    }

    // Extract the content from the wrapper div.
    $html = '';
    $wrapper = $dom->getElementsByTagName('div')->item(0);
    if ($wrapper) {
        foreach ($wrapper->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }
    }

    return array('html' => $html, 'has' => true);
}
function baseline_glossary_skip_elements() {
    $elements = array(
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'button', 'label', 'summary', 'select', 'option', 'textarea',
        'code', 'pre', 'kbd', 'samp',
        'blockquote', 'figcaption',
        'script', 'style', 'noscript', 'template', 'title', 'svg', 'math', 'iframe', 'object',
    );

    /**
     * Filters the elements whose text the auto-highlighter leaves alone.
     *
     * @param string[] $elements Lower-case element names.
     */
    $elements = apply_filters('acemedia_glossary_skip_elements', $elements);

    return array_values(array_filter(array_map(function ($name) {
        return preg_replace('/[^a-z0-9]/', '', strtolower((string) $name));
    }, (array) $elements)));
}
