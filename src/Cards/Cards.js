import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { FlexBlock, Card, CardHeader, CardBody, TextControl, ToggleControl, TextareaControl, CheckboxControl, PanelRow, Tooltip, IconButton, Flex, FlexItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faClock, faEdit, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { decodeHTMLEntities, formatRelativeTime, smoothScrollTo } from '../utils';

const Cards = ({
    displayedTerms,
    terms,
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
}) => {
    const termRefs = useRef({});
    const focusedTermIdRef = useRef(null);
    const focusedFieldRef = useRef(null); 

    // Move toggleTermOpen to Cards.js
    const toggleTermOpen = useCallback((termId) => {
        const isCurrentlyOpen = terms.find((term) => term.id === termId)?.isOpen;

        if (isCurrentlyOpen) {
            setTerms((prevTerms) =>
                prevTerms.map((term) =>
                    term.id === termId ? { ...term, isOpen: false } : term
                )
            );
            return;
        }

        setTerms((prevTerms) =>
            prevTerms.map((term) => ({ ...term, isOpen: false }))
        );

        setTimeout(() => {
            if (termRefs.current[termId]) {
                smoothScrollTo(termRefs.current[termId].offsetTop - 56, 300);
                setTimeout(() => {
                    setTerms((prevTerms) =>
                        prevTerms.map((term) =>
                            term.id === termId ? { ...term, isOpen: true } : term
                        )
                    );
                }, 10);
            }
        }, 0);
    }, [terms, setTerms]);


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
                body: JSON.stringify({ ids: [termId] }), // Send single term ID in array
            });
    
            if (!response.ok) {
                throw new Error(__('Failed to delete the term.', 'acemedia-glossary'));
            }
    
            const deletedIds = await response.json(); // API should return deleted IDs
            setTerms((prevTerms) => prevTerms.filter((term) => !deletedIds.includes(term.id)));
            setMessage(__('Term deleted successfully.', 'acemedia-glossary'));
        } catch (error) {
            console.error('Error deleting term:', error);
            setMessage(__('Failed to delete the term. Please try again.', 'acemedia-glossary'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    }, [terms, setTerms, setMessage, setIsSaving]);
    
    
    

    // Move helper functions for term relationships to Cards.js
    const updateRelatedTerms = (termId, updatedRelatedTerms) => {
        setTerms((prevTerms) => {
            // Create a copy of the previous terms to modify
            const termsCopy = [...prevTerms];
            const modifiedIds = new Set(); // Track modified term IDs
    
            // Update the relationships for the target term (termId)
            termsCopy.forEach((term) => {
                if (term.id === termId) {
                    term.relatedTerms = updatedRelatedTerms;
                    modifiedIds.add(term.id); // Mark the target term as modified
                } else {
                    // Handle bidirectional updates for other terms
                    if (updatedRelatedTerms.includes(term.id)) {
                        // If termId is in updatedRelatedTerms, ensure the reverse relationship exists
                        if (!term.relatedTerms.includes(termId)) {
                            term.relatedTerms = [...term.relatedTerms, termId];
                            modifiedIds.add(term.id); // Mark related term as modified
                        }
                    } else {
                        // If termId is not in updatedRelatedTerms, remove the reverse relationship
                        if (term.relatedTerms.includes(termId)) {
                            term.relatedTerms = term.relatedTerms.filter((id) => id !== termId);
                            modifiedIds.add(term.id); // Mark related term as modified
                        }
                    }
                }
            });
    
            // Update modified terms
            setModifiedTerms((prevModified) => {
                const updatedSet = new Set(prevModified);
                modifiedIds.forEach((id) => updatedSet.add(id));
                return updatedSet;
            });
    
            return termsCopy;
        });
    
        setUnsavedChanges(true);
    };

    const updateCategories = (termId, updatedCategories) => {
        setTerms((prevTerms) =>
            prevTerms.map((term) =>
                term.id === termId
                    ? { ...term, categories: updatedCategories }
                    : term
            )
        );
        setModifiedTerms((prevModified) => new Set(prevModified).add(termId));
        setUnsavedChanges(true);
    };

    const updateTags = (termId, updatedTags) => {
        setTerms((prevTerms) =>
            prevTerms.map((term) =>
                term.id === termId ? { ...term, tags: updatedTags } : term
            )
        );
        setModifiedTerms((prevModified) => new Set(prevModified).add(termId));
        setUnsavedChanges(true);
    };

    // Calculate visible count with a fallback for empty displayedTerms
    const visibleCount = Object.keys(displayedTerms).reduce((count, key) => {
        return count + (displayedTerms[key]?.length || 0);
    }, 0);
    
    const totalCount = terms.length;



    
    useEffect(() => {
        if (focusedTermIdRef.current && focusedFieldRef.current) {
            const selector = focusedFieldRef.current === 'title' ? 'input[type="text"]' : 'textarea';
            const element = document.querySelector(`[data-term-id="${focusedTermIdRef.current}"] ${selector}`);
            if (element) {
                element.focus();
            }
            focusedTermIdRef.current = null; // Clear refs after focusing
            focusedFieldRef.current = null;
        }
    }, [terms]);


    const updateTerm = useCallback((termId, key, value) => {
        setTerms((prevTerms) =>
            prevTerms.map((term) =>
                term.id === termId ? { ...term, [key]: value } : term
            )
        );
        setModifiedTerms((prevModified) => new Set(prevModified).add(termId));
        setUnsavedChanges(true);
        
        // Preserve focus after updating
        focusedTermIdRef.current = termId;
        focusedFieldRef.current = key;
    }, []);
    
    useEffect(() => {
        if (focusedTermIdRef.current && focusedFieldRef.current) {
            const termId = focusedTermIdRef.current;
            const field = focusedFieldRef.current;
            
            const selector = field === 'title' ? 'input[type="text"]' : 'textarea';
            const element = document.querySelector(`[data-term-id="${termId}"] ${selector}`);
            
            if (element) {
                element.focus();
                element.selectionStart = element.value.length; // Move cursor to the end
            }
        }
    }, [terms]); // Only focus when terms are updated



    return (

        <>


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
    label="Bulk Edit"
        checked={quickEdit === 'true'}
        onChange={(isChecked) => {
            setQuickEdit(isChecked ? 'true' : 'false');
            if (!isChecked) setSelectedTerms([]); // Clear selected terms
        }}
    />
</Flex>
</Flex>



</div>

        {Object.keys(displayedTerms).sort().map(group => (
            <FlexBlock style={{ display: 'grid', gap: '1em', flex: 'initial' }} key={group} id={group}>
                {sortOption === 'alphabetical' && <h3 className='group-title'>{group}</h3>}
                {displayedTerms[group].map((term) => (
                <Card
                key={term.id}
                className={`glossary-term-card ${quickEdit === 'true' ? 'editing' : ''}`}
                data-term-id={term.id}
                ref={el => termRefs.current[term.id] = el} // Assign ref here
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
onChange={(value) => updateTerm(term.id, 'title', value)}
placeholder={__('Enter term title...', 'acemedia-glossary')}
data-term-id={term.id} // Add attribute for focusing
/>

<TextareaControl
label={__('Content', 'acemedia-glossary')}
value={term.content}
onChange={(value) => updateTerm(term.id, 'content', value)}
placeholder={__('Enter term content...', 'acemedia-glossary')}
data-term-id={term.id} // Add attribute for focusing
/>
<Flex className='related-options' style={{ gap: '1rem' }} justify="start">
<FlexItem style={{ flex: '1 1 30%' }}>
<h3>Related Terms</h3>
<div className="scroller">
{terms.filter(t => t.id !== term.id).map((option) => (
    <CheckboxControl
        key={option.id}
        label={decodeHTMLEntities(option.title)}
        checked={term.relatedTerms.includes(option.id)}
        onChange={(isChecked) => {
            const updatedRelatedTerms = isChecked
                ? [...term.relatedTerms, option.id]
                : term.relatedTerms.filter(id => id !== option.id);
            updateRelatedTerms(term.id, updatedRelatedTerms);
        }}
    />
))}
</div>
</FlexItem>

<FlexItem style={{ flex: '1 1 30%' }}>
<h3>Related Categories</h3>
<div className="scroller">
{categories
.filter((category) => category.value !== 1) // Exclude category with ID 1
.map((category) => (
    <CheckboxControl
        key={category.value}
        label={category.label}
        checked={term.categories.some((cat) => cat.id === category.value)} // Check by id
        onChange={(isChecked) => {
            const updatedCategories = isChecked
                ? [
                      ...term.categories,
                      {
                          id: category.value,
                          slug: category.label.toLowerCase().replace(/\s+/g, '-'),
                          title: category.label,
                      },
                  ]
                : term.categories.filter((cat) => cat.id !== category.value);
            updateCategories(term.id, updatedCategories); // Update with the full object
        }}
    />
))}
</div>
</FlexItem>


<FlexItem style={{ flex: '1 1 30%' }}>
<h3>Related Tags</h3>
<div className="scroller">
{tags.map((tag) => (
<CheckboxControl
    key={tag.value}
    label={tag.label}
    checked={term.tags.some((t) => t.id === tag.value)} // Check by id
    onChange={(isChecked) => {
        const updatedTags = isChecked
            ? [...term.tags, { id: tag.value, slug: tag.label.toLowerCase().replace(/\s+/g, '-'), title: tag.label }]
            : term.tags.filter((t) => t.id !== tag.value);
        updateTags(term.id, updatedTags); // Update with the full object
    }}
/>
))}
</div>
</FlexItem>

</Flex>

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

        </>
    );
};

export default Cards;