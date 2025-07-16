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
        timeout = setTimeout(() => func(...args), wait);
    };
}

const Cards = ({
    displayedTerms,
    terms,
    activeTerm,
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
    updateActiveTerm
}) => {
    const editorRef = useRef(null);
    const activeEditor = useRef(null); // Track the active editor instance
    const termRefs = useRef({});
    const focusedTermIdRef = useRef(null);
    const focusedFieldRef = useRef(null);


    

    const debouncedUpdateTerm = useMemo(() => {
        if (!isAutoSaveEnabled) return () => {}; // No-op if auto-save is disabled
        if (updateTerm) {
            return debounce(updateTerm, 300); // Debounced if enabled
        }
        return () => {};
    }, [updateTerm, isAutoSaveEnabled]);
    
    const updateTerm = useCallback((termId, key, value, isEditorChange = false) => {
        console.log('updateTerm', termId, key, value, isEditorChange);
        
        // Only update if this is the active term
        if (!activeTerm || activeTerm.id !== termId) {
            console.warn('Attempted to update inactive term:', termId);
            return;
        }

        updateActiveTerm(key, value);

        if (!isEditorChange) {
            focusedTermIdRef.current = termId;
            focusedFieldRef.current = key;
        }
    }, [activeTerm, updateActiveTerm]);


    const attachEditor = useCallback((term) => {
        if (!editorRef.current || activeEditor.current?.id === term.id) return;
    
    
        if (activeEditor.current?.instance) {
            activeEditor.current.instance.destroy();
        }
    
        const editorInstance = wp.attachEditor(editorRef.current, {
            value: term.content,
            onSaveContent: (content) => {
                // Update your application state or perform additional logic
                updateTerm(termId, 'content', content, true);
            },
            onLoad: (parse) => {
            },
            onError: (error) => {
            },
        });
    
    
        activeEditor.current = { id: term.id, instance: editorInstance };
    }, [updateTerm]);
    
    
    useEffect(() => {
        if (!activeEditor.current?.instance) {
            return;
        }
    
    
        return () => {
            if (activeEditor.current?.instance) {
                activeEditor.current.instance.destroy();
                activeEditor.current = null;
            }
        };
    }, [activeEditor]);
    
    
    
    
    

    const toggleTermOpen = useCallback(async (termId) => {
        // Check if this term is already active and open
        if (activeTerm && activeTerm.id === termId && activeTerm.isOpen) {
            closeActiveTerm();
            return;
        }

        // Close any currently open term first
        if (activeTerm) {
            closeActiveTerm();
        }

        // Load the new term with full data
        try {
            await loadSingleTerm(termId);
            
            // Scroll to the term after loading
            setTimeout(() => {
                if (termRefs.current[termId]) {
                    smoothScrollTo(termRefs.current[termId].offsetTop - 56, 1000);
                }
            }, 100);
        } catch (error) {
            console.error('Error loading term:', error);
            setMessage('Failed to load term data');
            setTimeout(() => setMessage(''), 3000);
        }

        // Cleanup the editor instance if needed
        if (activeEditor.current?.instance) {
            activeEditor.current.instance.destroy();
            activeEditor.current = null;
        }
    }, [activeTerm, loadSingleTerm, closeActiveTerm, setMessage]);

    

    const removeTerm = useCallback(async (termId) => {
        const termToDelete = terms.find((term) => term.id === termId);

        if (!termToDelete) {
            setMessage(__('Term not found.', 'acemedia-glossary'));
            return;
        }

        const confirmDelete = window.confirm(
            __('Are you sure you want to delete this term? This action cannot be undone.', 'acemedia-glossary')
        );

        if (!confirmDelete) return;

        setIsSaving(true);

        try {
            const response = await fetch(`${AceMediaGlossaryAdmin.apiUrl}wp/v2/glossary/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
                },
                body: JSON.stringify({ ids: [termId] }),
            });

            if (!response.ok) {
                throw new Error(__('Failed to delete the term.', 'acemedia-glossary'));
            }

            const deletedIds = await response.json();
            setTerms((prevTerms) => prevTerms.filter((term) => !deletedIds.includes(term.id)));
            setMessage(__('Term deleted successfully.', 'acemedia-glossary'));
        } catch (error) {
            setMessage(__('Failed to delete the term. Please try again.', 'acemedia-glossary'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    }, [terms, setTerms, setMessage, setIsSaving]);

useEffect(() => {
    if (activeTerm && activeTerm.isOpen) {
        attachEditor(activeTerm);
    }

    return () => {
        if (activeEditor.current?.instance) {
            activeEditor.current.instance.destroy();
            activeEditor.current = null;
        }
    };
}, [activeTerm, attachEditor]);

const observeTextareaWithInput = (textareaElement, termId) => {
    if (!textareaElement) {
        return;
    }

    // Preserve the original property descriptor
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");

    // Override the `value` property to intercept changes
    Object.defineProperty(textareaElement, "value", {
        get: desc.get,
        set: function (newValue) {
            updateTerm(termId, 'content', newValue, true); // Update term content
            desc.set.call(this, newValue); // Call the original setter
        },
    });

    // Listen for manual input
    const inputListener = (event) => {
        const updatedValue = event.target.value;
        updateTerm(termId, 'content', updatedValue, true);
    };

    textareaElement.addEventListener("input", inputListener);


    // Cleanup listeners and reset property descriptor on unmount
    return () => {
        textareaElement.removeEventListener("input", inputListener);
        Object.defineProperty(textareaElement, "value", desc); // Restore original property descriptor
    };
};






    const visibleCount = Object.keys(displayedTerms).reduce((count, key) => {
        return count + (displayedTerms[key]?.length || 0);
    }, 0);

    const totalCount = terms.length;

    return (
        <FlexBlock className="terms-list" style={{ flex: '1' }}>
            <div style={{ marginBottom: '15px' }} className={`currently-viewing ${sortOption === 'alphabetical' ? 'alpha' : ''}`}>
                <Tooltip text={`${visibleCount} of ${totalCount} terms visible`}>
                    <span className="pill">
                        <FontAwesomeIcon icon={faEye} style={{ marginRight: '5px' }} />
                        {`${visibleCount} of ${totalCount}`}
                    </span>
                </Tooltip>
                <Tooltip text={`${loadTime}ms response time for the current view`}>
                    <span className="pill">
                        <FontAwesomeIcon icon={faClock} style={{ marginRight: '5px' }} />
                        {loadTime}ms
                    </span>
                </Tooltip>




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
            if (!isChecked) setSelectedTerms([]); // Clear selected terms
        }}
        disabled={totalCount === 0} // Disable toggle when no terms
    />
</Flex>


</Flex>


)}


            </div>

            {Object.keys(displayedTerms).sort().map(group => (
                <FlexBlock style={{ display: 'grid', gap: '1em', flex: 'initial' }} key={group} id={group}>
                    {sortOption === 'alphabetical' && <h3 className='group-title'>{group}</h3>}
                    {displayedTerms[group].map((term) => (
                        <Card
                            key={term.id}
                            className={`glossary-term-card ${quickEdit === 'true' ? 'editing' : ''}`}
                            data-term-id={term.id}
                            ref={el => termRefs.current[term.id] = el}
                        >
                              <CardHeader
onClick={(event) => {
if (quickEdit === 'true') {
// Prevent toggling if clicking on the actual checkbox
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
toggleTermOpen(term.id); // Default behavior when not in Quick Edit mode
}
}}
style={{ cursor: 'pointer' }}
>
<ToggleControl
checked={selectedTerms.includes(term.id)}
onChange={(isChecked) => {
setSelectedTerms((prev) =>
    isChecked ? [...prev, term.id] : prev.filter((id) => id !== term.id)
);
}}
className="bulk-select-toggle"
/>
<h2>{decodeHTMLEntities(term.title) || __('New Term', 'acemedia-glossary')}</h2>
<div
className="updated-times"
style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '.5em' }}
>
<Tooltip text={`Created at ${new Date(term.date).toLocaleDateString()}`}>
<p>
    <strong>Created:</strong> {formatRelativeTime(term.date)}
</p>
</Tooltip>
<Tooltip text={`Last edited at ${new Date(term.modified).toLocaleDateString()}`}>
<p>
    <strong>Updated:</strong> {formatRelativeTime(term.modified)}
</p>
</Tooltip>
</div>
</CardHeader>
                            {term.isOpen && (
                                <CardBody>
<TextControl
    label={__('Term', 'acemedia-glossary')}
    value={decodeHTMLEntities(term.title)}
    onChange={(value) => {
        updateTerm(term.id, 'title', value, false); // Immediate update for typing
        debouncedUpdateTerm(term.id, 'title', value); // Debounced for backend-heavy tasks
    }}
    placeholder={__('Enter term title...', 'acemedia-glossary')}
    data-term-id={term.id}
/>

<TextareaControl
    ref={(el) => {
        if (el) {
            editorRef.current = el;
            const cleanup = observeTextareaWithInput(el, term.id); // Observe both manual and programmatic updates
            return cleanup; // Cleanup function on unmount
        }
    }}
    label={__('Content', 'acemedia-glossary')}
    value={term.content} // Initial content
    onChange={(value) => updateTerm(term.id, 'content', value)}
    placeholder={__('Enter term content...', 'acemedia-glossary')}
/>






                                    <RelatedTagsAndCats
                                        term={term}
                                        terms={terms}
                                        categories={categories}
                                        tags={tags}
                                        setTerms={setTerms}
                                        setModifiedTerms={setModifiedTerms}
                                        setUnsavedChanges={setUnsavedChanges}
                                        isAutoSaveEnabled={isAutoSaveEnabled} 
                                        updateTerm={updateTerm}
                                        isSaving={isSaving}
                                    />
                                    <PanelRow>
                                        <IconButton
                                            icon="trash"
                                            label={__('Remove Term', 'acemedia-glossary')}
                                            onClick={() => removeTerm(term.id)}
                                            className="remove-term-btn"
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

export default memo(Cards);
