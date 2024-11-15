import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { Button,  
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption, PanelRow, TextControl, TextareaControl, CheckboxControl, Card, CardHeader, CardBody, PanelBody, IconButton, Notice, Flex, FlexItem, Tooltip, SelectControl, FlexBlock, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useSelect } from '@wordpress/data';
import { store as coreDataStore } from '@wordpress/core-data';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faSortAlphaDown, faAnchor, faTags } from '@fortawesome/free-solid-svg-icons';

import SaveBar from './SaveBar/SaveBar';
import './styles/scss/settings.scss';

const DEBOUNCE_DELAY = 2000;

const GlossaryAdminApp = () => {
    const [terms, setTerms] = useState([]);
    const [modifiedTerms, setModifiedTerms] = useState(new Set());
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [message, setMessage] = useState('');
    const [sortOption, setSortOption] = useState('alphabetical');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
    const [loadTime, setLoadTime] = useState(null);
    const debounceTimerRef = useRef(null);
    const focusedTermIdRef = useRef(null);
    const focusedFieldRef = useRef(null); 
    const [buttonText, setButtonText] = useState('Save Changes');
    const [searchQuery, setSearchQuery] = useState('');
    const isInitialLoad = useRef(true);
    const termRefs = useRef({});




    const isSavingRef = useRef(false);

    const saveTerms = useCallback((isAutoSave = false) => {
        if (!unsavedChanges || isSavingRef.current) return;
    
        isSavingRef.current = true;
    
        const termsToSave = terms.filter((term) => modifiedTerms.has(term.id));
        const savePromises = termsToSave.map((term) =>
            apiFetch({
                path: '/wp-json/wp/v2/glossary',
                method: 'POST',
                data: { ...term, modified: new Date().toISOString() },
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            })
        );
    
        Promise.all(savePromises)
            .then(() => {
                setModifiedTerms(new Set());
                setUnsavedChanges(false);
                if (!isAutoSave) {
                    setMessage('Changes saved successfully!');
                    setTimeout(() => setMessage(''), 3000);
                }
            })
            .catch((error) => {
                console.error('Error saving terms:', error);
                setMessage('Error saving changes');
                setTimeout(() => setMessage(''), 3000);
            })
            .finally(() => {
                isSavingRef.current = false;
            });
    }, [terms, modifiedTerms, unsavedChanges]);


 // Create a memoized debounce function
 const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), delay);
    };
}, []);

// Create a memoized debouncedAutoSave function
const debouncedAutoSave = useCallback(
    debounce(() => {
        if (isAutoSaveEnabled && unsavedChanges) {
            saveTerms(true);
        }
    }, DEBOUNCE_DELAY),
    [isAutoSaveEnabled, unsavedChanges, saveTerms]
);
    


    const [newTermTitle, setNewTermTitle] = useState('');
const [newTermContent, setNewTermContent] = useState('');


    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
}, [searchQuery]);



    
    const handleSearchChange = useCallback((value) => setSearchQuery(value), []);

    // Fetch glossary terms, categories, and tags once on component mount
    useEffect(() => {
        const startTime = performance.now();

        apiFetch({ path: '/wp-json/wp/v2/glossary' })
            .then((data) => {
                const endTime = performance.now();
                setLoadTime(endTime - startTime);
                setTerms(data.map(term => ({
                    ...term,
                    relatedTerms: term.relatedTerms || [],
                    categories: term.categories || [],
                    tags: term.tags || [],
                    isOpen: false,
                })));
            })
            .catch((error) => {
                console.error('Error loading terms:', error);
                setLoadTime(null);
            });

        apiFetch({ path: '/wp-json/wp/v2/categories' })
            .then((data) => setCategories(data.map(cat => ({ label: cat.name, value: cat.id }))))
            .catch((error) => console.error('Error loading categories:', error));
          
          
          
            apiFetch({ path: '/wp-json/wp/v2/tags?per_page=-1' })
            .then((data) => {
                setTags(data.map(tag => ({ label: tag.name, value: tag.id })));
                console.log("Tags loaded:", data); // Should log tags once on load
            })
            .catch((error) => console.error('Error loading tags:', error));


    }, []);



    

    const [tagFilter, setTagFilter] = useState([]);
const [categoryFilter, setCategoryFilter] = useState([]);

