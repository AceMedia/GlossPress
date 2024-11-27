import { useState, useEffect, useRef, useCallback, memo } from '@wordpress/element';
import { Button,  
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption, ToggleControl, TextareaControl,  PanelBody,  FlexItem, Tooltip } from '@wordpress/components';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAlphaDown, faAnchor, faTags, faHighlighter, faEye } from '@fortawesome/free-solid-svg-icons';

import { faCss } from '@fortawesome/free-brands-svg-icons';


import { __ } from '@wordpress/i18n';
import TagsAndCategoriesFilter from './TagsAndCategoriesFilter';
import SearchComponent from './SearchComponent';

const Sidebar = memo(({
    tags,
    categories,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    tagFilter,
    categoryFilter,
    autoHighlight,
    setAutoHighlight,
    saveAutoHighlightOption,
    customCss,
    setIsCssModalOpen,
    handleDownload,
    unsavedChanges,
    logs,
    fetchLogs,
    clearLogs,
    displayedTerms, 
    setTagFilter,
    setCategoryFilter,
    setTags
}) => {


    const handleAutoHighlightToggle = () => {
        const newState = !autoHighlight;
        setAutoHighlight(newState);
        saveAutoHighlightOption(newState);
    };
  

    const handleTagChange = (selectedTag) => {
        setTagFilter((prev) => {
            if (selectedTag === 'all_tags') {
                return []; // Reset to all tags
            }
            if (prev.includes(selectedTag)) {
                return prev.filter((tag) => tag !== selectedTag); // Remove tag if already selected
            }
            return [...prev, selectedTag]; // Add tag
        });
    };

    const handleCategoryChange = (selectedCategory) => {
        setCategoryFilter((prev) => {
            if (prev.includes(selectedCategory)) {
                return prev.filter((cat) => cat !== selectedCategory); // Remove if already selected
            }
            return [...prev, selectedCategory]; // Add category
        });
    };

    const renderAlphaIndex = useCallback(() => {
        if (sortOption === 'alphabetical') {
            return (
                <PanelBody 
                    title={
                        <span>
                            <FontAwesomeIcon icon={faAnchor} /> {__('Index', 'acemedia-glossary')}
                        </span>
                    } 
                    initialOpen={true}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="alpha-index">
                            {'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                                displayedTerms[letter] ? <a key={letter} href={`#${letter}`}>{letter}</a> : <span key={letter}>{letter}</span>
                            ))}
                        </div>
                    </div>
                </PanelBody>
            );
        }
        return null;
    }, [displayedTerms, sortOption]);

    return (
        <FlexItem alignItems="flex-start" className="sidebar side-panel" style={{ flex: '0 0 300px', paddingRight: '20px' }}>
        <h1>
<span className="dashicons dashicons-book-alt"></span>
<i>Gloss</i>Press
</h1>

<div style={{ display: 'flex', flexDirection: 'column', gap: '1em', position: 'sticky', top: 'calc(32px + 1em)' }}>
            <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />




            <PanelBody 
title={
<span>
    <FontAwesomeIcon icon={faSortAlphaDown} /> {__('Sort by', 'acemedia-glossary')}
</span>
} 
initialOpen={true}
>
<div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
<ToggleGroupControl
    label={__('Sort by', 'acemedia-glossary')}
    value={sortOption}
    onChange={setSortOption}
    defaultValue="alphabetical"
    isBlock
    __nextHasNoMarginBottom
>
    <ToggleGroupControlOption 
        value="alphabetical" 
        label={__('A-Z', 'acemedia-glossary')}
    />
    <ToggleGroupControlOption 
        value="created" 
        label={__('Created', 'acemedia-glossary')}
    />
    <ToggleGroupControlOption 
        value="updated" 
        label={__('Updated', 'acemedia-glossary')}
    />
</ToggleGroupControl>
</div>
</PanelBody>





{renderAlphaIndex()}


<TagsAndCategoriesFilter
    tags={tags}
    setTags={setTags} // Pass the state updater function
    categories={categories}
    tagFilter={tagFilter}
    handleTagChange={handleTagChange}
    categoryFilter={categoryFilter}
    handleCategoryChange={handleCategoryChange}
/>








<PanelBody
className="auto-highlight-panel"
title={
<span
    onClick={(e) => {
        e.preventDefault(); // Prevent default click behavior
        setAutoHighlight(!autoHighlight); // Toggle the state
        saveAutoHighlightOption(!autoHighlight); // Save the new state
    }}
    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
>
    <FontAwesomeIcon icon={faHighlighter} />
    <span style={{ marginLeft: '10px' }}>Auto Highlight</span>
    <ToggleControl
                        checked={autoHighlight}
                        onChange={handleAutoHighlightToggle}
                    />
</span>
}
initialOpen={false}
onToggle={() => {
const newState = !autoHighlight;
setAutoHighlight(newState); // Update state
saveAutoHighlightOption(newState); // Save to wp_option
}}
>
</PanelBody>

<Button
isPrimary={!!customCss} // Set primary if custom CSS exists
isSecondary={!customCss} // Set secondary otherwise
onClick={() => setIsCssModalOpen(true)}
style={{
 textAlign: 'center', display: 'block'
}}
>
<FontAwesomeIcon 
icon={faCss} 
style={{ 
    verticalAlign: 'middle', 
    fontSize: '1.5em', 
    marginRight: '5px',
    color: customCss ? 'white' : 'inherit' // Set color to white if custom CSS exists
}} 
/>
{customCss
? __('Edit Custom CSS', 'acemedia-glossary')
: __('Add Custom CSS', 'acemedia-glossary')}
</Button>


<Button
isSecondary
onClick={handleDownload}
disabled={unsavedChanges}
style={{ textAlign: 'center', display: 'block' }}
>
<span className="dashicons dashicons-download" style={{ marginRight: '5px', verticalAlign: 'middle', fontSize: '1.5em' }}></span>
{unsavedChanges
? __('Save Changes to enable Download', 'acemedia-glossary')
: __('Download JSON Backup', 'acemedia-glossary')}
</Button>

{logs && (
<PanelBody className="debugger" title={__('Debug Logs', 'acemedia-glossary')} initialOpen={false}>
<TextareaControl
    label={__('Import Logs', 'acemedia-glossary')}
    value={logs}
    onChange={() => {}} // Make read-only
    rows={10}
    style={{ fontFamily: 'monospace' }}
/>
<Button isSecondary onClick={fetchLogs} style={{ marginRight: '10px' }}>
    {__('Refresh Logs', 'acemedia-glossary')}
</Button>
<Button isDestructive onClick={clearLogs}>
    {__('Clear Logs', 'acemedia-glossary')}
</Button>
</PanelBody>
)}


            </div>
        </FlexItem>
    );
});

export default Sidebar;