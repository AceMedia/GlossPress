import React, { useState, useEffect } from '@wordpress/element';
import { PanelBody, Button, TextControl, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags } from '@fortawesome/free-solid-svg-icons';

const TagsAndCategoriesFilter = ({
    tags,
    setTags,
    categories,
    setCategories,
    tagFilter,
    categoryFilter,
    setTagFilter,
    setCategoryFilter,
}) => {
    const [currentPage, setCurrentPage] = useState(1); // Track current page for tags
    const [isFetchingTags, setIsFetchingTags] = useState(false); // Track fetching state for tags
    const [isFetchingCategories, setIsFetchingCategories] = useState(false); // Track fetching state for categories
    const [hasMoreTags, setHasMoreTags] = useState(true); // Track if more tags are available
    const [hasMoreCategories, setHasMoreCategories] = useState(true); // Track if more categories are available
    const [tagSearchTerm, setTagSearchTerm] = useState(''); // Track tag search input
    const [categorySearchTerm, setCategorySearchTerm] = useState(''); // Track category search input
    const [originalTags, setOriginalTags] = useState([]); // Store original tags for reset
    const [originalCategories, setOriginalCategories] = useState([]); // Store original categories for reset

    const [isTagsPanelOpen, setIsTagsPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isTagsPanelOpen')) || false
    );
    const [isCategoriesPanelOpen, setIsCategoriesPanelOpen] = useState(
        () => JSON.parse(localStorage.getItem('isCategoriesPanelOpen')) || false
    );

    useEffect(() => {
        localStorage.setItem('isTagsPanelOpen', JSON.stringify(isTagsPanelOpen));
    }, [isTagsPanelOpen]);

    useEffect(() => {
        localStorage.setItem('isCategoriesPanelOpen', JSON.stringify(isCategoriesPanelOpen));
    }, [isCategoriesPanelOpen]);

    const handleTagChange = (selectedTag) => {
        setTagFilter((prev) => {
            if (selectedTag === 'all_tags') {
                return []; // Reset to all tags
            }
            if (prev.includes(selectedTag)) {
                return prev.filter((tag) => tag !== selectedTag); // Remove tag if already selected
            }
            return [...prev, selectedTag]; // Add tag
        });
    };

    const handleCategoryChange = (selectedCategory) => {
        setCategoryFilter((prev) => {
            if (selectedCategory === 'all_categories') {
                return []; // Reset to all categories
            }
            if (prev.includes(selectedCategory)) {
                return prev.filter((cat) => cat !== selectedCategory); // Remove category if already selected
            }
            return [...prev, selectedCategory]; // Add category
        });
    };

    const fetchTags = async (page = 1, search = '') => {
        if (isFetchingTags || (!hasMoreTags && search === '')) return;
        setIsFetchingTags(true);
        try {
            const response = await fetch(`/wp-json/wp/v2/tags?per_page=10&page=${page}&search=${search}`);
            if (!response.ok) throw new Error('Failed to fetch tags');
            const newTags = await response.json();

            setTags((prevTags) =>
                page === 1 || search ? newTags.map((tag) => ({ label: tag.name, value: tag.id })) : [
                    ...prevTags,
                    ...newTags.map((tag) => ({ label: tag.name, value: tag.id })),
                ]
            );

            if (newTags.length < 10 && search === '') setHasMoreTags(false);
            if (!search) setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setIsFetchingTags(false);
        }
    };

    const fetchCategories = async (page = 1, search = '') => {
        if (isFetchingCategories || (!hasMoreCategories && search === '')) return;
        setIsFetchingCategories(true);
        try {
            const response = await fetch(`/wp-json/wp/v2/categories?per_page=10&page=${page}&search=${search}`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const newCategories = await response.json();

            setCategories((prevCategories) =>
                page === 1 || search
                    ? newCategories.map((category) => ({ label: category.name, value: category.id }))
                    : [...prevCategories, ...newCategories.map((category) => ({ label: category.name, value: category.id }))]
            );

            if (newCategories.length < 10 && search === '') {
                setHasMoreCategories(false); // No more pages
            }
            if (!search) {
                setCurrentPage((prevPage) => prevPage + 1); // Increment current page only if not searching
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setIsFetchingCategories(false);
        }
    };

    useEffect(() => {
        if (!originalTags.length) setOriginalTags(tags);
        if (!originalCategories.length) setOriginalCategories(categories);
    }, [tags, categories]);

    const handleTagSearch = (search) => {
        setTagSearchTerm(search);
        if (search.trim() === '') {
            setTags(originalTags); // Reset to original tags
            setHasMoreTags(true);
            setCurrentPage(1);
        } else {
            fetchTags(1, search);
        }
    };

    const handleCategorySearch = (search) => {
        setCategorySearchTerm(search);
        if (search.trim() === '') {
            setCategories(originalCategories); // Reset to original categories
            setHasMoreCategories(true);
        } else {
            fetchCategories(1, search);
        }
    };

    return (
        <>
            <PanelBody
                title={<span><FontAwesomeIcon icon={faTags} /> {__('Tags', 'acemedia-glossary')}</span>}
                initialOpen={isTagsPanelOpen}
                onToggle={() => setIsTagsPanelOpen((prev) => !prev)}
            >
                <TextControl
                    placeholder={__('Search Tags...', 'acemedia-glossary')}
                    value={tagSearchTerm}
                    onChange={handleTagSearch}
                    autoComplete="off"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                    {[{ label: 'All Tags', value: 'all_tags' }, ...tags].map((tag) => (
                        <Button
                            key={tag.value}
                            isPressed={
                                tag.value === 'all_tags'
                                    ? tagFilter.length === 0
                                    : tagFilter.includes(tag.value)
                            }
                            onClick={() => handleTagChange(tag.value)}
                            className="toggle-button"
                        >
                            {tag.label}
                        </Button>
                    ))}
                    {isFetchingTags && <Spinner />}
                    {hasMoreTags && !tagSearchTerm && (
                        <Button
                            onClick={() => fetchTags(currentPage + 1)}
                            disabled={isFetchingTags}
                            className="toggle-button"
                        >
                            {__('Show More')}
                        </Button>
                    )}
                </div>
            </PanelBody>

            <PanelBody
                title={<span><FontAwesomeIcon icon={faTags} /> {__('Categories', 'acemedia-glossary')}</span>}
                initialOpen={isCategoriesPanelOpen}
                onToggle={() => setIsCategoriesPanelOpen((prev) => !prev)}
            >
                <TextControl
                    placeholder={__('Search Categories...', 'acemedia-glossary')}
                    value={categorySearchTerm}
                    onChange={handleCategorySearch}
                    autoComplete="off"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                    {[{ label: 'All Categories', value: 'all_categories' }, ...categories].map((category) => (
                        <Button
                            key={category.value}
                            isPressed={
                                category.value === 'all_categories'
                                    ? categoryFilter.length === 0
                                    : categoryFilter.includes(category.value)
                            }
                            onClick={() => handleCategoryChange(category.value)}
                            className="toggle-button"
                        >
                            {category.label}
                        </Button>
                    ))}
                    {isFetchingCategories && <Spinner />}
                    {hasMoreCategories && !categorySearchTerm && (
                        <Button
                            onClick={() => fetchCategories(currentPage + 1)}
                            disabled={isFetchingCategories}
                            className="toggle-button"
                        >
                            {__('Show More')}
                        </Button>
                    )}
                </div>
            </PanelBody>
        </>
    );
};

export default TagsAndCategoriesFilter;
