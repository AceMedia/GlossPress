import React, { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { Flex, FlexItem, CheckboxControl, Spinner, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { updateRelatedTerms, updateTermCategories, updateTermTags, getRestRoot } from '../utils';
import debounce from 'lodash/debounce';

const RelatedTagsAndCatsOptimized = ({
    term,
    isAutoSaveEnabled,
    isSaving,
    setMessage,
    updateActiveTerm,
    prefetchedCategories = [],
    prefetchedTags = [],
    relatedTermsLookup = {},
    hasMorePrefetchedCategories = true,
    hasMorePrefetchedTags = true,
}) => {
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);
    const [categoriesPage, setCategoriesPage] = useState(1);
    const [tagsPage, setTagsPage] = useState(1);
    const [categoriesSearch, setCategoriesSearch] = useState('');
    const [tagsSearch, setTagsSearch] = useState('');
    const [relatedTermsSearch, setRelatedTermsSearch] = useState('');
    const [hasMoreCategories, setHasMoreCategories] = useState(true);
    const [hasMoreTags, setHasMoreTags] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedRelatedTerms, setSelectedRelatedTerms] = useState([]);
    const [availableTerms, setAvailableTerms] = useState([]);

    // Initialize selected items from term data
    useEffect(() => {
        if (term) {
            setSelectedCategories(term.categories ? term.categories.map(cat => cat.id) : []);
            setSelectedTags(term.tags ? term.tags.map(tag => tag.id) : []);
            setSelectedRelatedTerms(term.relatedTerms || []);
        }
    }, [term]);

    // Initialize with prefetched data for faster initial rendering
    useEffect(() => {
        if (prefetchedCategories.length > 0 && categories.length === 0) {
            setCategories(prefetchedCategories);
            setHasMoreCategories(hasMorePrefetchedCategories);
        }
        if (prefetchedTags.length > 0 && tags.length === 0) {
            setTags(prefetchedTags);
            setHasMoreTags(hasMorePrefetchedTags);
        }
    }, [prefetchedCategories, prefetchedTags, hasMorePrefetchedCategories, hasMorePrefetchedTags, categories.length, tags.length]);

    // Initialize available terms from relatedTermsLookup for faster rendering
    useEffect(() => {
        if (Object.keys(relatedTermsLookup).length > 0) {
            const termsList = Object.entries(relatedTermsLookup).map(([id, title]) => ({
                id: parseInt(id),
                title
            }));
            
            // Sort terms: # first (alphabetically), then all others alphabetically
            termsList.sort((a, b) => {
                const aIsHash = a.title.startsWith('#');
                const bIsHash = b.title.startsWith('#');
                
                // If one starts with # and the other doesn't
                if (aIsHash && !bIsHash) return -1;
                if (!aIsHash && bIsHash) return 1;
                
                // Both have same prefix type, sort alphabetically (case-insensitive)
                return a.title.localeCompare(b.title, undefined, { 
                    sensitivity: 'base',
                    numeric: true 
                });
            });
            
            setAvailableTerms(termsList);
        }
    }, [relatedTermsLookup]);

    // Auto-save changes when auto-save is enabled, or update local state when disabled
    const saveChanges = useCallback(async (type, value) => {
        if (isAutoSaveEnabled && !isSaving) {
            // Auto-save enabled: save immediately to API
            try {
                let response;
                switch (type) {
                    case 'categories':
                        response = await updateTermCategories(term.id, value, true); // Pass autosave flag
                        break;
                    case 'tags':
                        response = await updateTermTags(term.id, value, true); // Pass autosave flag
                        break;
                    case 'related':
                        response = await updateRelatedTerms(term.id, value, relatedTermsLookup);
                        break;
                }
                
                // Handle autosave response differently
                if (response.autosave) {
                    // Enhanced messaging for related terms
                    if (type === 'related' && response.termInfo) {
                        const { currentTerm, relatedTerms } = response.termInfo;
                        if (relatedTerms.length > 0) {
                            const termsList = relatedTerms.join(', ');
                            setMessage(`${currentTerm} now related to: ${termsList} (autosave)`);
                        } else {
                            setMessage(`All related terms removed from ${currentTerm} (autosave)`);
                        }
                    } else {
                        setMessage(`${type} saved (autosave)`);
                    }
                } else {
                    // Enhanced messaging for related terms
                    if (type === 'related' && response.termInfo) {
                        const { currentTerm, relatedTerms } = response.termInfo;
                        if (relatedTerms.length > 0) {
                            const termsList = relatedTerms.join(', ');
                            setMessage(`${currentTerm} now related to: ${termsList}`);
                        } else {
                            setMessage(`All related terms removed from ${currentTerm}`);
                        }
                    } else {
                        setMessage(`${type} updated successfully`);
                    }
                }
                setTimeout(() => setMessage(''), 2000);
                
                // Log debug information if available
                if (response?.debug) {
                    console.log(`Debug info for ${type} update:`, response.debug);
                }
            } catch (error) {
                console.error(`Error updating ${type}:`, error);
                
                // More detailed error messaging
                let errorMessage = `Error updating ${type}`;
                if (error.message) {
                    errorMessage += `: ${error.message}`;
                } else if (error.data?.message) {
                    errorMessage += `: ${error.data.message}`;
                }
                
                setMessage(errorMessage);
                setTimeout(() => setMessage(''), 5000); // Show error longer
            }
        } else {
            // Auto-save disabled: update local state only (no API calls)
            if (updateActiveTerm) {
                switch (type) {
                    case 'categories':
                        const categoryData = categories.filter(cat => value.includes(cat.id));
                        updateActiveTerm('categories', categoryData);
                        break;
                    case 'tags':
                        const tagData = tags.filter(tag => value.includes(tag.id));
                        updateActiveTerm('tags', tagData);
                        break;
                    case 'related':
                        updateActiveTerm('relatedTerms', value);
                        break;
                }
            }
        }
    }, [term?.id, isAutoSaveEnabled, isSaving, setMessage, updateActiveTerm, categories, tags, updateTermCategories, updateTermTags, updateRelatedTerms]);

    // Debounced save for non-auto-save mode to reduce API calls
    const debouncedSaveChanges = useMemo(() => 
        debounce((type, value) => {
            if (isAutoSaveEnabled) {
                saveChanges(type, value);
            }
        }, 300), // 300ms debounce for API calls
    [saveChanges, isAutoSaveEnabled]);

    // Optimized handlers that update UI immediately and debounce API calls
    // Handle category selection with immediate UI update
    const handleCategorySelection = useCallback((category, isChecked) => {
        const newCategories = isChecked
            ? [...selectedCategories, category.id]
            : selectedCategories.filter(id => id !== category.id);
        
        // Update UI immediately
        setSelectedCategories(newCategories);
        
        // Handle save based on auto-save setting
        if (isAutoSaveEnabled) {
            debouncedSaveChanges('categories', newCategories);
        } else {
            // Immediate local state update for non-auto-save mode
            saveChanges('categories', newCategories);
        }
    }, [selectedCategories, isAutoSaveEnabled, debouncedSaveChanges, saveChanges]);

    // Handle tag selection with immediate UI update
    const handleTagSelection = useCallback((tag, isChecked) => {
        const newTags = isChecked
            ? [...selectedTags, tag.id]
            : selectedTags.filter(id => id !== tag.id);
        
        // Update UI immediately
        setSelectedTags(newTags);
        
        // Handle save based on auto-save setting
        if (isAutoSaveEnabled) {
            debouncedSaveChanges('tags', newTags);
        } else {
            // Immediate local state update for non-auto-save mode
            saveChanges('tags', newTags);
        }
    }, [selectedTags, isAutoSaveEnabled, debouncedSaveChanges, saveChanges]);

    // Handle related terms selection with immediate UI update
    const handleRelatedTermSelection = useCallback((termId, isChecked) => {
        const newRelatedTerms = isChecked
            ? [...selectedRelatedTerms, termId]
            : selectedRelatedTerms.filter(id => id !== termId);
        
        // Update UI immediately
        setSelectedRelatedTerms(newRelatedTerms);
        
        // Handle save based on auto-save setting
        if (isAutoSaveEnabled) {
            debouncedSaveChanges('related', newRelatedTerms);
        } else {
            // Immediate local state update for non-auto-save mode
            saveChanges('related', newRelatedTerms);
        }
    }, [selectedRelatedTerms, isAutoSaveEnabled, debouncedSaveChanges, saveChanges]);

    // Fetch categories from REST API (only when needed - search or load more)
    const fetchCategories = useCallback(async (page = 1, search = '') => {
        // Skip if we have prefetched data and this is the initial load without search
        if (page === 1 && !search && prefetchedCategories.length > 0 && categories.length === 0) {
            return; // Data will be set by the prefetch useEffect
        }
        
        setLoadingCategories(true);
        try {
            const restRoot = getRestRoot();
            const response = await fetch(
                `${restRoot}/wp/v2/categories?per_page=10&page=${page}&search=${search}`,
                {
                    headers: {
                        'X-WP-Nonce': window.AceMediaGlossaryAdmin?.nonce || '',
                    },
                }
            );
            const data = await response.json();
            
            if (page === 1) {
                setCategories(data);
            } else {
                setCategories(prev => [...prev, ...data]);
            }
            
            setHasMoreCategories(data.length === 10);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    // Fetch tags from REST API (only when needed - search or load more)
    const fetchTags = useCallback(async (page = 1, search = '') => {
        // Skip if we have prefetched data and this is the initial load without search
        if (page === 1 && !search && prefetchedTags.length > 0 && tags.length === 0) {
            return; // Data will be set by the prefetch useEffect
        }
        
        setLoadingTags(true);
        try {
            const restRoot = getRestRoot();
            const response = await fetch(
                `${restRoot}/wp/v2/tags?per_page=10&page=${page}&search=${search}`,
                {
                    headers: {
                        'X-WP-Nonce': window.AceMediaGlossaryAdmin?.nonce || '',
                    },
                }
            );
            const data = await response.json();
            
            if (page === 1) {
                setTags(data);
            } else {
                setTags(prev => [...prev, ...data]);
            }
            
            setHasMoreTags(data.length === 10);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoadingTags(false);
        }
    }, []);

    // Fetch available terms for related terms selection (optimized with lookup)
    const fetchAvailableTerms = useCallback(async () => {
        // If we have relatedTermsLookup, use it instead of fetching
        if (Object.keys(relatedTermsLookup).length > 0) {
            const termsList = Object.entries(relatedTermsLookup)
                .filter(([id]) => parseInt(id) !== term?.id) // Filter out current term
                .map(([id, title]) => ({
                    id: parseInt(id),
                    title
                }));
            
            // Sort terms: # first (alphabetically), then all others alphabetically
            termsList.sort((a, b) => {
                const aIsHash = a.title.startsWith('#');
                const bIsHash = b.title.startsWith('#');
                
                // If one starts with # and the other doesn't
                if (aIsHash && !bIsHash) return -1;
                if (!aIsHash && bIsHash) return 1;
                
                // Both have same prefix type, sort alphabetically (case-insensitive)
                return a.title.localeCompare(b.title, undefined, { 
                    sensitivity: 'base',
                    numeric: true 
                });
            });
            
            setAvailableTerms(termsList);
            return;
        }
        
        // Fallback to API call if lookup is not available
        try {
            const restRoot = getRestRoot();
            const response = await fetch(`${restRoot}/wp/v2/glossary`, {
                headers: {
                    'X-WP-Nonce': window.AceMediaGlossaryAdmin?.nonce || '',
                },
            });
            const data = await response.json();
            // Filter out the current term and sort
            const filteredTerms = data.filter(t => t.id !== term?.id);
            
            // Sort the fallback data too
            filteredTerms.sort((a, b) => {
                const aTitle = a.title?.rendered || a.title;
                const bTitle = b.title?.rendered || b.title;
                const aIsHash = aTitle.startsWith('#');
                const bIsHash = bTitle.startsWith('#');
                
                if (aIsHash && !bIsHash) return -1;
                if (!aIsHash && bIsHash) return 1;
                
                return aTitle.localeCompare(bTitle, undefined, { 
                    sensitivity: 'base',
                    numeric: true 
                });
            });
            
            setAvailableTerms(filteredTerms);
        } catch (error) {
            console.error('Error fetching available terms:', error);
        }
    }, [term?.id, relatedTermsLookup]);

    // Search handlers
    const handleCategorySearch = useCallback((search) => {
        setCategoriesSearch(search);
        setCategoriesPage(1);
        fetchCategories(1, search);
    }, [fetchCategories]);

    const handleTagSearch = useCallback((search) => {
        setTagsSearch(search);
        setTagsPage(1);
        fetchTags(1, search);
    }, [fetchTags]);

    const handleRelatedTermsSearch = useCallback((search) => {
        setRelatedTermsSearch(search);
    }, []);

    // Filter related terms based on search
    const filteredRelatedTerms = useMemo(() => {
        if (!relatedTermsSearch) return availableTerms;
        const searchLower = relatedTermsSearch.toLowerCase();
        return availableTerms.filter(term => 
            term.title.toLowerCase().includes(searchLower)
        );
    }, [availableTerms, relatedTermsSearch]);

    // Initial load (conditional based on prefetched data)
    useEffect(() => {
        // Only fetch if we don't have prefetched data
        if (prefetchedCategories.length === 0) {
            fetchCategories();
        }
        if (prefetchedTags.length === 0) {
            fetchTags();
        }
        // Always try to fetch available terms (optimized internally)
        fetchAvailableTerms();
    }, [fetchCategories, fetchTags, fetchAvailableTerms, prefetchedCategories.length, prefetchedTags.length]);

    if (!term) {
        return null;
    }

    return (
        <div className="related-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Categories Section */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>{__('Categories', 'acemedia-glossary')}</h4>
                <TextControl
                    placeholder={__('Search categories...', 'acemedia-glossary')}
                    value={categoriesSearch}
                    onChange={handleCategorySearch}
                />
                {loadingCategories && <Spinner />}
                <div style={{ maxHeight: '300px', overflowY: 'auto', flex: '1', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                    {categories.map(category => (
                        <CheckboxControl
                            key={category.id}
                            label={category.name}
                            checked={selectedCategories.includes(category.id)}
                            onChange={(isChecked) => handleCategorySelection(category, isChecked)}
                        />
                    ))}
                </div>
                {hasMoreCategories && !loadingCategories && (
                    <button
                        style={{ marginTop: '10px' }}
                        onClick={() => {
                            const nextPage = categoriesPage + 1;
                            setCategoriesPage(nextPage);
                            fetchCategories(nextPage, categoriesSearch);
                        }}
                    >
                        {__('Load More Categories', 'acemedia-glossary')}
                    </button>
                )}
            </div>

            {/* Tags Section */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>{__('Tags', 'acemedia-glossary')}</h4>
                <TextControl
                    placeholder={__('Search tags...', 'acemedia-glossary')}
                    value={tagsSearch}
                    onChange={handleTagSearch}
                />
                {loadingTags && <Spinner />}
                <div style={{ maxHeight: '300px', overflowY: 'auto', flex: '1', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                    {tags.map(tag => (
                        <CheckboxControl
                            key={tag.id}
                            label={tag.name}
                            checked={selectedTags.includes(tag.id)}
                            onChange={(isChecked) => handleTagSelection(tag, isChecked)}
                        />
                    ))}
                </div>
                {hasMoreTags && !loadingTags && (
                    <button
                        style={{ marginTop: '10px' }}
                        onClick={() => {
                            const nextPage = tagsPage + 1;
                            setTagsPage(nextPage);
                            fetchTags(nextPage, tagsSearch);
                        }}
                    >
                        {__('Load More Tags', 'acemedia-glossary')}
                    </button>
                )}
            </div>

            {/* Related Terms Section */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>{__('Related Terms', 'acemedia-glossary')}</h4>
                <TextControl
                    placeholder={__('Search related terms...', 'acemedia-glossary')}
                    value={relatedTermsSearch}
                    onChange={handleRelatedTermsSearch}
                />
                <div style={{ maxHeight: '300px', overflowY: 'auto', flex: '1', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                    {filteredRelatedTerms.map(availableTerm => (
                        <CheckboxControl
                            key={availableTerm.id}
                            label={availableTerm.title}
                            checked={selectedRelatedTerms.includes(availableTerm.id)}
                            onChange={(isChecked) => handleRelatedTermSelection(availableTerm.id, isChecked)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelatedTagsAndCatsOptimized;
