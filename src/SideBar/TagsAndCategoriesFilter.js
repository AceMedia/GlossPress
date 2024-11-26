import React, { useState, useEffect, useMemo } from '@wordpress/element';
import { PanelBody, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags } from '@fortawesome/free-solid-svg-icons';

const TagsAndCategoriesFilter = ({
    tags,
    categories,
    tagFilter,
    handleTagChange,
    categoryFilter,
    handleCategoryChange,
}) => {
    const [showAllTags, setShowAllTags] = useState(false);

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
                        <Button onClick={() => setShowAllTags(!showAllTags)} className="toggle-button">
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

export default TagsAndCategoriesFilter;
