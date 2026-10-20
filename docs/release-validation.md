# Version 1.2.2 release validation

Local candidate checks on 20 October 2026. No public release or production deployment has been performed.

- 29 real WordPress REST permissions, privacy, cache and optional-extension assertions on WordPress 7.1.3/PHP 8.4; 30 on WordPress 6.6/PHP 7.4 (the extra assertion confirms the missing-DOM fallback).
- The same permission suite passed on both sites of a MariaDB multisite network. Four additional response/cache tests verified isolation while switching sites and reusing warmed caches.
- Chromium verified current-version editing, undo/redo, relationship changes, saving and reloading. The minimum-version browser created and reloaded a new definition. Both used actual WordPress core and fictional content.
- Eight REST URL checks cover pretty permalinks, plain permalinks, query parameters and a subdirectory site. Real browser plain-permalink requests passed.
- An authenticated browser POST without its REST nonce returned 401; the same request with the valid nonce returned 200.
- Actual PHP 7.2 and a simulated WordPress 6.5 bootstrap stop before initialisation and register an administrator notice.
- Plugin Check reports zero errors and 47 warnings on the final packaged candidate. The packaged result is retained separately with the candidate.

## Reviewed warnings and remaining dependency notices

The Plugin Check warnings cover 34 legacy global function names retained for compatibility, three style-version recommendations (including inline/core styles), prepared maintenance queries/cache invalidation, bounded glossary taxonomy/meta queries and an opt-in debug logger. These are not a claim that every third-party integration is covered.

The incompatible isolated editor was removed. Compatible nested Babel and colour-parser dependencies were patched. The final production dependency audit has no high or critical findings. Thirteen moderate dependency-tree entries remain rooted in Showdown and UUID, pulled through WordPress build packages. The emitted admin bundle does not contain either package; the WordPress packages are externalised to the installed core scripts. This is a build-tree limitation, not a clean dependency-tree claim. Keep WordPress core updated and recheck the lockfile before publishing.

The replacement editor uses core block components and core media utilities. Arbitrary third-party blocks, every theme and every PHP extension combination have not been exhaustively certified. Automatic highlighting preserves the original HTML when DOM is unavailable; non-ASCII related-term case matching can differ without mbstring.

The final editor package also verifies normal inserter clicks inside the edit modal, native media-library opening and an actual image upload. Popovers render inside the editor modal rather than behind it.
