import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { Button,  
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption, ToggleControl, PanelRow, TextControl, TextareaControl, CheckboxControl, Card, CardHeader, CardBody, PanelBody, IconButton, Notice, Flex, FlexItem, Tooltip, SelectControl, FlexBlock, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { useSelect } from '@wordpress/data';
import { store as coreDataStore } from '@wordpress/core-data';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faSortAlphaDown, faAnchor, faTags, faEdit, faHighlighter, faEye, faCheckDouble } from '@fortawesome/free-solid-svg-icons';

import { faCss } from '@fortawesome/free-brands-svg-icons';


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

    const [isCssModalOpen, setIsCssModalOpen] = useState(false); // State for the CSS modal
const [customCss, setCustomCss] = useState(''); // State for custom CSS

    const [isDragging, setIsDragging] = useState(false);

    const [quickEdit, setQuickEdit] = useState('false'); // Initialize quickEdit state


    const [selectedTerms, setSelectedTerms] = useState([]);


    const [autoHighlight, setAutoHighlight] = useState(false);

// Fetch the initial value from wp_option on component mount
useEffect(() => {
    apiFetch({ path: '/wp-json/wp/v2/options/auto_highlight' }) // Updated to match registered route
        .then((data) => {
            setAutoHighlight(data.value === true); // Convert response value to boolean
        })
        .catch((error) => console.error('Error fetching auto_highlight option:', error));
}, []);

const saveAutoHighlightOption = (isEnabled) => {
    apiFetch({
        path: '/wp-json/wp/v2/options/auto_highlight', // Updated to match registered route
        method: 'POST',
        data: { value: isEnabled ? 'true' : 'false' }, // Send as string 'true' or 'false'
        headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
    })
        .then(() => console.log('Auto Highlight option updated successfully'))
        .catch((error) => console.error('Error saving auto_highlight option:', error));
};



    const decodeHTMLEntities = (str) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    };

    const isSavingRef = useRef(false);

    const saveTerms = useCallback((isAutoSave = false) => {
        if (!unsavedChanges || isSavingRef.current) return;
    
        isSavingRef.current = true;
    
        const termsToSave = terms.filter((term) => modifiedTerms.has(term.id)).map((term) => ({
            ...term,
            categories: term.categories.map((cat) => cat.id), // Send only category IDs
            tags: term.tags.map((tag) => tag.id), // Send only tag IDs
            modified: new Date().toISOString(),
        }));
        
    
        const startTime = performance.now();
    
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
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        setModifiedTerms(new Set());
        setUnsavedChanges(false);

        const successMessage = isAutoSave 
            ? `Auto-saved successfully! (${responseTime}ms)`
            : `Changes saved successfully! (${responseTime}ms)`;

        setMessage(successMessage); // Set message for SaveBar
        setTimeout(() => setMessage(''), 3000); // Clear the message after 3 seconds
    })
    .catch((error) => {
        console.error('Error saving terms:', error);
        setMessage('Error saving changes');
        setTimeout(() => setMessage(''), 3000); // Clear the error message
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
                    categories: term.categories.map(cat => ({
                        id: cat.id,
                        slug: cat.slug,
                        title: cat.title,
                    })) || [],
                    tags: term.tags.map(tag => ({
                        id: tag.id,
                        slug: tag.slug,
                        title: tag.title,
                    })) || [],
                    isOpen: false,
                })));
            })
            .catch((error) => {
                console.error('Error loading terms:', error);
                setLoadTime(null);
            });
    
        apiFetch({ path: '/wp-json/wp/v2/categories' })
            .then((data) => setCategories(data.map(cat => ({
                label: cat.name,
                value: cat.id,
            }))))
            .catch((error) => console.error('Error loading categories:', error));
    
        apiFetch({ path: '/wp-json/wp/v2/tags?per_page=-1' })
            .then((data) => setTags(data.map(tag => ({
                label: tag.name,
                value: tag.id,
            }))))
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
                ? {
                      ...term,
                      categories: updatedCategories, // Full objects for local state
                  }
                : term
        )
    );

    // Mark the term as modified
    setModifiedTerms((prevModified) => new Set(prevModified).add(termId));
    setUnsavedChanges(true);
};