// Handler for tags filter
const handleTagChange = (selectedTag) => {
    setTagFilter(prev => {
        if (selectedTag === 'all_tags') {
            return []; // Reset to all tags
        }
        if (prev.includes(selectedTag)) {
            return prev.filter(tag => tag !== selectedTag); // Remove tag if already selected
        }
        return [...prev, selectedTag]; // Add tag
    });
};

// Handler for categories filter
const handleCategoryChange = (selectedCategory) => {
    setCategoryFilter(prev => {
        if (prev.includes(selectedCategory)) {
            return prev.filter(cat => cat !== selectedCategory); // Remove if already selected
        }
        return [...prev, selectedCategory]; // Add category
    });
};


const updateRelatedTerms = (termId, updatedRelatedTerms) => {
    setTerms((prevTerms) => {
        // Create a copy of the previous terms to modify
        const termsCopy = [...prevTerms];

        // Update the relationships for the target term (termId)
        termsCopy.forEach((term) => {
            if (term.id === termId) {
                term.relatedTerms = updatedRelatedTerms;
            } else {
                // Handle bidirectional updates for other terms
                if (updatedRelatedTerms.includes(term.id)) {
                    // If termId is in updatedRelatedTerms, ensure the reverse relationship exists
                    if (!term.relatedTerms.includes(termId)) {
                        term.relatedTerms = [...term.relatedTerms, termId];
                    }
                } else {
                    // If termId is not in updatedRelatedTerms, remove the reverse relationship
                    term.relatedTerms = term.relatedTerms.filter((id) => id !== termId);
                }
            }
        });

        return termsCopy;
    });

    setUnsavedChanges(true);
};


const updateCategories = (termId, updatedCategories) => {
    setTerms((prevTerms) =>
        prevTerms.map((term) =>
            term.id === termId ? { ...term, categories: updatedCategories } : term
        )
    );
    setUnsavedChanges(true);
};

const updateTags = (termId, updatedTags) => {
    setTerms((prevTerms) =>
        prevTerms.map((term) =>
            term.id === termId ? { ...term, tags: updatedTags } : term
        )
    );
    setUnsavedChanges(true);
};

