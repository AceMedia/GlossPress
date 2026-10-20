# GlossPress developer guide

GlossPress keeps its existing post type, options, block name and REST paths for compatibility. Version 1.2.2 requires WordPress 6.6 and PHP 7.4. Use an MU plugin for site-specific policy; do not modify the shared plugin.

## Filters

| Filter | Value | Contract |
| --- | --- | --- |
| `acemedia_glossary_schema_term_limit` | integer, default 50 | Maximum priority definitions included in structured data. |
| `acemedia_glossary_highlight_post_types` | array of post-type names | Content types eligible for automatic highlighting. Return the original list plus your additions. |
| `acemedia_glossary_should_highlight` | boolean, `WP_Post` | Further restrict eligible content; receives two arguments. Built-in REST/feed/excerpt restrictions run first. |
| `acemedia_glossary_tooltip_mode` | `components` or `light` | Choose the original WordPress Components renderer or the smaller vanilla renderer. Other values fall back to `components`. |
| `acemedia_glossary_skip_elements` | array of lowercase element names | Elements excluded from automatic highlighting. Preserve existing exclusions when extending. |
| `acemedia_glossary_related_post_types` | array, default `['post']` | Public post types searched for related articles. |

```php
add_filter('acemedia_glossary_highlight_post_types', function ($types) {
    $types[] = 'book_review';
    return array_values(array_unique($types));
});
add_filter('acemedia_glossary_tooltip_mode', function () {
    return 'light';
});
```

## REST and permissions

Legacy custom routes remain under `/wp/v2/glossary` and the existing option routes. These names are retained to avoid breaking saved integrations; new extensions should use their own namespace. Cookie-authenticated requests must use WordPress's REST nonce. Application passwords follow normal WordPress authentication.

Public reads exclude drafts, private and password-protected definitions. An editor may read protected definitions only with the appropriate per-post permission. Writes validate the exact glossary post type and per-post edit/delete permissions. Bidirectional relationships require edit permission on every affected term. Taxonomy writes additionally require the taxonomy's assign capability. Bulk deletion validates every item before deleting any. Site settings, diagnostics, import/export and cleanup remain administrator operations.

Do not treat hidden UI controls as authorisation. Handle `400`, `401`, `403` and `404` responses. Public GET requests do not repair stored metadata. Use the administrator cleanup action for repairs.

## Data and caches

Existing options, glossary metadata and saved block names remain in place. Cache keys include a random term-generation identifier and the plugin version, so same-second writes cannot reuse stale content. Native post/meta/taxonomy hooks invalidate relevant generations. Data is scoped through WordPress's current site; extensions that switch sites must restore the original site afterwards.

The DOM extension enables automatic HTML highlighting. Without it, content remains intact and highlighting is skipped. Related-content matching falls back to ordinary lowercase conversion when mbstring is absent; non-ASCII case matching may therefore differ.

## Contributing

Public issues are welcome. Discuss a proposed patch before sending a pull request; Ace Media maintains official releases and invites contributors. This workflow does not restrict the GPL licence or recipients' rights to modify and redistribute the code. Do not include credentials, private client content or internal agent instructions in contributions.