const updateTags = (termId, updatedTags) => {
    setTerms((prevTerms) =>
        prevTerms.map((term) =>
            term.id === termId
                ? {
                      ...term,
                      tags: updatedTags, // Full objects for local state
                  }
                : term
        )
    );

    // Mark the term as modified
    setModifiedTerms((prevModified) => new Set(prevModified).add(termId));
    setUnsavedChanges(true);
};



const TagsAndCategoriesFilter = ({
    tags,
    categories,
    tagFilter,
    handleTagChange,
    categoryFilter,
    handleCategoryChange,
}) => {
    const [showAllTags, setShowAllTags] = useState(false);

    // Local state for panel open/closed status
    const [isTagsPanelOpen, setIsTagsPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isTagsPanelOpen')) || false
    );
    const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isCategoriesPanelOpen')) || false
    );

    // Save state to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('isTagsPanelOpen', JSON.stringify(isTagsPanelOpen));
    }, [isTagsPanelOpen]);

    useEffect(() => {
        localStorage.setItem('isCategoriesPanelOpen', JSON.stringify(isCategoriesPanelOpen));
    }, [isCategoriesPanelOpen]);

    // Displayed tags based on "Show More"
    const displayedTags = useMemo(() => (showAllTags ? tags : tags.slice(0, 10)), [showAllTags, tags]);

    return (
        <>
            <PanelBody
                title={<span><FontAwesomeIcon icon={faTags} /> {__('Tags', 'acemedia-glossary')}</span>}
                initialOpen={isTagsPanelOpen}
                onToggle={() => setIsTagsPanelOpen((prev) => !prev)}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[{ label: 'All Tags', value: 'all_tags' }, ...displayedTags].map((tag) => (
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
                        <Button
                            onClick={() => setShowAllTags(!showAllTags)}
                            className="toggle-button"
                        >
                            {showAllTags ? __('Show Less') : __('Show More')}
                        </Button>
                    )}
                </div>
            </PanelBody>

            <PanelBody
                title={<span><FontAwesomeIcon icon={faTags} /> {__('Categories', 'acemedia-glossary')}</span>}
                initialOpen={isCategoriesPanelOpen}
                onToggle={() => setIsCategoriesPanelOpen((prev) => !prev)}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {categories.map((category) => (
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


useEffect(() => {
    apiFetch({
        path: '/wp-json/wp/v2/get-custom-css',
        headers: {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce, // Add nonce for validation
        },
    })
        .then((data) => {
            if (data && data.css) {
                setCustomCss(data.css); // Set the retrieved CSS
            }
        })
        .catch((error) => {
            console.error('Error fetching custom CSS:', error);
        });
}, []);


const saveCss = () => {
    apiFetch({
        path: '/wp-json/wp/v2/save-custom-css',
        method: 'POST',
        data: { css: customCss },
        headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
    })
        .then(() => {
            setMessage(__('Custom CSS saved successfully!', 'acemedia-glossary'));
        })
        .catch((error) => {
            console.error('Error saving custom CSS:', error);
            setMessage(__('Failed to save custom CSS.', 'acemedia-glossary'));
        });
};



const handleDownload = useCallback(() => {
    // Trigger the PHP export function via an API call
    fetch('/wp-json/wp/v2/glossary/export', {
        method: 'GET',
        headers: {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce, // Adjust if you have CSRF protection
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch glossary terms from server');
            }
            return response.blob();
        })
        .then((blob) => {
            const url = URL.createObjectURL(blob);

            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = 'glossary-terms.json';
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        })
        .catch((error) => {
            console.error('Error during download:', error);
            alert('An error occurred while downloading the glossary terms.');
        });
}, []);



useEffect(() => {
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragging(true); // Set dragging state to true
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false); // Reset dragging state when leaving
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false); // Reset dragging state after drop
    
        const file = e.dataTransfer.files[0];
    
        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedTerms = JSON.parse(event.target.result);
    
                    if (!Array.isArray(importedTerms)) {
                        throw new Error('Invalid JSON format. Expected an array of terms.');
                    }
    
                    // Clear logs before starting the import process
                    await clearLogs();
    
                    const startTime = performance.now();
    
                    // Send the imported terms to the server for processing
                    await apiFetch({
                        path: '/wp-json/wp/v2/glossary/import',
                        method: 'POST',
                        data: importedTerms,
                        headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
                    });
    
                    const endTime = performance.now();
                    const responseTime = Math.round(endTime - startTime);
    
                    setMessage(
                        `Import completed successfully in ${responseTime}ms.`
                    );
    
                    // Refresh logs after the import process
                    await fetchLogs();
    
                    // Fetch updated terms and calculate new load time
                    const fetchStartTime = performance.now();
                    const updatedTerms = await apiFetch({ path: '/wp-json/wp/v2/glossary' });
                    const fetchEndTime = performance.now();
                    const newLoadTime = Math.round(fetchEndTime - fetchStartTime);
    
                    setLoadTime(newLoadTime); // Update the loadTime state
                    setTerms(updatedTerms); // Replace the terms with the latest data
                } catch (error) {
                    console.error('Error importing terms:', error);
                    setMessage('Error importing terms. Please try again.');
                } finally {
                    setTimeout(() => setMessage(''), 5000);
                }
            };
            reader.readAsText(file);
        } else {
            setMessage('Please drop a valid JSON file.');
            setTimeout(() => setMessage(''), 5000);
        }
    };
    

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
    };
}, [setTerms, setLoadTime]);





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

    const smoothScrollTo = (targetY, duration = 1000) => {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();
    
        const easeInOutQuad = (t) =>
            t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease-in-out formula
    
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1); // Clamp progress to 1
    
            const easedProgress = easeInOutQuad(progress); // Apply easing
            window.scrollTo(0, startY + distance * easedProgress);
    
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
    
        requestAnimationFrame(step);
    };
    

    const toggleTermOpen = useCallback((termId) => {
        const isCurrentlyOpen = terms.find((term) => term.id === termId)?.isOpen;
    
        if (isCurrentlyOpen) {
            // If the panel is open, close it
            setTerms((terms) =>
                terms.map((term) =>
                    term.id === termId ? { ...term, isOpen: false } : term
                )
            );
            return;
        }
    
        // First, close all panels
        setTerms((terms) =>
            terms.map((term) => ({ ...term, isOpen: false }))
        );
    
        // Wait for the DOM update to ensure panels are closed before scrolling
        setTimeout(() => {
            if (termRefs.current[termId]) {
                const yOffset = -56; // Adjust offset as needed
                const element = termRefs.current[termId];
                const y = element.offsetTop + yOffset;
    
                // Scroll to the target position
                window.scrollTo({
                    top: y,
                    behavior: 'smooth',
                });
    
                // After scrolling, open the target panel
                setTimeout(() => {
                    setTerms((terms) =>
                        terms.map((term) =>
                            term.id === termId ? { ...term, isOpen: true } : term
                        )
                    );
                }, 10); // Adjust delay to match smooth scrolling duration
            }
        }, 0); // Ensure this executes after the state update
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
        const termToDelete = terms.find((term) => term.id === termId);
    
        if (!termToDelete) {
            setMessage(__('Term not found.', 'acemedia-glossary'));
            return;
        }
    
        const confirmDelete = window.confirm(
            __('Are you sure you want to delete this term? This action cannot be undone.', 'acemedia-glossary')
        );
    
        if (!confirmDelete) return;
    
        apiFetch({
            path: `/wp-json/wp/v2/glossary/${termId}`,
            method: 'DELETE',
            headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
        })
            .then(() => {
                setTerms((prevTerms) => prevTerms.filter((term) => term.id !== termId));
                setMessage(__('Term deleted successfully.', 'acemedia-glossary'));
                setTimeout(() => setMessage(''), 3000);
            })
            .catch((error) => {
                console.error('Error deleting term:', error);
                setMessage(__('Failed to delete the term. Please try again.', 'acemedia-glossary'));
                setTimeout(() => setMessage(''), 3000);
            });
    }, [terms, setTerms, setMessage]);
    
    

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
                const firstLetter = decodeHTMLEntities(term.title).charAt(0).toUpperCase();
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
                    value={decodeHTMLEntities(term.title)}
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

const deleteSelectedTerms = async () => {
    if (!selectedTerms.length) {
        setMessage(__('No terms selected for deletion.', 'acemedia-glossary'));
        return;
    }

    const confirmDelete = window.confirm(
        __('Are you sure you want to delete the selected terms? This action cannot be undone.', 'acemedia-glossary')
    );

    if (!confirmDelete) return;

    try {
        const response = await fetch(`${AceMediaGlossaryAdmin.apiUrl}wp/v2/glossary/bulk-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
            },
            body: JSON.stringify({ ids: selectedTerms }),
        });

        if (!response.ok) {
            throw new Error(__('Failed to delete selected terms.', 'acemedia-glossary'));
        }

        // Update terms after successful deletion
        const deletedIds = await response.json();
        setTerms((prevTerms) => prevTerms.filter((term) => !deletedIds.includes(term.id)));
        setSelectedTerms([]); // Clear selection
        setMessage(__('Selected terms deleted successfully.', 'acemedia-glossary'));
    } catch (error) {
        console.error('Error deleting selected terms:', error);
        setMessage(__('Failed to delete selected terms. Please try again.', 'acemedia-glossary'));
    } finally {
        setTimeout(() => setMessage(''), 3000);
    }
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


    const fetchLogs = async () => {
        try {
            const response = await apiFetch({
                path: '/wp-json/wp/v2/logs',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': AceMediaGlossaryAdmin.nonce, // Ensure the nonce is correctly set
                },
            });
            setLogs(response);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };
    
    
    const clearLogs = async () => {
        try {
            await apiFetch({
                path: '/wp-json/wp/v2/logs/clear',
                method: 'POST',
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            });
            setLogs('');
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    };

    const [logs, setLogs] = useState('');

useEffect(() => {
    fetchLogs();
}, []);
    
    
    return (
        <>
        <div className={`admin-ui ${isDragging ? 'dragging' : ''}`}>
            {isDragging && (
                <div className="drag-overlay">
                    <p>Drop your file anywhere to import!</p>
                </div>
            )}
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
                onChange={(isChecked) => {
                    setAutoHighlight(isChecked);
                    saveAutoHighlightOption(isChecked);
                }}
                style={{ marginLeft: 'auto' }} // Push toggle to the right
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

{logs && logs.trim() && (
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
            </Flex>



            </div>

            <SaveBar
    onSave={onSave}
    setUnsavedChanges={setUnsavedChanges}
    unsavedChanges={unsavedChanges}
    isAutoSaveEnabled={isAutoSaveEnabled}
    setIsAutoSaveEnabled={setIsAutoSaveEnabled}
    message={message}
    buttonText={unsavedChanges ? 'Save Changes' : 'Saved'}
>
    {quickEdit === 'true' ? (
        <Button
        isDestructive isPrimary 
            onClick={() => {
                    deleteSelectedTerms();
            }}
        >
            {__('Delete Terms', 'acemedia-glossary')}
        </Button>
    ) : (
        <Button variant="secondary" onClick={openModalForNewTerm}>
            {__('Add New Term', 'acemedia-glossary')}
        </Button>
    )}
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

        // Make the API save call directly
        apiFetch({
            path: '/wp-json/wp/v2/glossary',
            method: 'POST',
            data: { ...newTermData },
            headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
        })
            .then(() => {
                // Update the state with the saved term
                setTerms((prevTerms) => [...prevTerms, newTermData]);
                setModifiedTerms((prevModified) => new Set(prevModified).add(newTermData.id));
                setUnsavedChanges(false); // Clear unsaved changes for the modal term only
                setMessage('Term added and saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            })
            .catch((error) => {
                console.error('Error saving term:', error);
                setMessage('Error saving new term');
                setTimeout(() => setMessage(''), 3000);
            });

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



{isCssModalOpen && (
    <Modal
        title={__('Edit Custom CSS', 'acemedia-glossary')}
        onRequestClose={() => setIsCssModalOpen(false)}
        isDismissible={true}
        size='large'
    >
        <TextareaControl
            label={__('Custom CSS', 'acemedia-glossary')}
            value={customCss}
            onChange={(value) => setCustomCss(value)}
            rows={15}
            style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                width: '100%',
                height: '300px',
            }}
            placeholder={__('Write your custom CSS here...', 'acemedia-glossary')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1em' }}>
        <Button
    isPrimary
    onClick={() => {
        saveCss(); // Reuse the saveCss function
        setIsCssModalOpen(false); // Close the modal after saving
    }}
>
    {__('Save Custom CSS', 'acemedia-glossary')}
</Button>

            <Button isSecondary onClick={() => setIsCssModalOpen(false)}>
                {__('Cancel', 'acemedia-glossary')}
            </Button>
        </div>
    </Modal>
)}



        </>
    );
};

export default GlossaryAdminApp;
