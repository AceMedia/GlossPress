import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { FlexBlock, Card, CardHeader, CardBody, TextControl, ToggleControl, TextareaControl, CheckboxControl, PanelRow, Tooltip, IconButton, Flex, FlexItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faClock, faEdit, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { decodeHTMLEntities, formatRelativeTime, smoothScrollTo } from '../utils';
import RelatedTagsAndCats from './RelatedTagsAndCats';

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


<RelatedTagsAndCats
    term={term}
    terms={terms}
    categories={categories}
    tags={tags}
    setTerms={setTerms}
    setModifiedTerms={setModifiedTerms}
    setUnsavedChanges={setUnsavedChanges}
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

        </>
    );
};

export default Cards;