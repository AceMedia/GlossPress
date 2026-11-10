=== GlossPress ===
Contributors: shanerounce
Tags: glossary, definitions, tooltip, dictionary
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.4.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Publish a searchable glossary, highlight definitions in articles and connect related terms.

== Description ==

GlossPress adds a glossary post type, a block and the [glossary] shortcode. Definitions are rendered on the server, with browser enhancements for search, A-to-Z navigation and related articles. Optional highlighting explains terms in your posts without interrupting the text.

Organise definitions with categories, tags and private glossary groups. Control highlighting per term, add synonyms and mark priority terms for structured data. Import and export definitions from the admin interface.

Part of the Ace Media suite: https://acemedia.ninja/ . Hosting: https://acemedia.host/ .

== Installation ==

1. Install and activate the release ZIP.
2. Open Glossary in the WordPress admin area and add your definitions.
3. Add a Glossary block or [glossary] shortcode to a page.
4. Enable highlighting only for the terms and content types you want to explain.

== Frequently Asked Questions ==

= Does it send definitions to an external service? =

No. Glossary content, settings and caches are stored in your WordPress installation.

= Are drafts and private definitions public? =

Public glossary responses, the shortcode and highlighting exclude unpublished and password-protected definitions. Authorised editors can retrieve definitions they are allowed to edit.

= Can I extend it? =

Developer documentation covers highlighting filters, related post types, saved block names and the existing REST API. Public issues are welcome at https://github.com/AceMedia/GlossPress/issues. Please discuss contributions before submitting a pull request; Ace Media maintains official releases and GPL rights remain unchanged.

== Screenshots ==

1. Search a fictional dictionary of impossible things.
2. Edit a definition and connect related terms in the admin interface.

== Changelog ==

= 1.4.1 =
* Works with Ace Crawl Enhancer 1.0.98, which renamed its hooks and functions to acecrawl_, and still with earlier versions. One set of names is used at a time, so nothing runs twice.

= 1.4.0 =
* Thin-term rule: a term with a short definition (under 160 characters by default, filterable with acemedia_glossary_thin_chars) and nothing else on its page (no panels from acemedia_glossary_term_panels and no articles that use it) gets noindex, follow and no canonical, and is left out of the glossary sitemap. It stays in the A to Z and comes back on its own once expanded. Honoured through core (wp_robots, core sitemaps), Ace SEO (ace_seo_force_noindex, ace_seo_canonical, its sitemap tools) and Yoast. The A to Z page is never touched.
* Admin: a Search column and a "Thin: not indexed" view in the term list, a badge on the glossary app's cards, and a count on the settings page.
* Term pages link terms that share a name across sports ("Also a term in snooker: Break (Snooker)").
* Term pages: an editorial header with the term as the heading and the lead beneath, no label above the term by default, and small, consistent corners.

= 1.3.4 =
* Reduced motion: besides the system setting, honour a site's own option (window.aceReducedMotion or html.ace-a11y-reduce-motion) and its ace-a11y:motion event; jumps scroll instantly even when the theme sets smooth scrolling.

= 1.3.3 =
* Related articles: a trailing qualifier such as "(Horse Racing)" is dropped from the search, and both the hyphenated and spaced forms of a term are tried ("each way" and "each-way").

= 1.3.2 =
* Fix: the term page's article loop is recognised by a marker in its query settings (acemediaGlossaryRelated), because core hands the post template block to query_loop_block_query_vars, so the loop now lists articles that use the term instead of the latest posts.
* New filter acemedia_glossary_post_relations_enabled to turn article relations on for every term.
* Ace SEO breadcrumbs (and their BreadcrumbList) include the glossary between Home and the term, as Yoast's already do.
* The articles heading counts real uses (25+ at the search cap) and says "More from the same topics" when it falls back to topics.

= 1.3.1 =
* Term pages lead with the first sentence of the definition and put the rest under "In plain English".
* Related terms show as cards with a one-line definition each.
* A panels filter (acemedia_glossary_term_panels) lets a site add its own sections to term pages.
* New block for the articles heading, with how many articles use the term.
* Yoast breadcrumbs (and their schema) include the glossary between Home and the term.

= 1.3.0 =
* New app layout for the glossary block (layout "app"): a filter rail with search, an A to Z showing a count per letter, topic filters and sorting, kept in the address bar, with the rail as a sheet on phones.
* New term header block for term pages: breadcrumb back to the letter, the term and its definition, topics, related terms and the terms either side.
* Colours in the new layouts come from the theme's palette presets.

= 1.2.2 =
* Enforce per-post permissions for glossary editing, deletion and relationships.
* Remove raw-cookie authentication fallbacks and public read-side metadata changes.
* Protect unpublished and password-protected definitions, including cached responses.
* Validate taxonomy and bulk-operation payloads before writes.
* Preserve valid bidirectional relationships and normal WordPress author permissions.
* Keep cache generations distinct when changes occur in the same second.
* Use block API version 3 and declare tested runtime requirements.
* Replace the incompatible private-API editor dependency with supported WordPress editor components.
* Preserve image insertion and fix REST URLs on plain-permalink installations.

= 1.2.1 =
* Previous release.
