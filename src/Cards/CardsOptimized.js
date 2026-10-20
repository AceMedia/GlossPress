import React from 'react';
import { useState, useEffect, useRef, useCallback, memo, useMemo } from '@wordpress/element';
import { FlexBlock, Card, CardHeader, CardBody, TextControl, ToggleControl, PanelRow, Tooltip, IconButton, Flex, Spinner } from '@wordpress/components';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faClock, faEdit, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { decodeHTMLEntities, formatRelativeTime, smoothScrollTo } from '../utils';
import RelatedTagsAndCatsOptimized from './RelatedTagsAndCatsOptimized';
import BlockEditor from '../components/BlockEditor';

// Debounce utility function
function debounce(func, wait) {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function to debounce');
    }
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const CardsOptimized = ({
    displayedTerms,
    terms,
    activeTerm,
    setActiveTerm,
    categories,
    tags,
    quickEdit,
    selectedTerms,
    setSelectedTerms,
    sortOption,
    setTerms,
    modifiedTerms,
    setModifiedTerms,
    setUnsavedChanges,
    loadTime,
    setQuickEdit,
    setMessage,
    setIsSaving,
    isSaving,
    isAutoSaveEnabled,
    isLoadingTerm,
    loadSingleTerm,
    closeActiveTerm,
    updateActiveTerm,
    updateActiveTermTitle,
    removeTerm,
    prefetchedCategories,
    prefetchedTags,
    relatedTermsLookup,
    hasMorePrefetchedCategories,
    hasMorePrefetchedTags,
    globalAutoHighlightEnabled,
    registerEditorTextarea
}) => {
    const editorRef = useRef(null);
    const lastEditorContentRef = useRef('');
    const activeTermIdRef = useRef(null);
    const updateActiveTermRef = useRef(updateActiveTerm);
    const termRefs = useRef({});
    const focusedTermIdRef = useRef(null);
    const focusedFieldRef = useRef(null);
    const modifiedTermsRef = useRef(modifiedTerms);
    
    // Local state for block editor content
    const [localEditorContent, setLocalEditorContent] = useState('');
    const contentLoadedForTermRef = useRef(null);
    const isEditingRef = useRef(false);
    const editorTextareaRef = useRef(null); // Will hold reference to BlockEditor's hidden textarea

    useEffect(() => {
        updateActiveTermRef.current = updateActiveTerm;
    }, [updateActiveTerm]);

    useEffect(() => {
        modifiedTermsRef.current = modifiedTerms;
    }, [modifiedTerms]);

    useEffect(() => {
        return () => {
            registerEditorTextarea?.(null);
        };
    }, [registerEditorTextarea]);

    useEffect(() => {
        const termId = activeTerm?.id || null;
        const content = activeTerm?.content || '';
        const prevTermId = activeTermIdRef.current;
        const prevContent = lastEditorContentRef.current;

        ;

        // Term changed OR content loaded after term opened
        const termChanged = prevTermId !== termId && activeTerm?.isOpen;
        const contentArrived = termId === prevTermId && !prevContent && content && activeTerm?.isOpen;
        
        ;
        
        // Reset editing flag when term changes OR when fresh content arrives from API
        if (termChanged || contentArrived) {
            isEditingRef.current = false;
        }
        
        if ((termChanged || contentArrived) && !isEditingRef.current) {
            ;
            setLocalEditorContent(content);
            contentLoadedForTermRef.current = termId;
            
            // Update the textarea if we have a reference to it
            if (editorTextareaRef.current) {
                editorTextareaRef.current.value = content;
                registerEditorTextarea?.(editorTextareaRef.current);
            }
        }
        
        activeTermIdRef.current = termId;
        lastEditorContentRef.current = content;

        if (editorRef.current) {
            editorRef.current.value = content;
        }

        if (!termId) {
            editorTextareaRef.current = null;
            registerEditorTextarea?.(null);
        }
    }, [activeTerm?.id, activeTerm?.content, activeTerm?.isOpen, registerEditorTextarea]);

    // Handle title change - update parent immediately (but memo will prevent full re-renders)
    const handleTitleChange = useCallback((value) => {
        if (!activeTerm) return;
        updateActiveTerm('title', value);
    }, [activeTerm, updateActiveTerm]);
    
    // Track when editor is focused to mark term as edited
    const handleEditorFocus = useCallback(() => {
        if (activeTerm) {
            isEditingRef.current = true;
            setModifiedTerms(prev => {
                if (prev.has(activeTerm.id)) {
                    return prev;
                }
                const newSet = new Set(prev);
                newSet.add(activeTerm.id);
                return newSet;
            });
            setUnsavedChanges(true);
        }
    }, [activeTerm, setModifiedTerms, setUnsavedChanges]);
    
    // Store content updates locally WITHOUT syncing to parent (to avoid re-renders)
    const handleEditorContentUpdate = useCallback((content, textareaRef) => {
        ;
        ;
        ;
        isEditingRef.current = true;
        
        // Store the textarea ref so we can read from it later
        if (textareaRef) {
            editorTextareaRef.current = textareaRef;
            registerEditorTextarea?.(textareaRef);
        }
        
        // Update state for re-renders, but don't rely on it for saving
        setLocalEditorContent(content);
        
        // Persist draft content so switching terms retains unsaved edits.
        if (activeTermIdRef.current && typeof updateActiveTermRef.current === 'function') {
            updateActiveTermRef.current('content', content);
        }
    }, [registerEditorTextarea]);
    
    // Sync local content to parent only when saving
    useEffect(() => {
        if (isSaving && activeTerm) {
            // Read directly from textarea (like blocks-everywhere does)
            const contentToSave = editorTextareaRef.current?.value || localEditorContent;
            
            ;
            ;
            ;
            ;
            ;
            updateActiveTerm('content', contentToSave);
        }
    }, [isSaving, activeTerm, updateActiveTerm, localEditorContent]);
    
    // Reset editing flag after save completes
    useEffect(() => {
        if (!isSaving) {
            isEditingRef.current = false;
        }
    }, [isSaving]);

    // Toggle term open/close with instant loading placeholder
    const toggleTermOpen = useCallback(async (termId) => {
        // Check if this term is already active and open
        if (activeTerm && activeTerm.id === termId && activeTerm.isOpen) {
            closeActiveTerm();
            return;
        }

        // Close any currently open term first (instant)
        if (activeTerm) {
            closeActiveTerm();
        }

        // Check if this term has unsaved changes
        const hasUnsavedChanges = modifiedTerms.has(termId);

        // Update terms list to show this term as open
        setTerms(prevTerms => 
            prevTerms.map(term => ({
                ...term,
                isOpen: term.id === termId
            }))
        );
        
        // Scroll to the term
        if (termRefs.current[termId]) {
            termRefs.current[termId].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }

        // Load the full term data immediately (await the API call)
        try {
            await loadSingleTerm(termId);
        } catch (error) {
            console.error('Error loading term:', error);
            setMessage('Failed to load term data');
            setTimeout(() => setMessage(''), 3000);
        }
    }, [activeTerm, loadSingleTerm, closeActiveTerm, setMessage, terms, setActiveTerm, setTerms, modifiedTerms]);

    // Calculate visible count
    const visibleCount = Object.keys(displayedTerms).reduce((count, key) => {
        return count + displayedTerms[key].length;
    }, 0);

    const totalCount = terms.length;

    return (
        <FlexBlock className="terms-list" style={{ flex: '1' }}>
            {/* Header with stats and controls */}
            <div className="currently-viewing" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Tooltip text={`${visibleCount} of ${totalCount} terms visible`}>
                        <span className="pill">
                            <FontAwesomeIcon icon={faEye} style={{ marginRight: '5px' }} />
                            {`${visibleCount} of ${totalCount}`}
                        </span>
                    </Tooltip>
                    {loadTime && (
                        <Tooltip text={`${Math.round(loadTime)}ms response time for the current view`}>
                            <span className="pill">
                                <FontAwesomeIcon icon={faClock} style={{ marginRight: '5px' }} />
                                {Math.round(loadTime)}ms
                            </span>
                        </Tooltip>
                    )}
                </div>

                {totalCount > 0 && (
                    <Flex className="bulk-actions" style={{ alignItems: 'center', gap: '10px' }}>
                        {quickEdit === 'true' && (
                            <Flex className="bulk-actions-select" style={{ alignItems: 'center', gap: '10px' }}>
                                <FontAwesomeIcon icon={faCheckDouble} />
                                <ToggleControl
                                    label={__('Select All', 'acemedia-glossary')}
                                    checked={Object.keys(displayedTerms).every((group) =>
                                        displayedTerms[group].every((term) => selectedTerms.includes(term.id))
                                    )}
                                    onChange={(isChecked) => {
                                        const visibleTermIds = Object.keys(displayedTerms)
                                            .flatMap((group) => displayedTerms[group].map((term) => term.id));
                                        setSelectedTerms(isChecked ? visibleTermIds : []);
                                    }}
                                />
                            </Flex>
                        )}

                        <Flex className="bulk-actions-toggle" style={{ alignItems: 'center', gap: '10px' }}>
                            <FontAwesomeIcon icon={faEdit} />
                            <ToggleControl
                                label={__('Bulk Edit', 'acemedia-glossary')}
                                checked={quickEdit === 'true'}
                                onChange={(isChecked) => {
                                    setQuickEdit(isChecked ? 'true' : 'false');
                                    if (!isChecked) setSelectedTerms([]);
                                }}
                                disabled={totalCount === 0}
                            />
                        </Flex>
                    </Flex>
                )}
            </div>

            {/* Summary Cards */}
            {Object.keys(displayedTerms).sort().map(group => (
                <FlexBlock style={{ display: 'grid', gap: '1em', flex: 'initial' }} key={group} id={group}>
                    {sortOption === 'alphabetical' && <h3 className='group-title'>{group}</h3>}
                    {displayedTerms[group].map((term) => (
                        <Card
                            key={term.id}
                            className={`glossary-term-card ${quickEdit === 'true' ? 'editing' : ''} ${activeTerm && activeTerm.id === term.id ? 'active expanded' : ''}`}
                            data-term-id={term.id}
                            ref={el => termRefs.current[term.id] = el}
                        >
                            <CardHeader
                                onClick={(event) => {
                                    if (quickEdit === 'true') {
                                        if (event.target.type !== 'checkbox') {
                                            setSelectedTerms((prev) => {
                                                if (prev.includes(term.id)) {
                                                    return prev.filter((id) => id !== term.id);
                                                }
                                                return [...prev, term.id];
                                            });
                                        }
                                    } else {
                                        toggleTermOpen(term.id);
                                    }
                                }}
                                style={{ 
                                    cursor: 'pointer',
                                    borderLeft: modifiedTerms.has(term.id) ? '4px solid #46b450' : 'none',
                                    paddingLeft: modifiedTerms.has(term.id) ? '12px' : '16px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <h2 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {decodeHTMLEntities(term.title) || __('New Term', 'acemedia-glossary')}
                                            </h2>
                                            {term.autoHighlight && (
                                                <Tooltip
                                                    text={globalAutoHighlightEnabled
                                                        ? __('Auto-highlight enabled', 'acemedia-glossary')
                                                        : __('Disabled by main toggle', 'acemedia-glossary')}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            background: globalAutoHighlightEnabled ? '#007cba' : '#d6d6d6',
                                                            color: globalAutoHighlightEnabled ? '#fff' : '#555',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            fontWeight: 'bold',
                                                            opacity: globalAutoHighlightEnabled ? 1 : 0.7,
                                                        }}
                                                    >
                                                        AUTO
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {term.enablePostRelations && (
                                                <Tooltip
                                                    text={__('Related posts enabled', 'acemedia-glossary')}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            background: '#46b450',
                                                            color: '#fff',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        RELATED
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {term.priority && (
                                                <Tooltip
                                                    text={__('Priority term: listed in structured data', 'acemedia-glossary')}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            background: '#1e1e1e',
                                                            color: '#fff',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        PRIORITY
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                            <Tooltip text={`Created at ${new Date(term.date).toLocaleString()}`}>
                                                <span className="meta-pill">
                                                    <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px' }} />
                                                    {formatRelativeTime(term.date)}
                                                </span>
                                            </Tooltip>
                                            <Tooltip text={`Last updated at ${new Date(term.modified).toLocaleString()}`}>
                                                <span className="meta-pill">
                                                    <FontAwesomeIcon icon={faEdit} style={{ marginRight: '4px' }} />
                                                    {formatRelativeTime(term.modified)}
                                                </span>
                                            </Tooltip>
                                        </div>

                                        {activeTerm && activeTerm.id === term.id && activeTerm.isLoading && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#666' }}>
                                                <Spinner style={{ width: '16px', height: '16px' }} />
                                                <span>Loading...</span>
                                            </div>
                                        )}

                                        {quickEdit === 'true' && (
                                            <ToggleControl
                                                checked={selectedTerms.includes(term.id)}
                                                onChange={(isChecked) => {
                                                    setSelectedTerms((prev) =>
                                                        isChecked ? [...prev, term.id] : prev.filter((id) => id !== term.id)
                                                    );
                                                }}
                                                className="bulk-select-toggle right"
                                                __nextHasNoMarginBottom
                                            />
                                        )}

                                        {activeTerm && activeTerm.id === term.id && (
                                            <IconButton
                                                icon="no-alt"
                                                label={__('Close', 'acemedia-glossary')}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    closeActiveTerm();
                                                }}
                                                style={{ color: '#666' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            
                            {/* Expanded editing interface - shows inline within the card */}
                            {activeTerm && activeTerm.id === term.id && activeTerm.isOpen && (
                                <CardBody style={{ borderTop: '1px solid #ddd', background: '#f9f9f9' }}>
                                    {/* Always show the form immediately, no loading screen */}
                                    <TextControl
                                        label={__('Term Title', 'acemedia-glossary')}
                                        value={decodeHTMLEntities(activeTerm.title)}
                                        onChange={handleTitleChange}
                                        placeholder={__('Enter term title...', 'acemedia-glossary')}
                                    />

                                    <div className="glossary-editor-container" key={`editor-container-${activeTerm.id}`}>
                                        <label className="term-content-label">
                                            {__('Content', 'acemedia-glossary')}
                                        </label>
                                        {activeTerm.isLoading ? (
                                            <div className="editor-loading-state">
                                                <Spinner />
                                                <span>{__('Loading term content...', 'acemedia-glossary')}</span>
                                            </div>
                                        ) : (
                                            <BlockEditor
                                                key={`block-editor-${activeTerm.id}`}
                                                termId={activeTerm.id}
                                                content={activeTerm.content || ''}
                                                onChange={handleEditorContentUpdate}
                                                onFocus={handleEditorFocus}
                                            />
                                        )}
                                    </div>

                                    <div className="term-toggle-grid">
                                        <PanelRow>
                                            <ToggleControl
                                                label={__('Auto-highlight this term', 'acemedia-glossary')}
                                                help={globalAutoHighlightEnabled
                                                    ? __('When enabled, this term will be automatically highlighted with tooltips in your content.', 'acemedia-glossary')
                                                    : __('Main auto highlight toggle is off, so highlights are paused.', 'acemedia-glossary')}
                                                checked={activeTerm.autoHighlight || false}
                                                onChange={(value) => updateActiveTerm('autoHighlight', value)}
                                                disabled={activeTerm.isLoading}
                                            />
                                        </PanelRow>

                                        <PanelRow>
                                            <ToggleControl
                                                label={__('Enable post relations', 'acemedia-glossary')}
                                                help={__('When enabled, this term will show related posts and appear in post relation searches.', 'acemedia-glossary')}
                                                checked={activeTerm.enablePostRelations || false}
                                                onChange={(value) => updateActiveTerm('enablePostRelations', value)}
                                                disabled={activeTerm.isLoading}
                                            />
                                        </PanelRow>

                                        <PanelRow>
                                            <ToggleControl
                                                label={__('Priority term', 'acemedia-glossary')}
                                                help={__('Priority terms are listed in the page\'s structured data (DefinedTermSet), up to 50. Every definition is always in the page HTML either way.', 'acemedia-glossary')}
                                                checked={activeTerm.priority || false}
                                                onChange={(value) => updateActiveTerm('priority', value)}
                                                disabled={activeTerm.isLoading}
                                            />
                                        </PanelRow>
                                    </div>

                                    <RelatedTagsAndCatsOptimized
                                        term={activeTerm}
                                        isAutoSaveEnabled={isAutoSaveEnabled}
                                        isSaving={isSaving}
                                        setMessage={setMessage}
                                        updateActiveTerm={updateActiveTerm}
                                        prefetchedCategories={prefetchedCategories}
                                        prefetchedTags={prefetchedTags}
                                        relatedTermsLookup={relatedTermsLookup}
                                        hasMorePrefetchedCategories={hasMorePrefetchedCategories}
                                        hasMorePrefetchedTags={hasMorePrefetchedTags}
                                    />

                                    <PanelRow style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                                        <IconButton
                                            icon="trash"
                                            label={__('Delete Term', 'acemedia-glossary')}
                                            onClick={() => {
                                                if (confirm(__('Are you sure you want to delete this term?', 'acemedia-glossary'))) {
                                                    removeTerm(activeTerm.id);
                                                }
                                            }}
                                            style={{ color: 'red' }}
                                            disabled={activeTerm.isLoading}
                                        />
                                    </PanelRow>
                                </CardBody>
                            )}
                        </Card>
                    ))}
                </FlexBlock>
            ))}
        </FlexBlock>
    );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    // If terms list changed, re-render
    if (prevProps.terms !== nextProps.terms) return false;
    
    // If displayedTerms changed, re-render
    if (prevProps.displayedTerms !== nextProps.displayedTerms) return false;
    
    // If activeTerm changed in any way, we need to re-render to update inputs
    if (prevProps.activeTerm !== nextProps.activeTerm) return false;
    
    // If modifiedTerms Set reference is the same, no need to check contents
    if (prevProps.modifiedTerms !== nextProps.modifiedTerms) {
        // Different Set object, check if the contents are actually different
        if (prevProps.modifiedTerms.size !== nextProps.modifiedTerms.size) return false;
        for (const id of nextProps.modifiedTerms) {
            if (!prevProps.modifiedTerms.has(id)) return false;
        }
    }
    
    // Other props that should trigger re-render
    if (prevProps.quickEdit !== nextProps.quickEdit) return false;
    if (prevProps.sortOption !== nextProps.sortOption) return false;
    if (prevProps.isLoadingTerm !== nextProps.isLoadingTerm) return false;
    if (prevProps.isSaving !== nextProps.isSaving) return false;
    if (prevProps.loadTime !== nextProps.loadTime) return false;
    if (prevProps.globalAutoHighlightEnabled !== nextProps.globalAutoHighlightEnabled) return false;
    if (prevProps.registerEditorTextarea !== nextProps.registerEditorTextarea) return false;
    
    // selectedTerms array
    if (prevProps.selectedTerms.length !== nextProps.selectedTerms.length) return false;
    if (prevProps.selectedTerms.some((id, i) => id !== nextProps.selectedTerms[i])) return false;
    
    // All other props are functions or stable values, don't need to compare
    return true; // Props are equal, skip re-render
};

export default memo(CardsOptimized, arePropsEqual);
