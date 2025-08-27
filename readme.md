# GlossPress

**GlossPress** is a WordPress plugin that adds an interactive glossary system to your site. It lets you define glossary terms (with their definitions) and automatically enhances your posts/pages by highlighting those terms with tooltips. GlossPress features a modern React-based admin interface for managing terms, seamless Gutenberg block integration, a handy shortcode, and dynamic front-end tooltips. It’s ideal for creating a glossary, knowledge base, or dictionary of terms to improve content comprehension and user experience.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Using the Glossary Block](#using-the-glossary-block)
  - [Using the Shortcode](#using-the-shortcode)
  - [Automatic Term Highlighting & Tooltips](#automatic-term-highlighting--tooltips)
- [FAQ](#faq)
- [Changelog](#changelog)
- [License](#license)
- [Credits](#credits)

## Features

- **React-Powered Admin Interface:** GlossPress provides an intuitive, single-page admin app (built with React) for managing your glossary terms. You can easily add, edit, or remove terms in a user-friendly interface without page reloads. Terms can include a title (the term) and a detailed definition, with full support for the WordPress block editor for rich formatting.  
- **Custom Post Type for Terms:** Glossary terms are stored as a custom post type (visible in the admin). This means each term is a separate entry on your site, complete with its own title and content. You can assign Categories and Tags to glossary terms for organization and filtering, and even link related terms together (e.g., to suggest “See also” references between terms).  
- **Gutenberg Block Integration:** GlossPress includes a *Glossary* Gutenberg block that you can insert into any page or post. This block automatically displays an alphabetized list of all your glossary terms (or sorted by last update, depending on settings). It’s a quick way to create a dedicated Glossary page or section by simply adding the block, without dealing with shortcodes or custom templates.  
- **Shortcode Support:** For those who prefer shortcodes or are using the Classic Editor, GlossPress provides a `[glossary]` shortcode. Inserting `[glossary]` in your content will embed the glossary list (similar to the block output). The shortcode accepts an optional attribute for sorting (e.g. `[glossary sort="updated"]` to sort terms by their last modified date, or omit it for alphabetical order by default).  
- **Automatic Term Highlighting:** GlossPress can automatically highlight glossary terms throughout your site’s posts and pages. When enabled, the first occurrence of any defined term in your content will be highlighted and underlined. Users can hover over or tap the highlighted term to see a tooltip with the term’s definition. This makes it effortless for readers to get definitions in context without navigating away.  
- **Dynamic Tooltips on Frontend:** The tooltips for highlighted terms are powered by a lightweight front-end script. They appear on hover/focus with the term’s definition (pulled from your glossary) in a clean pop-up style. The design uses WordPress’s built-in components for a consistent look and feel. GlossPress ensures that tooltips only appear for the first instance of a term per page (to prevent overwhelming the content).  
- **REST API Endpoints:** GlossPress exposes REST API endpoints for glossary data, making it developer-friendly. You (or other plugins/apps) can retrieve the list of terms or a specific term’s details via the WordPress REST API (`/wp-json/wp/v2/glossary`). Authorized users (with proper permissions) can also create, update, or delete terms through the API. This opens up possibilities for integration with external applications or headless WordPress setups.  
- **Performance Focus:** The plugin employs caching (transients) for glossary queries and loads its front-end scripts only when necessary (e.g., when a page actually contains the glossary block, shortcode, or highlighted terms). This ensures that GlossPress won’t impact your site’s performance on pages where it’s not in use.  
- **SEO-Friendly Markup:** GlossPress outputs structured data (JSON-LD schema) for each glossary term in the glossary list. This helps search engines recognize definitions on your site, potentially improving SEO for definition or terminology searches.  
- **Fully WordPress Native:** GlossPress is built to WordPress coding standards and uses the native block editor components. It is translation-ready (all text strings can be localized) and follows best practices for a plugin destined for the official WordPress plugin repository.

## Installation

1. **Download & Install:** Install the plugin by uploading the GlossPress plugin files to your WordPress `/wp-content/plugins/` directory, or by using the **Plugins > Add New** screen in your WordPress dashboard and searching for "GlossPress" (once it’s available in the plugin repository).  
2. **Activate the Plugin:** In the **Plugins** screen, find **GlossPress** in the list and click **Activate**. Upon activation, GlossPress will register its custom post type and add its menu to the WordPress admin.  
3. **Initial Setup:** After activation, you’ll notice a new top-level menu item labeled **Glossary** in your WordPress admin (with a book icon). Click this **Glossary** menu to open the GlossPress admin interface. From here you can start adding glossary terms and adjust settings (like enabling auto-highlights). No additional setup is required—by default the plugin is ready to use.  

*Requirements:* GlossPress requires WordPress 5.8 or higher (for block editor support and REST API features). It is compatible with the latest WordPress 6.x releases. Your site should also be running PHP 7.2 or higher (PHP 8+ compatible).

## Usage

Once GlossPress is installed and activated, using it is straightforward. Here’s how to get started:

- **Adding Glossary Terms:** Navigate to **WordPress Admin > Glossary**. In the GlossPress admin screen, you can add a new term by clicking an **“Add Term”** button (or similar prompt). Provide the Term Name (the word or phrase you want to define) and the Term Definition in the editor. You can format the definition using the rich text editor (which supports Gutenberg blocks for images, lists, etc., within the definition). Optionally, assign categories or tags to the term for organization, and mark any related terms (to create cross-links like "See also: ..."). There is also an option to **"Enable Auto-Highlight"** for the term – check this if you want this term to be highlighted automatically in your site’s content. Save or update the term when done. Repeat to build out your glossary with as many terms as needed.

- **Glossary Settings:** Within the Glossary admin interface, you may find global settings such as a toggle to enable/disable the **Auto-Highlight** feature site-wide. If you want glossary terms to be automatically highlighted in your posts/pages, ensure this setting is turned **ON**. (When off, the tooltip highlighting feature is globally disabled, even if individual terms have auto-highlight enabled.) You might also see a field for adding Custom CSS – this allows you to fine-tune the styling of glossary elements (like tooltip appearance or term list styling) directly from the admin. Adjust these settings to your preference.

### Using the Glossary Block

GlossPress provides a custom Gutenberg block called **Glossary** for displaying your terms on the front-end. To use it:

1. **Edit a Page/Post:** Go to any page or post where you’d like to include your glossary of terms (for example, you might create a dedicated "Glossary" page for all terms). Open it in the WordPress block editor (Gutenberg).  
2. **Insert the Glossary Block:** Click the **(+)** add block button and search for "Glossary". You should see a block labeled **Glossary** (often under a suitable category like “Widgets” or you can search by name). Click to add this block to your content.  
3. **Block Settings:** With the Glossary block selected, check the block settings sidebar. GlossPress’s block may allow you to choose a sort order or other display options. For example, you can set the glossary to display terms **Alphabetically** (A-Z) or by **Last Updated**. Choose the order that makes sense for your site (alphabetical is the default).  
4. **Publish/Update:** Save or update your page. On the front-end, that block will now render a list of all your glossary terms. Each term will be listed with its name and a short excerpt of the definition. Users can typically click on a term to expand or view the full definition (depending on how the block is designed to function). The block automatically handles fetching all glossary items and displaying them in the chosen order.

**Tip:** The Glossary block is the easiest way to create a full glossary page. You can place it anywhere in your content and even have an introductory paragraph above it if desired. As you add or edit terms in the admin, the block will always show the up-to-date list of terms.

### Using the Shortcode

If you prefer using a shortcode (for example, if you’re not using the block editor or want to embed the glossary in a Classic Editor context), GlossPress offers the `[glossary]` shortcode.

- **Basic Usage:** Edit the page or post where you want the glossary to appear. In the content, add:  

[glossary]

This will display the glossary list in place of the shortcode when viewed on the site. By default, terms will be listed alphabetically (A to Z).

- **Sorting Option:** You can control the sort order of terms via an attribute. For example:  

[glossary sort="updated"]

will list terms based on their last updated date (most recently modified terms first). The default `sort` value is `"alphabetical"`, which orders terms by title. Currently, the shortcode supports `"alphabetical"` or `"updated"` as options for sorting.

- **Multiple Glossaries:** Typically, the `[glossary]` shortcode will output all glossary terms. You would normally use it once (e.g., on a main Glossary page). If you insert it into multiple pages, each will show the full glossary list. You can use categories or tags to section your glossary on different pages if needed (for instance, create a page that only lists terms of a certain category, and in the future GlossPress may support shortcode parameters for filtering by category/tag).

After adding the shortcode, publish or update your content. On viewing the page, you’ll see the glossary terms list similar to if you used the block. The list is enhanced by the GlossPress front-end script to allow user interactions (like expanding definitions or client-side searching, if provided).

### Automatic Term Highlighting & Tooltips

One of GlossPress’s powerful features is automatically highlighting terms in your regular posts/pages and showing tooltips:

- **Enabling Auto-Highlight:** To use this feature, first enable **Auto-Highlight** in the GlossPress settings (in the Glossary admin screen). This global toggle allows glossary term highlighting throughout your site. By default, this may be off to give you control. Turn it on if you want terms to be highlighted.  
- **Per-Term Control:** When editing or adding a glossary term, you can choose whether that specific term should be auto-highlighted. For each term, there’s a checkbox for "Auto Highlight this Term" (or similar). If checked, that term will be highlighted wherever it appears in your content. If unchecked, the term will not be automatically highlighted (perhaps useful for very common words you don’t want to disturb in text).  
- **How It Works:** Once enabled, GlossPress scans your post content on the front-end (only on individual posts/pages, not on archives or the homepage) for occurrences of your glossary terms. The first time each glossary term appears in the text, it gets wrapped with a special marker (a `<span>` with a class, e.g., `.glossary-highlight`). This also adds a `data-tooltip` attribute containing the term’s definition. The plugin’s front-end script then detects these and creates a tooltip UI. When a visitor hovers over or taps the highlighted term, a tooltip box will appear, showing the definition. This allows readers to get instant explanations of terms without leaving the page.  
- **Design & Behavior:** The highlighted terms are typically styled with a subtle underline or distinct style to indicate to users that they can hover for more info. The tooltips themselves inherit WordPress’s admin style for a clean look, and they are positioned smartly (e.g., above the term, and re-adjust on mobile/touch). By default, each term is highlighted only once per page to avoid repetitive tooltips. If a term is mentioned multiple times in one post, only the first occurrence gets the tooltip, ensuring a cleaner reading experience.  
- **Disabling on Specific Content:** If needed, you can always turn off the global auto-highlight to disable tooltips site-wide. Currently, there isn’t a per-post toggle to disable highlighting on one page (aside from turning off the feature globally), but if you have a specific scenario (like a glossary page itself, where you might not want terms linking to themselves), the tooltips are only added on singular posts/pages and not on the glossary archive or list itself. GlossPress is smart about not interfering with its own glossary listings.  

Using the glossary tooltips can greatly enhance user engagement, especially for educational, technical, or niche content sites where readers might need quick definitions. It’s an optional feature – you can use GlossPress purely to publish a glossary page if you prefer, or enable the auto-highlights for in-context help.

## FAQ

**Q: How do I add a new glossary term?**  
**A:** Go to **Glossary** in your WordPress admin menu and click the “Add Term” button (within the GlossPress interface). Enter the term name and definition. You can also set related terms, categories, tags, and whether the term should be auto-highlighted. Save the term, and it will be added to your glossary.

**Q: Where do the glossary terms appear on my site?**  
**A:** Glossary terms can appear in two ways: (1) If you create a page with the Glossary block or `[glossary]` shortcode, that page will display a list of all terms (each linking to its full definition). (2) If you enable *Automatic Term Highlighting*, glossary terms will also appear as interactive highlights within your normal posts and pages content. In the latter case, readers can hover over the term to see the definition tooltip. Additionally, each glossary term has its own page (like any post) at the `/glossary/<term-slug>` URL (since glossary terms are a public custom post type), though usually you’ll use the Glossary page or tooltips for user navigation rather than directing users to those individual term pages.

**Q: Can I customize the appearance of the glossary list or tooltips?**  
**A:** Yes. The glossary list (when using the block or shortcode) and the tooltips come with default styling that should look good on most themes. If you need to tweak the styles, there are a few options:
- In GlossPress settings, there may be a **Custom CSS** field where you can add your own CSS rules. Any CSS you add there will be loaded with the glossary, allowing you to override styles easily (for example, changing the highlight color or tooltip background).
- You can override styles via your theme’s CSS as well. GlossPress uses identifiable classes such as `.glossary-highlight` for highlighted terms, `.glossary-index` and others for the glossary listing. By adding rules to your theme’s stylesheet or Customizer **Additional CSS**, you can adjust these (e.g., changing the underline style of terms, font sizes in the glossary list, etc.).
- The plugin’s front-end scripts also use WordPress’s UI components, which follow the admin color scheme. So the default tooltip colors might reflect the active admin theme colors. This ensures consistency, but if needed, you can override those too with CSS.

No template overrides are necessary – everything can be styled with CSS. In future updates, more customization options might be added to settings, but for now CSS is the way to go.

**Q: Will using GlossPress slow down my site?**  
**A:** GlossPress is designed with performance in mind. It only loads its front-end scripts and styles on pages where they are needed. For example, the glossary listing script is only enqueued if you have the Glossary block or shortcode on that page. The tooltip script is only loaded if the content actually contains terms to highlight. Additionally, the plugin caches glossary data where possible to reduce database queries. In normal use, you should not notice any performance impact. As with any plugin, if you have an extremely large number of terms (hundreds or thousands), there could be a slight overhead when generating the glossary page or scanning content for highlights, but this is minimized with efficient code and caching. GlossPress has been tested on typical sites to ensure it runs smoothly.

**Q: How are related terms used?**  
**A:** When adding or editing a glossary term, you can select *Related Terms* (linking one term to others). If you establish relationships, GlossPress will display a “See Also” section beneath the term’s definition on the glossary page. For example, if Term A is related to Term B and C, when viewing Term A in the glossary list, it might list B and C as related terms. This helps users discover related concepts. These relationships are bidirectional; if you relate A to B, B will also list A as a related term automatically. It’s a handy way to interlink concepts in your glossary. (Note: related terms currently appear in the glossary list and term pages, but they do not automatically create tooltip links within post content. The auto-highlighting is separate and based on term names, not on the related terms field.)

**Q: Can I import or export my glossary terms?**  
**A:** At the moment, GlossPress does not include a dedicated import/export UI in the plugin settings. However, because glossary terms are just a custom post type (`acemedia_glossary`), you can use WordPress’s built-in **Tools > Export** and **Tools > Import** to move terms between sites. Simply export the “Glossary” post type content from one site and import it to another. We plan on possibly adding a one-click export (e.g., to CSV or JSON) in a future update to make this even easier. Also, developers can retrieve all terms via the REST API in JSON format (at `/wp-json/wp/v2/glossary`), which can serve as a raw export of data if needed.

**Q: Is GlossPress compatible with my theme?**  
**A:** Yes, GlossPress should work with any modern theme. The front-end glossary list is essentially a list of content (with headings and paragraphs) that inherits your theme’s styling for elements like headings (`<h3>` tags for term titles) and lists. The tooltip elements are styled to look good on a wide range of sites and are relatively self-contained in terms of CSS. If your theme has very unique styling, you might want to adjust the custom CSS as noted above, but in most cases it will blend in nicely. The GlossPress admin interface is built with WordPress’s own components, so it looks and works like a natural part of WordPress (it will match the WordPress admin styles).

**Q: What if I uninstall GlossPress?**  
**A:** If you ever decide to deactivate or uninstall GlossPress, your site will simply stop displaying glossary tooltips or the glossary page content (the shortcode will no longer render and the block will show as unsupported). The glossary terms (being a custom post type) will still exist in the database unless you choose to delete them. GlossPress currently doesn’t do an automatic data wipe on uninstall (to protect your content), so if you remove the plugin and want to fully remove glossary terms, you should delete the **Glossary** entries from your WordPress admin (you can bulk delete them via the posts list if you temporarily register the post type in a menu or use a utility plugin). Always make sure to back up your site before removing plugins if you have important data.

**Q: Will GlossPress work with a multilingual site?**  
**A:** GlossPress is built to be translation-ready, meaning you can translate the plugin’s interface and tooltips into your language using standard WordPress localization methods (.pot/.mo files). For multilingual content (e.g., using WPML or Polylang), since glossary terms are a custom post type, you should be able to translate terms like any other content. Auto-highlighting should work based on the term names in each language (you might need separate glossaries per language, depending on how your multilingual plugin handles custom post types). We recommend checking your multilingual plugin’s documentation for handling custom post types. GlossPress doesn’t yet have specific integration code for multilingual setups, but it works with WordPress standards, so compatibility is expected.

## Changelog

**1.0.0 – Initial release:**  
– Introduced the GlossPress plugin with core features: React admin interface, custom post type for glossary terms, Gutenberg block, `[glossary]` shortcode, auto-highlighting tooltips, and REST API support.  

*(Future updates will be documented here, following semantic versioning and detailing new features, improvements, and bug fixes.)*

## License

GlossPress is open-source software licensed under the **GNU General Public License v2.0 or later (GPLv2+)**.  
You are free to use, modify, and distribute this plugin in accordance with the GPL license. There is no warranty for this free software. For the full license text, see the `LICENSE` file included with the plugin or visit [GNU’s official site](https://www.gnu.org/licenses/gpl-2.0.html) for GPL v2 details.

## Credits

**Author:** Shane Rounce (Ace Media)  

GlossPress was developed and is maintained by Shane Rounce of Ace Media.  
Special thanks to the open-source WordPress community – this plugin leverages WordPress’s APIs and Gutenberg components which are the result of community effort. If you find GlossPress helpful, please consider giving feedback or contributing to its future development. Thank you for using GlossPress!