=== GlossPress ===
Contributors: shanerounce
Tags: glossary, definitions, tooltip, dictionary
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.2.2
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
