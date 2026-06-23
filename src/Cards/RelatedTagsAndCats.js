import React, { useState, useEffect, useCallback } from '@wordpress/element';
import { Flex, FlexItem, CheckboxControl, Spinner, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { getRestRoot } from '../utils';

const RelatedTagsAndCats = ({
    term,
    terms,
    setTerms,
    setModifiedTerms,
    setUnsavedChanges,
    isAutoSaveEnabled,
    isSaving,
    updateTerm,
}) => {
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);
    const [categoriesPage, setCategoriesPage] = useState(1);
    const [tagsPage, setTagsPage] = useState(1);
    const [categoriesSearch, setCategoriesSearch] = useState('');
    const [tagsSearch, setTagsSearch] = useState('');
    const [hasMoreCategories, setHasMoreCategories] = useState(true);
    const [hasMoreTags, setHasMoreTags] = useState(true);
    

    const updateRelatedTerms = useCallback(
        (updatedRelatedTerms) => {
            setTerms((prevTerms) => {
                const termsCopy = [...prevTerms];
                const modifiedIds = new Set();
    
                termsCopy.forEach((t) => {
                    if (t.id === term.id) {
                        // Only mark the current term as modified if relatedTerms changed
                        if (JSON.stringify(t.relatedTerms) !== JSON.stringify(updatedRelatedTerms)) {
                            t.relatedTerms = updatedRelatedTerms;
                            modifiedIds.add(t.id);
                        }
                    } else if (updatedRelatedTerms.includes(t.id)) {
                        // Ensure bidirectional relationship
                        if (!t.relatedTerms.includes(term.id)) {
                            t.relatedTerms = [...t.relatedTerms, term.id];
                            modifiedIds.add(t.id);
                        }
                    } else {
                        // Remove the relationship if it exists
                        const filteredRelatedTerms = t.relatedTerms.filter((id) => id !== term.id);
                        if (JSON.stringify(t.relatedTerms) !== JSON.stringify(filteredRelatedTerms)) {
                            t.relatedTerms = filteredRelatedTerms;
                            modifiedIds.add(t.id);
                        }
                    }
                });
    
                setModifiedTerms((prev) => new Set([...prev, ...modifiedIds]));
                return termsCopy;
            });
    
            setUnsavedChanges(true);
        },
        [term, setTerms, setModifiedTerms, setUnsavedChanges]
    );
    



    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    const [modifiedCategories, setModifiedCategories] = useState(false);
    const [modifiedTags, setModifiedTags] = useState(false);

    const saveModifiedTerms = useCallback(async () => {
        if (!isAutoSaveEnabled) return; // Prevent saving if auto-save is disabled
    
        try {
            if (modifiedCategories || modifiedTags) {
                const body = {};
                if (modifiedCategories) {
                    body.categories = selectedCategories.map((cat) => cat.id);
                    console.log('selectedCategories', selectedCategories);
                }
                if (modifiedTags) {
                    body.tags = selectedTags.map((tag) => tag.id);
                }
    
                const restRoot = getRestRoot();
                await fetch(`${restRoot}/wp/v2/glossary/${term.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
                    },
                    body: JSON.stringify(body),
                });
    
                setModifiedCategories(false);
                setModifiedTags(false);
            }
        } catch (error) {
            console.error('Error saving categories or tags:', error);
        }
    }, [term.id, selectedCategories, selectedTags, modifiedCategories, modifiedTags, isAutoSaveEnabled]);
    
    
    useEffect(() => {
        if (isAutoSaveEnabled) {
            saveModifiedTerms();
        }
    }, [saveModifiedTerms, isAutoSaveEnabled]);
    

    // Fetch all selected categories by their IDs
    const fetchSelectedCategories = useCallback(async () => {
        if (term.categories?.length > 0) {
            setLoadingCategories(true);
            try {
                const validCategoryIds = term.categories.filter((cat) => cat?.id).map((cat) => cat.id);
    
                if (validCategoryIds.length > 0) {
                    const restRoot = getRestRoot();
                    const response = await fetch(
                        `${restRoot}/wp/v2/categories?include=${validCategoryIds.join(',')}`
                    );
                    if (!response.ok) throw new Error('Failed to fetch selected categories');
                    const data = await response.json();
    
                    const sortedCategories = data.sort((a, b) => a.name.localeCompare(b.name));
                    setSelectedCategories(sortedCategories);
                }
            } catch (error) {
                console.error('Error fetching selected categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        }
    }, [term.categories]);
    
    

    // Fetch all selected tags by their IDs
    const fetchSelectedTags = useCallback(async () => {
        if (term.tags?.length > 0) {
            setLoadingTags(true);
            try {
                // Filter out invalid or empty IDs
                const validTagIds = term.tags.filter((tag) => tag?.id).map((tag) => tag.id);
    
                // Only proceed if there are valid IDs
                if (validTagIds.length > 0) {
                    const restRoot = getRestRoot();
                    const response = await fetch(
                        `${restRoot}/wp/v2/tags?include=${validTagIds.join(',')}`
                    );
                    if (!response.ok) throw new Error('Failed to fetch selected tags');
                    const data = await response.json();
    
                    // Sort tags alphabetically by name
                    const sortedTags = data.sort((a, b) => a.name.localeCompare(b.name));
                    setSelectedTags(sortedTags);
                }
            } catch (error) {
                console.error('Error fetching selected tags:', error);
            } finally {
                setLoadingTags(false);
            }
        }
    }, [term.tags]);
    
    

    // Fetch categories from REST API
    const fetchCategories = useCallback(async (page = 1, search = '') => {
        setLoadingCategories(true);
        try {
            const restRoot = getRestRoot();
            const response = await fetch(`${restRoot}/wp/v2/categories?page=${page}&search=${search}&per_page=20`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories((prev) => (page === 1 ? data : [...prev, ...data]));
            setHasMoreCategories(data.length === 20);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoadingCategories(false);
        }
    }, []);

    // Fetch tags from REST API
    const fetchTags = useCallback(async (page = 1, search = '') => {
        setLoadingTags(true);
        try {
            const restRoot = getRestRoot();
            const response = await fetch(`${restRoot}/wp/v2/tags?page=${page}&search=${search}&per_page=20`);
            if (!response.ok) throw new Error('Failed to fetch tags');
            const data = await response.json();
            setTags((prev) => (page === 1 ? data : [...prev, ...data]));
            setHasMoreTags(data.length === 20);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoadingTags(false);
        }
    }, []);

    // Handle category selection
    const handleTagSelection = (tag, isChecked) => {
        const updatedTags = isChecked
            ? [...selectedTags, tag]
            : selectedTags.filter((t) => t.id !== tag.id);
        
        // Update state and sanitize the array
        setSelectedTags(updatedTags.filter((t) => t?.id));
        setModifiedTags(true);
    
        // Get just the IDs for the term update
        const tagIds = updatedTags.map((t) => t.id).filter(Boolean);
        
        // Update the term with valid tag IDs
        updateTerm(term.id, 'tags', tagIds);
    };
    

    // Handle tag selection
    const handleCategorySelection = (category, isChecked) => {
        const updatedCategories = isChecked
            ? [...selectedCategories, category]
            : selectedCategories.filter((cat) => cat.id !== category.id);
        
        // Update state and sanitize the array
        setSelectedCategories(updatedCategories.filter((cat) => cat?.id));
        setModifiedCategories(true);
    
        // Get just the IDs for the term update
        const categoryIds = updatedCategories.map((cat) => cat.id).filter(Boolean);
        
        // Update the term with valid category IDs
        updateTerm(term.id, 'categories', categoryIds);
    };
    
    

    useEffect(() => {
        fetchCategories();
        fetchTags();
        fetchSelectedCategories();
        fetchSelectedTags();
    }, [fetchCategories, fetchTags, fetchSelectedCategories, fetchSelectedTags]);

    return (
        <Flex className="related-options" style={{ gap: '1rem' }} justify="start">
            {/* Related Terms */}
            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Related Terms', 'acemedia-glossary')}</h3>
                <div className="scroller" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {terms.filter((t) => t.id !== term.id).map((option) => (
                        <CheckboxControl
                            key={option.id}
                            label={option.title}
                            checked={term.relatedTerms.includes(option.id)}
                            onChange={(isChecked) => {
                                const updatedRelatedTerms = isChecked
                                    ? [...term.relatedTerms, option.id]
                                    : term.relatedTerms.filter((id) => id !== option.id);
                                updateRelatedTerms(updatedRelatedTerms);
                            }}
                        />
                    ))}
                </div>
            </FlexItem>

            {/* Related Categories */}
            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Select Categories', 'acemedia-glossary')}</h3>
                <TextControl
                    placeholder={__('Search Categories...', 'acemedia-glossary')}
                    value={categoriesSearch}
                    onChange={(search) => {
                        setCategoriesSearch(search);
                        setCategoriesPage(1);
                        fetchCategories(1, search);
                    }}
                />
                <div
                    className="scroller"
                    onScroll={(e) => {
                        if (
                            hasMoreCategories &&
                            !loadingCategories &&
                            e.target.scrollTop + e.target.clientHeight >= e.target.scrollHeight - 50
                        ) {
                            fetchCategories(categoriesPage + 1, categoriesSearch);
                            setCategoriesPage((prev) => prev + 1);
                        }
                    }}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                    {categories.map((category) => (
                        <CheckboxControl
                            key={category.id}
                            label={category.name}
                            checked={selectedCategories.some((cat) => cat.id === category.id)}
                            onChange={(isChecked) => handleCategorySelection(category, isChecked)}
                        />
                    ))}
                    {loadingCategories && <Spinner />}
                </div>
            </FlexItem>

            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Selected Categories', 'acemedia-glossary')}</h3>
                <div className="scroller" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedCategories
                        .slice() // Create a shallow copy to avoid mutating the original state
                        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by `name`
                        .map((category) => (
                            <CheckboxControl
                                key={category.id}
                                label={category.name}
                                checked
                                onChange={() => handleCategorySelection(category, false)}
                            />
                        ))}
                </div>
            </FlexItem>

            {/* Related Tags */}
            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Select Tags', 'acemedia-glossary')}</h3>
                <TextControl
                    placeholder={__('Search Tags...', 'acemedia-glossary')}
                    value={tagsSearch}
                    onChange={(search) => {
                        setTagsSearch(search);
                        setTagsPage(1);
                        fetchTags(1, search);
                    }}
                />
                <div
                    className="scroller"
                    onScroll={(e) => {
                        if (
                            hasMoreTags &&
                            !loadingTags &&
                            e.target.scrollTop + e.target.clientHeight >= e.target.scrollHeight - 50
                        ) {
                            fetchTags(tagsPage + 1, tagsSearch);
                            setTagsPage((prev) => prev + 1);
                        }
                    }}
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                    {tags.map((tag) => (
                        <CheckboxControl
                            key={tag.id}
                            label={tag.name}
                            checked={selectedTags.some((t) => t.id === tag.id)}
                            onChange={(isChecked) => handleTagSelection(tag, isChecked)}
                        />
                    ))}
                    {loadingTags && <Spinner />}
                </div>
            </FlexItem>

            {/* Selected Tags */}
            <FlexItem style={{ flex: '1 1 30%' }}>
    <h3>{__('Selected Tags', 'acemedia-glossary')}</h3>
    <div className="scroller" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {selectedTags
            .slice() // Create a shallow copy to avoid mutating the original state
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by `name`
            .map((tag) => (
                <CheckboxControl
                    key={tag.id}
                    label={tag.name}
                    checked
                    onChange={() => handleTagSelection(tag, false)}
                />
            ))}
    </div>
</FlexItem>

        </Flex>
    );
};

export default RelatedTagsAndCats;
