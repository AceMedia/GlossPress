import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { Button,  
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption, ToggleControl, PanelRow, TextControl, TextareaControl, CheckboxControl, Card, CardHeader, CardBody, PanelBody, IconButton, Notice, Flex, FlexItem, Tooltip, SelectControl, FlexBlock, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faAnchor, faEdit, faEye, faCheckDouble } from '@fortawesome/free-solid-svg-icons';



import Sidebar from './SideBar/SideBar';
import SaveBar from './SaveBar/SaveBar';
import './styles/scss/settings.scss';


import { 
    decodeHTMLEntities, 
    debounce, 
    fetchLogs, 
    clearLogs, 
    saveCss, 
    fetchFromAPI,
    setupDragAndDrop,
    fetchSingleTerm,
    updateRelatedTerms,
    updateTermCategories,
    updateTermTags,
    fetchPrefetchData,
    fetchRelatedTermsLookup
} from './utils';

import Modals from './Modals';
import CardsOptimized from './Cards/CardsOptimized';



const DEBOUNCE_DELAY = 2000;

const GlossaryAdminApp = () => {
    const [terms, setTerms] = useState([]);
    const [activeTerm, setActiveTerm] = useState(null); // Currently loaded full term data
    const [modifiedTerms, setModifiedTerms] = useState(new Set());
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [message, setMessage] = useState('');
    const [sortOption, setSortOption] = useState('alphabetical');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingTerm, setIsLoadingTerm] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
    const [loadTime, setLoadTime] = useState(null);
    const debounceTimerRef = useRef(null);
    const [buttonText, setButtonText] = useState('Save Changes');
    const [searchQuery, setSearchQuery] = useState('');
    const isInitialLoad = useRef(true);
    const [logs, setLogs] = useState('');
    const [customCss, setCustomCss] = useState(''); // State for custom CSS
    const [isDragging, setIsDragging] = useState(false);
    const [quickEdit, setQuickEdit] = useState('false'); // Initialize quickEdit state
    const [selectedTerms, setSelectedTerms] = useState([]);
    const [autoHighlight, setAutoHighlight] = useState(false);
    const isSavingRef = useRef(false);
    const [newTermTitle, setNewTermTitle] = useState('');
    const [newTermContent, setNewTermContent] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const [tagFilter, setTagFilter] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCssModalOpen, setIsCssModalOpen] = useState(false); // State for the CSS modal
    
    // Prefetched data for faster card rendering
    const [prefetchedCategories, setPrefetchedCategories] = useState([]);
    const [prefetchedTags, setPrefetchedTags] = useState([]);
    const [relatedTermsLookup, setRelatedTermsLookup] = useState({});
    const [hasMorePrefetchedCategories, setHasMorePrefetchedCategories] = useState(true);
    const [hasMorePrefetchedTags, setHasMorePrefetchedTags] = useState(true);

    // Fetch the initial value from wp_option on component mount
    useEffect(() => {
        fetchFromAPI('/wp-json/wp/v2/options/auto_highlight' ) // Updated to match registered route
            .then((data) => {
                setAutoHighlight(data.value === true); // Convert response value to boolean
            })
            .catch((error) => console.error('Error fetching auto_highlight option:', error));
    }, []);

    // Prefetch data for faster card rendering
    useEffect(() => {
        const prefetchData = async () => {
            try {
                // Prefetch categories and tags
                const prefetchResponse = await fetchPrefetchData();
                setPrefetchedCategories(prefetchResponse.categories || []);
                setPrefetchedTags(prefetchResponse.tags || []);
                setHasMorePrefetchedCategories(prefetchResponse.hasMoreCategories || false);
                setHasMorePrefetchedTags(prefetchResponse.hasMoreTags || false);

                // Prefetch related terms lookup
                const lookupResponse = await fetchRelatedTermsLookup();
                setRelatedTermsLookup(lookupResponse || {});
            } catch (error) {
                console.error('Error prefetching data:', error);
            }
        };

        prefetchData();
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

    const saveTerms = useCallback((isAutoSave = false) => {
        if (!unsavedChanges || isSavingRef.current) return;
    
        setIsSaving(true);
        isSavingRef.current = true;
    
        // Only save the active term if it exists and has been modified
        const termsToSave = [];
        if (activeTerm && modifiedTerms.has(activeTerm.id)) {
            // Format the data to match API expectations
            const termData = {
                id: activeTerm.id,
                title: activeTerm.title,
                content: activeTerm.content || '',
                relatedTerms: activeTerm.relatedTerms || [],
                categories: activeTerm.categories ? activeTerm.categories.map((cat) => typeof cat === 'object' ? cat.id : cat) : [],
                tags: activeTerm.tags ? activeTerm.tags.map((tag) => typeof tag === 'object' ? tag.id : tag) : [],
            };
            console.log('Saving term data:', termData);
            termsToSave.push(termData);
        }

        if (termsToSave.length === 0) {
            setIsSaving(false);
            isSavingRef.current = false;
            return;
        }

        const startTime = performance.now();
        const savePromises = termsToSave.map((term) =>
            apiFetch({
                path: '/wp-json/wp/v2/glossary',
                method: 'POST',
                data: term,
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            })
        );
    
        Promise.all(savePromises)
    .then((responses) => {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        // Update the activeTerm with the saved data
        if (activeTerm && responses.length > 0) {
            const savedId = responses[0].id;
            setActiveTerm(prev => ({ ...prev, modified: new Date().toISOString() }));
            
            // Update the term in the terms list
            setTerms(prevTerms => 
                prevTerms.map(term => 
                    term.id === savedId 
                        ? { ...term, title: activeTerm.title, modified: new Date().toISOString() }
                        : term
                )
            );
        }

        setModifiedTerms(new Set());
        setUnsavedChanges(false);
        isSavingRef.current = false;

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
        isSavingRef.current = false;
    })
    .finally(() => {
        setIsSaving(false);
    });
    }, [activeTerm, modifiedTerms, unsavedChanges]);




    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);



    // Fetch glossary terms (summary data only), categories, and tags once on component mount
    useEffect(() => {
        const startTime = performance.now();
    
        fetchFromAPI('/wp-json/wp/v2/glossary')
            .then((data) => {
                const endTime = performance.now();
                setLoadTime(endTime - startTime);
                setTerms(data); // Data now includes only summary information
            })
            .catch((error) => {
                console.error('Error loading terms:', error);
                setLoadTime(null);
            });
    
        fetchFromAPI('/wp-json/wp/v2/categories' )
            .then((data) => setCategories(data.map(cat => ({
                label: cat.name,
                value: cat.id,
            }))))
            .catch((error) => console.error('Error loading categories:', error));

        fetchFromAPI('/wp-json/wp/v2/tags?per_page=10' )
            .then((data) => setTags(data.map(tag => ({
                label: tag.name,
                value: tag.id,
            }))))
            .catch((error) => console.error('Error loading tags:', error));
    }, []);
    





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
    const cleanup = setupDragAndDrop({
        onFileDrop: async (importedTerms) => {
            return await apiFetch({
                path: '/wp-json/wp/v2/glossary/import',
                method: 'POST',
                data: importedTerms,
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            });
        },
        setIsDragging,
        setMessage,
        clearLogs,
        setIsSaving,
        fetchLogs,
        setLoadTime,
        setTerms,
        setLogs, // Pass setLogs here
    });

    return cleanup;
}, [setIsDragging, setMessage, clearLogs, setIsSaving, fetchLogs, setLoadTime, setTerms, setLogs]);

    
    
    
    
    
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




    const onSave = useCallback(() => saveTerms(), [saveTerms]);

    const displayedTerms = useMemo(() => {
        if (!terms.length) return {}; // Fallback for empty terms list
    
        let filteredTerms = terms;
    
        // Apply search query filtering (only on title since content is not loaded)
        if (debouncedSearchQuery) {
            filteredTerms = filteredTerms.filter((term) =>
                term.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }
    
        // Apply tag and category filtering using IDs
        if (tagFilter.length > 0) {
            filteredTerms = filteredTerms.filter((term) =>
                term.tagIds && term.tagIds.some((tagId) => tagFilter.includes(tagId))
            );
        }
    
        if (categoryFilter.length > 0) {
            filteredTerms = filteredTerms.filter((term) =>
                term.categoryIds && term.categoryIds.some((catId) => categoryFilter.includes(catId))
            );
        }
    
        // Apply sorting
        const sortedTerms = filteredTerms.sort((a, b) => {
            if (sortOption === 'alphabetical') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'created') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortOption === 'updated') {
                return new Date(b.modified) - new Date(a.modified);
            }
            return 0;
        });
    
        // Group alphabetically if required
        if (sortOption === 'alphabetical') {
            return sortedTerms.reduce((acc, term) => {
                const firstLetter = decodeHTMLEntities(term.title).charAt(0).toUpperCase();
                if (!acc[firstLetter]) acc[firstLetter] = [];
                acc[firstLetter].push(term);
                return acc;
            }, {});
        }
    
        return { All: sortedTerms };
    }, [terms, sortOption, debouncedSearchQuery, tagFilter, categoryFilter]);
           


    


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

    setIsSaving(true);

    const confirmDelete = window.confirm(
        __('Are you sure you want to delete the selected terms? This action cannot be undone.', 'acemedia-glossary')
    );

    if (!confirmDelete) {
        setIsSaving(false); // Reset saving state if canceled
        return;
    }

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
        setTerms((prevTerms) => {
            const updatedTerms = prevTerms.filter((term) => !deletedIds.includes(term.id));
            
            // Check if terms are empty and reset Quick Edit if true
            if (updatedTerms.length === 0) {
                setQuickEdit('false');
            }

            return updatedTerms;
        });

        setSelectedTerms([]); // Clear selection
        setMessage(__('Selected terms deleted successfully.', 'acemedia-glossary'));
    } catch (error) {
        console.error('Error deleting selected terms:', error);
        setMessage(__('Failed to delete selected terms. Please try again.', 'acemedia-glossary'));
    } finally {
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    }
};

