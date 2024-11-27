import React, { useState, useEffect, useMemo } from '@wordpress/element';
import { PanelBody, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags } from '@fortawesome/free-solid-svg-icons';

const TagsAndCategoriesFilter = ({
    tags,
    setTags,
    categories,
    tagFilter,
    handleTagChange,
    categoryFilter,
    handleCategoryChange,
}) => {
    const [currentPage, setCurrentPage] = useState(1); // Track current page for tags
    const [isFetching, setIsFetching] = useState(false); // Track fetching state
    const [hasMoreTags, setHasMoreTags] = useState(true); // Track if more tags are available

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

    const fetchNextPage = async () => {
        if (isFetching || !hasMoreTags) return; // Prevent fetch if already fetching or no more tags
        setIsFetching(true);
        try {
            const nextPage = currentPage + 1;
            const response = await fetch(`/wp-json/wp/v2/tags?per_page=10&page=${nextPage}`);
            if (!response.ok) throw new Error('Failed to fetch tags');
            const newTags = await response.json();

            // Update tags state with new tags
            setTags((prevTags) => [
                ...prevTags,
                ...newTags.map((tag) => ({
                    label: tag.name,
                    value: tag.id,
                })),
            ]);

            // If fewer than 10 tags are returned, assume no more pages
            if (newTags.length < 10) {
                setHasMoreTags(false);
            } else {
                setCurrentPage(nextPage); // Increment the page only if there are more
            }
        } catch (error) {
            console.error('Error fetching next page of tags:', error);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <>
            <PanelBody
                title={<span><FontAwesomeIcon icon={faTags} /> {__('Tags', 'acemedia-glossary')}</span>}
                initialOpen={isTagsPanelOpen}
                onToggle={() => setIsTagsPanelOpen((prev) => !prev)}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[{ label: 'All Tags', value: 'all_tags' }, ...tags].map((tag) => (
                        <Button
                            key={tag.value}
                            isPressed={tagFilter.includes(tag.value)}
                            onClick={() => handleTagChange(tag.value)}
                            className="toggle-button"
                        >
                            {tag.label}
                        </Button>
                    ))}
                    {hasMoreTags && (
                        <Button
                            onClick={fetchNextPage} // Fetch the next page
                            disabled={isFetching} // Disable button while fetching
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

export default TagsAndCategoriesFilter;
