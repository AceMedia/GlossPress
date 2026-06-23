import { useState, useEffect, useCallback, useMemo, memo } from '@wordpress/element';
import {
    Button,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption,
    ToggleControl,
    TextareaControl,
    TextControl,
    PanelBody,
    FlexItem,
    Tooltip,
    __experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { PanelColorSettings } from '@wordpress/block-editor';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAlphaDown, faAnchor, faHighlighter, faEye, faBug, faPalette, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { faCss } from '@fortawesome/free-brands-svg-icons';

import { clearLogs as clearLogsAPI } from '../utils';

import { __, sprintf } from '@wordpress/i18n';
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
    onAutoHighlightToggle,
    archiveFeaturesEnabled,
    onArchiveFeaturesToggle,
    archiveSlug,
    archiveSlugError,
    onArchiveSlugChange,
    siteUrl,
    styleSettings,
    onStyleSettingChange,
    styleDefaults,
    colorPalette,
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

    const trimmedSiteUrl = siteUrl ? siteUrl.replace(/\/+$/u, '') : '';
    const archivePreview = `${trimmedSiteUrl}/${archiveSlug || 'glossary'}/`;
    const paletteColors = useMemo(() => (colorPalette && colorPalette.length ? colorPalette : undefined), [colorPalette]);

    return (
        <FlexItem alignItems="flex-start" className="sidebar side-panel">
            <div className="side-panel__inner">

                <div className="side-panel__content">
                <h1>
                    <span className="dashicons dashicons-book-alt"></span>
                    <i>Gloss</i>Press
                </h1>

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

                    <h5>{__('Settings', 'acemedia-glossary')}</h5>

                    {/* Auto Highlight Toggle */}
                    <div 
                        className="components-panel__body is-opened"
                        style={{ marginBottom: '0' }}
                    >
                        <h2 
                            className="components-panel__body-title"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onAutoHighlightToggle(!autoHighlight)}
                        >
                            <button 
                                type="button" 
                                className="components-button components-panel__body-toggle"
                                style={{ 
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAutoHighlightToggle(!autoHighlight);
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FontAwesomeIcon icon={faHighlighter} />
                                    <span>{__('Auto Highlight', 'acemedia-glossary')}</span>
                                    <Tooltip text={__('Controls whether glossary terms are auto-highlighted on the frontend.', 'acemedia-glossary')}>
                                        <FontAwesomeIcon 
                                            icon={faInfoCircle} 
                                            style={{ color: '#888', fontSize: '14px', cursor: 'help' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </Tooltip>
                                </span>
                                <ToggleControl
                                    checked={autoHighlight}
                                    onChange={(value) => {
                                        // This won't trigger due to parent onClick, but keep for accessibility
                                        onAutoHighlightToggle(value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ marginBottom: 0 }}
                                />
                            </button>
                        </h2>
                    </div>

                    <PanelBody
                        className="template-toggle-panel"
                        title={
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <FontAwesomeIcon icon={faEye} />
                                <span style={{ marginLeft: '10px' }}>{__('Archive & Single Templates', 'acemedia-glossary')}</span>
                            </span>
                        }
                        initialOpen={false}
                    >
                        <ToggleControl
                            label={__('Enable plugin archive & single templates', 'acemedia-glossary')}
                            checked={archiveFeaturesEnabled}
                            onChange={(value) => onArchiveFeaturesToggle(value)}
                        />
                        <p className="description">{__('When disabled, the plugin will not apply its archive or single template logic on the frontend.', 'acemedia-glossary')}</p>
                        {archiveFeaturesEnabled && (
                            <div className="glossary-archive-slug">
                                <TextControl
                                    label={__('Archive base slug', 'acemedia-glossary')}
                                    value={archiveSlug}
                                    onChange={onArchiveSlugChange}
                                    placeholder="glossary"
                                    className={archiveSlugError ? 'has-error' : ''}
                                />
                                <p className={`description${archiveSlugError ? ' error' : ''}`}>
                                    {archiveSlugError
                                        ? archiveSlugError
                                        : sprintf(__('Archive URL preview: %s', 'acemedia-glossary'), archivePreview)}
                                </p>
                            </div>
                        )}
                    </PanelBody>

                    <PanelBody
                        className="glossary-style-panel"
                        title={
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <FontAwesomeIcon icon={faPalette} />
                                <span style={{ marginLeft: '10px' }}>{__('Glossary styles', 'acemedia-glossary')}</span>
                            </span>
                        }
                        initialOpen={false}
                    >
                        <p className="description">
                            {__('These colours and spacing apply to every Glossary block on the site.', 'acemedia-glossary')}
                        </p>
                        <PanelColorSettings
                            title={__('Colours', 'acemedia-glossary')}
                            initialOpen={true}
                            colors={paletteColors}
                            colorSettings={[
                                {
                                    value: styleSettings?.textColor || '',
                                    onChange: (value) => onStyleSettingChange('textColor', value || ''),
                                    label: __('Body text colour', 'acemedia-glossary'),
                                },
                                {
                                    value: styleSettings?.headingBackgroundColor || '',
                                    onChange: (value) => onStyleSettingChange('headingBackgroundColor', value || ''),
                                    label: __('Heading background', 'acemedia-glossary'),
                                },
                                {
                                    value: styleSettings?.headingTextColor || '',
                                    onChange: (value) => onStyleSettingChange('headingTextColor', value || ''),
                                    label: __('Heading text colour', 'acemedia-glossary'),
                                },
                                {
                                    value: styleSettings?.cardBackgroundColor || '',
                                    onChange: (value) => onStyleSettingChange('cardBackgroundColor', value || ''),
                                    label: __('Card background', 'acemedia-glossary'),
                                },
                            ]}
                        />

                        <UnitControl
                            label={__('Gap between entries', 'acemedia-glossary')}
                            value={styleSettings?.contentGap || ''}
                            onChange={(value) => onStyleSettingChange('contentGap', value || '')}
                            units={[
                                { value: 'px', label: 'px' },
                                { value: 'rem', label: 'rem' },
                                { value: 'em', label: 'em' },
                                { value: '%', label: '%' },
                            ]}
                            placeholder={styleDefaults?.contentGap || '1.5rem'}
                        />
                        <UnitControl
                            label={__('Heading padding', 'acemedia-glossary')}
                            value={styleSettings?.headingPadding || ''}
                            onChange={(value) => onStyleSettingChange('headingPadding', value || '')}
                            units={[
                                { value: 'px', label: 'px' },
                                { value: 'rem', label: 'rem' },
                                { value: 'em', label: 'em' },
                                { value: '%', label: '%' },
                            ]}
                            placeholder={styleDefaults?.headingPadding || '1.25rem'}
                        />
                    </PanelBody>

                    <div className="side-panel__actions">
                        <div style={{ flex: '1 1 50%' }}>
                            <Button
                                isPrimary={!!customCss}
                                isSecondary={!customCss}
                                onClick={() => setIsCssModalOpen(true)}
                                style={{
                                    textAlign: 'center',
                                    width: '100%',
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
                                    ? __('Edit CSS', 'acemedia-glossary')
                                    : __('Add CSS', 'acemedia-glossary')}
                            </Button>
                        </div>
                        <div style={{ flex: '1 1 50%' }}>
                            <Button
                                isSecondary
                                onClick={handleDownload}
                                disabled={unsavedChanges}
                                style={{
                                    textAlign: 'center',
                                    width: '100%',
                                }}
                            >
                                <span
                                    className="dashicons dashicons-download"
                                    style={{ marginRight: '5px', verticalAlign: 'middle', fontSize: '1.5em' }}
                                ></span>
                                {unsavedChanges
                                    ? __('Save to Download', 'acemedia-glossary')
                                    : __('Download JSON', 'acemedia-glossary')}
                            </Button>
                        </div>
                    </div>

                    {localLogs && (
                        <>
                            <h5>{__('Developer', 'acemedia-glossary')}</h5>
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
                                    onChange={() => {}}
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
                        </>
                    )}
                </div>
            </div>
        </FlexItem>
            );
    });

    export default Sidebar;
