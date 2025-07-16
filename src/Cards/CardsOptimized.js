import React from 'react';
import { useState, useEffect, useRef, useCallback, memo, useMemo } from '@wordpress/element';
import { FlexBlock, Card, CardHeader, CardBody, TextControl, ToggleControl, TextareaControl, PanelRow, Tooltip, IconButton, Flex, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faClock, faEdit, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { decodeHTMLEntities, formatRelativeTime, smoothScrollTo } from '../utils';
import RelatedTagsAndCatsOptimized from './RelatedTagsAndCatsOptimized';

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
    hasMorePrefetchedTags
}) => {
    const editorRef = useRef(null);
    const activeEditor = useRef(null);
    const termRefs = useRef({});
    const focusedTermIdRef = useRef(null);
    const focusedFieldRef = useRef(null);

    // Create debounced title update function for immediate UI response
    const debouncedTitleUpdate = useMemo(() => 
        debounce((title) => {
            updateActiveTermTitle(title);
        }, 150), // Very short debounce for title sync
    [updateActiveTermTitle]);

    // Immediate title update for instant UI feedback
    const handleTitleChange = useCallback((value) => {
        // Update UI immediately for responsive typing
        if (activeTerm) {
            setActiveTerm(prev => ({ ...prev, title: value }));
        }
        // Debounced sync to terms list
        debouncedTitleUpdate(value);
    }, [activeTerm, setActiveTerm, debouncedTitleUpdate]);

    // Add editor functionality
    const attachEditor = useCallback((term) => {
        if (!editorRef.current || activeEditor.current?.id === term.id) return;

        if (activeEditor.current?.instance) {
            activeEditor.current.instance.destroy();
        }

        // Wait a bit for the content to be loaded and DOM to be ready
        setTimeout(() => {
            if (!editorRef.current) return;
            
            const editorInstance = wp.attachEditor(editorRef.current, {
                value: term.content || '',
                onSaveContent: (content) => {
                    console.log('Editor onSaveContent called with:', content);
                    updateActiveTerm('content', content);
                },
                onChange: (content) => {
                    console.log('Editor onChange called with:', content);
                    updateActiveTerm('content', content);
                },
                onLoad: (parse) => {
                    console.log('Editor loaded');
                    // Force set content when editor loads to ensure it's displayed
                    if (term.content && editorInstance?.instance?.tinymce) {
                        editorInstance.instance.tinymce.setContent(term.content);
                    }
                },
                onError: (error) => {
                    console.error('Editor error:', error);
                },
            });

            // Also listen for TinyMCE events directly
            if (editorInstance?.instance?.tinymce) {
                editorInstance.instance.tinymce.on('input change keyup', function() {
                    const content = editorInstance.instance.tinymce.getContent();
                    updateActiveTerm('content', content);
                });
            }

            activeEditor.current = { id: term.id, instance: editorInstance };
        }, 100);
    }, [updateActiveTerm]);

    // Attach editor when active term changes or when content loads
    useEffect(() => {
        if (activeTerm && activeTerm.isOpen && activeTerm.isLoaded) {
            attachEditor(activeTerm);
        }

        return () => {
            if (activeEditor.current?.instance) {
                activeEditor.current.instance.destroy();
                activeEditor.current = null;
            }
        };
    }, [activeTerm, attachEditor]);

    // Cleanup function for editor management
    useEffect(() => {
        return () => {
            if (activeEditor.current?.instance) {
                activeEditor.current.instance.destroy();
                activeEditor.current = null;
            }
        };
    }, []);

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

        // Find the basic term data from the terms list for instant display
        const basicTermData = terms.find(term => term.id === termId);
        if (basicTermData) {
            // Show placeholder immediately with basic data - no loading state initially
            const placeholderTerm = {
                ...basicTermData,
                content: '', // Will be loaded
                relatedTerms: [],
                categories: [],
                tags: [],
                isOpen: true,
                isLoaded: false,
                isLoading: false // Start without loading state for instant UI
            };
            
            // Set the placeholder immediately for instant feedback
            setActiveTerm(placeholderTerm);
            
            // Update terms list to show this term as open (synchronously)
            setTerms(prevTerms => 
                prevTerms.map(term => ({
                    ...term,
                    isOpen: term.id === termId
                }))
            );
            
            // Immediately scroll to the term (no delay)
            if (termRefs.current[termId]) {
                termRefs.current[termId].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }

        // Load the full term data in the background (async)
        setTimeout(async () => {
            try {
                // Only show loading if it takes longer than expected
                const loadingTimer = setTimeout(() => {
                    setActiveTerm(prev => prev && prev.id === termId ? { ...prev, isLoading: true } : prev);
                }, 200); // Only show loading after 200ms

                await loadSingleTerm(termId);
                
                clearTimeout(loadingTimer);
            } catch (error) {
                console.error('Error loading term:', error);
                setMessage('Failed to load term data');
                setTimeout(() => setMessage(''), 3000);
            }
        }, 0); // Start loading immediately but non-blocking

        // Cleanup the editor instance if needed
        if (activeEditor.current?.instance) {
            activeEditor.current.instance.destroy();
            activeEditor.current = null;
        }
    }, [activeTerm, loadSingleTerm, closeActiveTerm, setMessage, terms, setActiveTerm, setTerms]);

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
                                        // Bulk edit mode
                                        if (event.target.type !== 'checkbox') {
                                            setSelectedTerms((prev) => {
                                                if (prev.includes(term.id)) {
                                                    return prev.filter((id) => id !== term.id);
                                                } else {
                                                    return [...prev, term.id];
                                                }
                                            });
                                        }
                                    } else {
                                        // Normal mode - load term details
                                        toggleTermOpen(term.id);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {quickEdit === 'true' && (
                                    <ToggleControl
                                        checked={selectedTerms.includes(term.id)}
                                        onChange={(isChecked) => {
                                            setSelectedTerms((prev) =>
                                                isChecked ? [...prev, term.id] : prev.filter((id) => id !== term.id)
                                            );
                                        }}
                                        className="bulk-select-toggle"
                                    />
                                )}
                                
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <div>
                                            <h2>{decodeHTMLEntities(term.title) || __('New Term', 'acemedia-glossary')}</h2>
                                            <div className="updated-times" style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '.5em' }}>
                                                <Tooltip text={`Created at ${new Date(term.date).toLocaleDateString()}`}>
                                                    <p><strong>Created:</strong> {formatRelativeTime(term.date)}</p>
                                                </Tooltip>
                                                <Tooltip text={`Last edited at ${new Date(term.modified).toLocaleDateString()}`}>
                                                    <p><strong>Updated:</strong> {formatRelativeTime(term.modified)}</p>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {/* Subtle loading indicator only when actually loading */}
                                            {activeTerm && activeTerm.id === term.id && activeTerm.isLoading && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#666' }}>
                                                    <Spinner style={{ width: '16px', height: '16px' }} />
                                                    <span>Loading...</span>
                                                </div>
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

                                    <TextareaControl
                                        ref={(el) => {
                                            if (el) {
                                                editorRef.current = el;
                                                // Force update value when content loads
                                                if (activeTerm?.content && el.value !== activeTerm.content) {
                                                    el.value = activeTerm.content;
                                                }
                                                
                                                // Add input event listener to detect changes
                                                const handleInputChange = (e) => {
                                                    updateActiveTerm('content', e.target.value);
                                                };
                                                
                                                el.addEventListener('input', handleInputChange);
                                                el.addEventListener('change', handleInputChange);
                                                
                                                // Cleanup listeners on unmount
                                                return () => {
                                                    el.removeEventListener('input', handleInputChange);
                                                    el.removeEventListener('change', handleInputChange);
                                                };
                                            }
                                        }}
                                        label={__('Content', 'acemedia-glossary')}
                                        value={activeTerm.content || ''}
                                        onChange={(value) => updateActiveTerm('content', value)}
                                        placeholder={activeTerm.isLoading ? __('Loading content...', 'acemedia-glossary') : __('Enter term content...', 'acemedia-glossary')}
                                        rows={8}
                                        disabled={activeTerm.isLoading}
                                    />

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

export default memo(CardsOptimized);