// Function to remove a single term
const removeTerm = async (termId) => {
    setIsSaving(true);

    try {
        const response = await fetch(`${AceMediaGlossaryAdmin.apiUrl}wp/v2/glossary/${termId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
            },
        });

        if (!response.ok) {
            throw new Error(__('Failed to delete term.', 'acemedia-glossary'));
        }

        // Update terms after successful deletion
        setTerms((prevTerms) => {
            const updatedTerms = prevTerms.filter((term) => term.id !== termId);
            
            // Check if terms are empty and reset Quick Edit if true
            if (updatedTerms.length === 0) {
                setQuickEdit('false');
            }

            return updatedTerms;
        });

        // Close the active term if it was the one deleted
        if (activeTerm && activeTerm.id === termId) {
            closeActiveTerm();
        }

        setMessage(__('Term deleted successfully.', 'acemedia-glossary'));
    } catch (error) {
        console.error('Error deleting term:', error);
        setMessage(__('Failed to delete term. Please try again.', 'acemedia-glossary'));
    } finally {
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    }
};


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


  
    
useEffect(() => {
    fetchLogs(setLogs);
}, []);
    
    
    // Function to load a single term with full data
    const loadSingleTerm = useCallback(async (termId) => {
        if (activeTerm && activeTerm.id === termId) {
            return activeTerm; // Already loaded
        }

        setIsLoadingTerm(true);
        try {
            const termData = await fetchSingleTerm(termId);
            
            // Ensure the term is marked as open when we set it as active
            const activeTermData = {
                ...termData,
                isOpen: true,
                isLoaded: true
            };
            
            setActiveTerm(activeTermData);
            
            // Update the terms list to mark this term as loaded and open
            setTerms(prevTerms => 
                prevTerms.map(term => ({
                    ...term,
                    isOpen: term.id === termId,
                    isLoaded: term.id === termId ? true : term.isLoaded
                }))
            );
            
            return activeTermData;
        } catch (error) {
            console.error('Error loading term:', error);
            setMessage('Error loading term data');
            setTimeout(() => setMessage(''), 3000);
            return null;
        } finally {
            setIsLoadingTerm(false);
        }
    }, [activeTerm]);

    // Function to close the active term
    const closeActiveTerm = useCallback(() => {
        setActiveTerm(null);
        setTerms(prevTerms => 
            prevTerms.map(term => ({ ...term, isOpen: false }))
        );
    }, []);

    // Function to update active term data
    const updateActiveTerm = useCallback((key, value) => {
        if (!activeTerm) return;
        
        console.log('updateActiveTerm called:', { key, value, termId: activeTerm.id });
        setActiveTerm(prev => ({ ...prev, [key]: value }));
        setModifiedTerms(prev => new Set([...prev, activeTerm.id]));
        setUnsavedChanges(true);
    }, [activeTerm]);

    // Separate optimized function for title sync to avoid re-rendering all terms
    const updateActiveTermTitle = useCallback((title) => {
        if (!activeTerm) return;
        
        setActiveTerm(prev => ({ ...prev, title }));
        setModifiedTerms(prev => new Set([...prev, activeTerm.id]));
        setUnsavedChanges(true);
        
        // Update title in terms list more efficiently
        setTerms(prevTerms => {
            const termIndex = prevTerms.findIndex(term => term.id === activeTerm.id);
            if (termIndex === -1) return prevTerms;
            
            const newTerms = [...prevTerms];
            newTerms[termIndex] = { ...newTerms[termIndex], title };
            return newTerms;
        });
    }, [activeTerm]);
    
    return (
        <>
        <div className={`admin-ui ${isDragging ? 'dragging' : ''}`}>
            {isDragging && (
                <div className="drag-overlay">
                    <p>Drop your file anywhere to import!</p>
                </div>
            )}
            <Flex alignItems="flex-start" className='main-panel'>
                
            <Sidebar
                tags={tags}
                setTags={setTags}
                setCategories={setCategories}
                categories={categories}
                sortOption={sortOption}
                setSortOption={setSortOption}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                tagFilter={tagFilter}
                categoryFilter={categoryFilter}
                autoHighlight={autoHighlight}
                setAutoHighlight={setAutoHighlight}
                saveAutoHighlightOption={saveAutoHighlightOption}
                customCss={customCss}
                setIsCssModalOpen={setIsCssModalOpen}
                handleDownload={handleDownload}
                unsavedChanges={unsavedChanges}
                setTagFilter={setTagFilter} // Pass setter instead of handlers
                setCategoryFilter={setCategoryFilter} 
                logs={logs}
                displayedTerms={displayedTerms}
                fetchLogs={() => {/* Logic to fetch logs */}}
                clearLogs={() => {/* Logic to clear logs */}}
            />



<CardsOptimized
    displayedTerms={displayedTerms}
    loadTime={loadTime}
    terms={terms}
    activeTerm={activeTerm}
    setActiveTerm={setActiveTerm}
    categories={categories}
    tags={tags}
    sortOption={sortOption}
    setSortOption={setSortOption}
    quickEdit={quickEdit}
    selectedTerms={selectedTerms}
    setSelectedTerms={setSelectedTerms}
    setTerms={setTerms}
    setModifiedTerms={setModifiedTerms}
    setUnsavedChanges={setUnsavedChanges}
    setQuickEdit={setQuickEdit}
    setMessage={setMessage}
    setIsSaving={setIsSaving}
    isAutoSaveEnabled={isAutoSaveEnabled}
    isSaving={isSaving}
    isLoadingTerm={isLoadingTerm}
    loadSingleTerm={loadSingleTerm}
    closeActiveTerm={closeActiveTerm}
    updateActiveTerm={updateActiveTerm}
    updateActiveTermTitle={updateActiveTermTitle}
    removeTerm={removeTerm}
    prefetchedCategories={prefetchedCategories}
    prefetchedTags={prefetchedTags}
    relatedTermsLookup={relatedTermsLookup}
    hasMorePrefetchedCategories={hasMorePrefetchedCategories}
    hasMorePrefetchedTags={hasMorePrefetchedTags}
/>




            </Flex>



            </div>

            <SaveBar
    onSave={onSave}
    setUnsavedChanges={setUnsavedChanges}
    unsavedChanges={unsavedChanges}
    isAutoSaveEnabled={isAutoSaveEnabled}
    setIsAutoSaveEnabled={setIsAutoSaveEnabled}
    message={message}
    isSaving={isSaving}
    setIsSaving={setIsSaving} 
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


<Modals
    isModalOpen={isModalOpen}
    isCssModalOpen={isCssModalOpen}
    newTermTitle={newTermTitle}
    newTermContent={newTermContent}
    customCss={customCss}
    setIsModalOpen={setIsModalOpen}
    setIsCssModalOpen={setIsCssModalOpen}
    setNewTermTitle={setNewTermTitle}
    setNewTermContent={setNewTermContent}
    setCustomCss={setCustomCss}
    setTerms={setTerms}
    setModifiedTerms={setModifiedTerms}
    setUnsavedChanges={setUnsavedChanges}
    setMessage={setMessage}
    saveCss={saveCss}
    apiFetch={apiFetch}
/>


        </>
    );
};

export default GlossaryAdminApp;