const TagsAndCategoriesFilter = ({
    tags,
    categories,
    tagFilter,
    handleTagChange,
    categoryFilter,
    handleCategoryChange
}) => {
    const displayedTags = useMemo(() => showAllTags ? tags : tags.slice(0, 10), [showAllTags, tags]);
const displayedCategories = useMemo(() => categories, [categories]);
    const [showAllTags, setShowAllTags] = useState(false);
    const isTagsPanelOpenRef = useRef(JSON.parse(localStorage.getItem('isTagsPanelOpen')) || false);
const isCategoriesPanelOpenRef = useRef(JSON.parse(localStorage.getItem('isCategoriesPanelOpen')) || false);



useEffect(() => {
    if (isInitialLoad.current) {
        const tagsPanelState = JSON.parse(localStorage.getItem('isTagsPanelOpen'));
        const categoriesPanelState = JSON.parse(localStorage.getItem('isCategoriesPanelOpen'));

        isTagsPanelOpenRef.current = tagsPanelState !== null ? tagsPanelState : isTagsPanelOpenRef.current;
        isCategoriesPanelOpenRef.current = categoriesPanelState !== null ? categoriesPanelState : isCategoriesPanelOpenRef.current;

        // Set current state to false after the initial load
        isInitialLoad.current = false;
    }
}, []);
    const toggleTagsPanel = () => {
        const newState = !isTagsPanelOpenRef.current;
        isTagsPanelOpenRef.current = newState;
        localStorage.setItem('isTagsPanelOpen', JSON.stringify(newState));
    };
    
    const toggleCategoriesPanel = () => {
        const newState = !isCategoriesPanelOpenRef.current;
        isCategoriesPanelOpenRef.current = newState;
        localStorage.setItem('isCategoriesPanelOpen', JSON.stringify(newState));
    };
    

    return (
        <>
            <PanelBody
    title={<span><FontAwesomeIcon icon={faTags} /> {__('Tags', 'acemedia-glossary')}</span>}
    initialOpen={isTagsPanelOpenRef.current}
    onToggle={toggleTagsPanel}
>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[
                        { label: 'All Tags', value: 'all_tags' },
                        ...displayedTags.map(tag => ({ label: tag.label, value: tag.value }))
                    ].map(tag => (
                        <Button
                            key={tag.value}
                            isPressed={tagFilter.includes(tag.value)}
                            onClick={() => handleTagChange(tag.value)}
                            className="toggle-button"
                        >
                            {tag.label}
                        </Button>
                    ))}
                    {tags.length > 10 && (
                        <Button onClick={() => setShowAllTags(!showAllTags)} className="toggle-button">
                            {showAllTags ? __('Show Less') : __('Show More')}
                        </Button>
                    )}
                </div>
            </PanelBody>

            <PanelBody
    title={<span><FontAwesomeIcon icon={faTags} /> {__('Categories', 'acemedia-glossary')}</span>}
    initialOpen={isCategoriesPanelOpenRef.current}
    onToggle={toggleCategoriesPanel}
>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {categories.map(category => (
                        <Button
                            key={category.value}
                            isPressed={categoryFilter.includes(category.value)}
                            onClick={() => handleCategoryChange(category.value)}
                            className="toggle-button"
                        >
                            {category.label}
                        </Button>
                    ))}
                </div>
            </PanelBody>
        </>
    );
};







    const formatRelativeTime = useCallback((timestamp) => {
        if (!timestamp) return null;
        const time = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - time) / 1000);

        const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60, second: 1 };
        for (const [key, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `${interval} ${key}${interval !== 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    }, []);

    const addTerm = () => {
        const newTerm = {
            id: Date.now(),
            title: '',
            content: '',
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
            relatedTerms: [],
            categories: [],
            tags: [],
            isOpen: true, // Open the term immediately
        };
    
        setTerms((prevTerms) => {
            const updatedTerms = [...prevTerms.map(term => ({ ...term, isOpen: false })), newTerm];
            return updatedTerms;
        });
    
        setModifiedTerms((prevModified) => new Set(prevModified).add(newTerm.id));
        setUnsavedChanges(true);
    
        // Set focus to the new term
        focusedTermIdRef.current = newTerm.id;
        focusedFieldRef.current = 'title';
    
        // Auto-save the new term immediately
        saveTerms();
    
        // Scroll to the newly added term
        setTimeout(() => {
            if (termRefs.current[newTerm.id]) {
                const element = termRefs.current[newTerm.id];
                const yOffset = -78; // Offset from the top
                const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                window.scrollTo({
                    top: y,
                    behavior: 'smooth'
                });
            }
        }, 0);
    };
    

    const toggleTermOpen = useCallback((termId) => {
        setTerms(terms => 
            terms.map(term => 
                term.id === termId ? { ...term, isOpen: !term.isOpen } : { ...term, isOpen: false }
            )
        );
    
        // Scroll into view if the term is being opened
        if (termRefs.current[termId]) {
            const yOffset = -78; // Offset from the top
            const element = termRefs.current[termId];
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        
            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
        }
        
    }, []);


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
    
    
    useEffect(() => {
        if (isAutoSaveEnabled && unsavedChanges) {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                saveTerms(true);
            }, DEBOUNCE_DELAY);
        }
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [terms, isAutoSaveEnabled, unsavedChanges, saveTerms]);


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

    const removeTerm = useCallback((termId) => {
        setTerms(terms => terms.filter(term => term.id !== termId));
        setModifiedTerms(modifiedTerms => {
            modifiedTerms.delete(termId);
            return new Set(modifiedTerms);
        });
        setUnsavedChanges(true);
        if (isAutoSaveEnabled) {
            debouncedAutoSave();
        }
    }, [isAutoSaveEnabled, debouncedAutoSave]);

    const onSave = useCallback(() => saveTerms(), [saveTerms]);

    const displayedTerms = useMemo(() => {
        if (!terms.length) return {}; // Fallback for empty terms list
    
        let filteredTerms = terms;
    
        if (tagFilter.length > 0) {
            filteredTerms = filteredTerms.filter(term =>
                term.tags.some(tag => tagFilter.includes(tag))
            );
        }
    
        if (categoryFilter.length > 0) {
            filteredTerms = filteredTerms.filter(term =>
                term.categories.some(cat => categoryFilter.includes(cat))
            );
        }
    
        const sortedTerms = filteredTerms.sort((a, b) => {
            if (sortOption === 'alphabetical') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'created') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortOption === 'updated') {
                return new Date(a.modified) - new Date(b.modified);
            }
            return 0;
        });
    
        if (sortOption === 'alphabetical') {
            return sortedTerms.reduce((acc, term) => {
                const firstLetter = term.title.charAt(0).toUpperCase();
                if (!acc[firstLetter]) acc[firstLetter] = [];
                acc[firstLetter].push(term);
                return acc;
            }, {});
        }
    
        return { All: sortedTerms };
    }, [terms, sortOption, debouncedSearchQuery, tagFilter, categoryFilter]) || {}; // Ensure displayedTerms is an object
       
    // Calculate visible count with a fallback for empty displayedTerms
    const visibleCount = Object.keys(displayedTerms).reduce((count, key) => {
        return count + (displayedTerms[key]?.length || 0);
    }, 0);
    
    const totalCount = terms.length;


    const TermCard = ({ term, updateTerm, removeTerm }) => {
        const titleRef = useRef();
        const contentRef = useRef();
    
        return (
            <>
                <TextControl
                    ref={titleRef}
                    label={__('Term', 'acemedia-glossary')}
                    value={term.title}
                    onChange={(value) => {
                        updateTerm(term.id, 'title', value);
                        titleRef.current.focus();
                    }}
                    placeholder={__('Enter term title...', 'acemedia-glossary')}
                />
                <TextareaControl
                    ref={contentRef}
                    label={__('Content', 'acemedia-glossary')}
                    value={term.content}
                    onChange={(value) => {
                        updateTerm(term.id, 'content', value);
                        contentRef.current.focus();
                    }}
                    placeholder={__('Enter term content...', 'acemedia-glossary')}
                />
            </>
        );
    };
    


    const [isModalOpen, setIsModalOpen] = useState(false);
const [newTermData, setNewTermData] = useState({
    id: Date.now(),
    title: '',
    content: '',
    date: new Date().toISOString(),
    modified: new Date().toISOString(),
    relatedTerms: [],
    categories: [],
    tags: []
});

    

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
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map(letter => (
                                displayedTerms[letter] ? <a key={letter} href={`#${letter}`}>{letter}</a> : <span key={letter}>{letter}</span>
                            ))}
                        </div>
                    </div>
                </PanelBody>
            );
        }
        return null;
    }, [displayedTerms, sortOption]);

    const SearchComponent = memo(({ searchQuery, setSearchQuery }) => {
        const inputRef = useRef(null);
    
        const handleFocus = useCallback(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, []);
    
        useEffect(() => {
            // Only focus the input if it's actively being typed in, not on initial load
            if (searchQuery.length > 0) {
                handleFocus();
            }
        }, [searchQuery, handleFocus]);
    
        return (
            <div className='search-holder'>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    style={{ width: '100%', marginBottom: '0px' }}
                    autoComplete="off"
                    onFocus={handleFocus} // Ensures input regains focus if clicked
                />
                <span className="dashicons dashicons-search" style={{ marginLeft: '5px' }}></span>
            </div>
        );
    });
    
    const openModalForNewTerm = () => {
        setIsModalOpen(true);
        setNewTermData({
            id: Date.now(), // Temporary ID for the new term
            title: '',
            content: '',
            relatedTerms: [],
            categories: [],
            tags: [],
            date: new Date().toISOString(),
            modified: new Date().toISOString()
        });
    };
    
    
    return (
        <>
            <Flex alignItems="flex-start" className='main-panel'>
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
    categories={categories}
    tagFilter={tagFilter}
    handleTagChange={handleTagChange}
    categoryFilter={categoryFilter}
    handleCategoryChange={handleCategoryChange}
/>


                    </div>
                </FlexItem>
                <FlexBlock className="terms-list" style={{ flex: '1' }}>
                    <div style={{ marginBottom: '15px' }} className={`currently-viewing ${sortOption === 'alphabetical' ? 'alpha' : ''}`}>
                    <Tooltip text={`${visibleCount} of ${totalCount} terms visible`}>
    <span className='pill'>
        <FontAwesomeIcon icon={faTags} style={{ marginRight: '5px' }} />
        {`${visibleCount} of ${totalCount}`}
    </span>
</Tooltip>
                        <Tooltip text={`${loadTime}ms response time for the current view`}>
                            <span className='pill'>
                                <FontAwesomeIcon icon={faClock} style={{ marginRight: '5px' }} />
                                {loadTime}ms
                            </span>
                        </Tooltip>
                    </div>
                    {Object.keys(displayedTerms).sort().map(group => (
                        <FlexBlock style={{ display: 'grid', gap: '1em', flex: 'initial' }} key={group} id={group}>
                            {sortOption === 'alphabetical' && <h3 className='group-title'>{group}</h3>}
                            {displayedTerms[group].map((term) => (
                                <Card
                                key={term.id}
                                className="glossary-term-card"
                                data-term-id={term.id}
                                ref={el => termRefs.current[term.id] = el} // Assign ref here
                            >
                                    <CardHeader onClick={() => toggleTermOpen(term.id)} style={{ cursor: 'pointer' }}>
                                        <h2>{term.title || __('New Term', 'acemedia-glossary')}</h2>
                                        <div className='updated-times' style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '.5em' }}>
                                            <Tooltip text={`Created at ${new Date(term.date).toLocaleDateString()}`}>
                                                <p><strong>Created:</strong> {formatRelativeTime(term.date)}</p>
                                            </Tooltip>
                                            <Tooltip text={`Last edited at ${new Date(term.modified).toLocaleDateString()}`}>
                                                <p><strong>Updated:</strong> {formatRelativeTime(term.modified)}</p>
                                            </Tooltip>
                                        </div>
                                    </CardHeader>
                                    {term.isOpen && (
                                        <CardBody>
                                            <TextControl
    label={__('Term', 'acemedia-glossary')}
    value={term.title}
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
    <div className="scroller">
            {terms.filter(t => t.id !== term.id).map((option) => (
                <CheckboxControl
                    key={option.id}
                    label={option.title}
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
    <div className="scroller">
            {categories.map((category) => (
                <CheckboxControl
                    key={category.value}
                    label={category.label}
                    checked={term.categories.includes(category.value)}
                    onChange={(isChecked) => {
                        const updatedCategories = isChecked
                            ? [...term.categories, category.value]
                            : term.categories.filter(id => id !== category.value);
                        updateCategories(term.id, updatedCategories);
                    }}
                />
            ))}
            </div>
    </FlexItem>
    
    <FlexItem style={{ flex: '1 1 30%' }}>
        <div className="scroller">
            {tags.map((tag) => (
                <CheckboxControl
                    key={tag.value}
                    label={tag.label}
                    checked={term.tags.includes(tag.value)}
                    onChange={(isChecked) => {
                        const updatedTags = isChecked
                            ? [...term.tags, tag.value]
                            : term.tags.filter(id => id !== tag.value);
                        updateTags(term.id, updatedTags);
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
            </Flex>
            <SaveBar
                onSave={onSave}
                setUnsavedChanges={setUnsavedChanges}
                unsavedChanges={unsavedChanges}
                isAutoSaveEnabled={isAutoSaveEnabled}
                setIsAutoSaveEnabled={setIsAutoSaveEnabled}
                message={message}
                buttonText={unsavedChanges ? 'Save Changes' : 'Saved'}
            >
                <Button variant="secondary" onClick={openModalForNewTerm}>
    {__('Add New Term', 'acemedia-glossary')}
</Button>
            </SaveBar>


            {isModalOpen && (
    <Modal
        title={__('Add New Term', 'acemedia-glossary')}
        onRequestClose={() => setIsModalOpen(false)}
        isDismissible={true}
    >
        <TextControl
            label={__('Term', 'acemedia-glossary')}
            value={newTermTitle}
            onChange={(value) => setNewTermTitle(value)}
            placeholder={__('Enter term title...', 'acemedia-glossary')}
        />
        <TextareaControl
            label={__('Content', 'acemedia-glossary')}
            value={newTermContent}
            onChange={(value) => setNewTermContent(value)}
            placeholder={__('Enter term content...', 'acemedia-glossary')}
        />
        
        <Button
    isPrimary
    onClick={() => {
        const newTermData = {
            id: Date.now(),
            title: newTermTitle || 'Untitled Term',
            content: newTermContent || '',
            relatedTerms: [],
            categories: [],
            tags: [],
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
            isOpen: false,
        };

        setTerms((prevTerms) => [...prevTerms, newTermData]);
        setModifiedTerms((prevModified) => new Set(prevModified).add(newTermData.id));
        setUnsavedChanges(true);

        // Save the new term immediately
        saveTerms();

        // Clear modal input fields and close the modal
        setNewTermTitle('');
        setNewTermContent('');
        setIsModalOpen(false);
    }}
>
    {__('Add Term', 'acemedia-glossary')}
</Button>

        <Button isSecondary onClick={() => setIsModalOpen(false)}>
            {__('Cancel', 'acemedia-glossary')}
        </Button>
    </Modal>
)}

        </>
    );
};

export default GlossaryAdminApp;
