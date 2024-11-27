import { useState, useEffect, useCallback, memo } from '@wordpress/element';
import {
    Button,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption,
    ToggleControl,
    TextareaControl,
    PanelBody,
    FlexItem,
    Tooltip,
} from '@wordpress/components';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAlphaDown, faAnchor, faTags, faHighlighter, faEye, faBug } from '@fortawesome/free-solid-svg-icons';
import { faCss } from '@fortawesome/free-brands-svg-icons';

import { clearLogs as clearLogsAPI } from '../utils';

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
    displayedTerms,
    setTagFilter,
    setCategoryFilter,
    setTags,
    setCategories,
}) => {
    // State for panel open/close persistence
    const [isSortByPanelOpen, setIsSortByPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isSortByPanelOpen')) ?? true
    );
    const [isAlphaIndexPanelOpen, setIsAlphaIndexPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isAlphaIndexPanelOpen')) ?? true
    );

    // State for tracking logs visibility
    const [localLogs, setLocalLogs] = useState(logs);

    useEffect(() => {
        localStorage.setItem('isSortByPanelOpen', JSON.stringify(isSortByPanelOpen));
    }, [isSortByPanelOpen]);

    useEffect(() => {
        localStorage.setItem('isAlphaIndexPanelOpen', JSON.stringify(isAlphaIndexPanelOpen));
    }, [isAlphaIndexPanelOpen]);

    useEffect(() => {
        setLocalLogs(logs);
    }, [logs]);

    const handleAutoHighlightToggle = () => {
        const newState = !autoHighlight;
        setAutoHighlight(newState);
        saveAutoHighlightOption(newState);
    };

    const handleClearLogs = async () => {
        await clearLogsAPI();
        setLocalLogs(null); // Hide the debugger panel by clearing local logs
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
                    initialOpen={isAlphaIndexPanelOpen}
                    onToggle={() => setIsAlphaIndexPanelOpen((prev) => !prev)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="alpha-index">
                            {'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                                displayedTerms[letter] ? (
                                    <a key={letter} href={`#${letter}`}>{letter}</a>
                                ) : (
                                    <span key={letter}>{letter}</span>
                                )
                            ))}
                        </div>
                    </div>
                </PanelBody>
            );
        }
        return null;
    }, [displayedTerms, sortOption, isAlphaIndexPanelOpen]);

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
                    initialOpen={isSortByPanelOpen}
                    onToggle={() => setIsSortByPanelOpen((prev) => !prev)}
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
                            <ToggleGroupControlOption value="alphabetical" label={__('A-Z', 'acemedia-glossary')} />
                            <ToggleGroupControlOption value="created" label={__('Created', 'acemedia-glossary')} />
                            <ToggleGroupControlOption value="updated" label={__('Updated', 'acemedia-glossary')} />
                        </ToggleGroupControl>
                    </div>
                </PanelBody>

                {renderAlphaIndex()}

                <TagsAndCategoriesFilter
                    tags={tags}
                    setTags={setTags}
                    categories={categories}
                    tagFilter={tagFilter}
                    categoryFilter={categoryFilter}
                    setCategories={setCategories}
                    setTagFilter={setTagFilter}
                    setCategoryFilter={setCategoryFilter}
                />

<PanelBody
    className="auto-highlight-panel"
    
    title={
        <span
            onClick={(e) => {
                e.preventDefault();
                setAutoHighlight(!autoHighlight);
                saveAutoHighlightOption(!autoHighlight);
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
        setAutoHighlight(newState); // Update the state
        saveAutoHighlightOption(newState); // Save the new state
    }}
>
</PanelBody>


                <Button
                    isPrimary={!!customCss}
                    isSecondary={!customCss}
                    onClick={() => setIsCssModalOpen(true)}
                    style={{
                        textAlign: 'center',
                        display: 'block',
                    }}
                >
                    <FontAwesomeIcon
                        icon={faCss}
                        style={{
                            verticalAlign: 'middle',
                            fontSize: '1.5em',
                            marginRight: '5px',
                            color: customCss ? 'white' : 'inherit',
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
                    <span
                        className="dashicons dashicons-download"
                        style={{ marginRight: '5px', verticalAlign: 'middle', fontSize: '1.5em' }}
                    ></span>
                    {unsavedChanges
                        ? __('Save Changes to enable Download', 'acemedia-glossary')
                        : __('Download JSON Backup', 'acemedia-glossary')}
                </Button>

                {localLogs && (
                    <PanelBody
                        className="debugger"
                        title={
                            <span>
                                <FontAwesomeIcon icon={faBug} /> {__('Debugger', 'acemedia-glossary')}
                            </span>
                        }
                        initialOpen={false}
                    >
                        <TextareaControl
                            label={__('Import Logs', 'acemedia-glossary')}
                            value={localLogs}
                            onChange={() => {}} // Read-only
                            rows={10}
                            style={{ fontFamily: 'monospace' }}
                        />
                        <Button isSecondary onClick={fetchLogs} style={{ marginRight: '10px' }}>
                            {__('Refresh Logs', 'acemedia-glossary')}
                        </Button>
                        <Button isDestructive onClick={handleClearLogs}>
                            {__('Clear Logs', 'acemedia-glossary')}
                        </Button>
                    </PanelBody>
                )}
            </div>
        </FlexItem>
    );
});

export default Sidebar;
