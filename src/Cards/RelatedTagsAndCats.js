import React, { useCallback } from '@wordpress/element';
import { Flex, FlexItem, CheckboxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const RelatedTagsAndCats = ({
    term,
    terms,
    categories,
    tags,
    setTerms,
    setModifiedTerms,
    setUnsavedChanges,
}) => {
    // Update related terms
    const updateRelatedTerms = useCallback(
        (updatedRelatedTerms) => {
            setTerms((prevTerms) => {
                const termsCopy = [...prevTerms];
                const modifiedIds = new Set();

                termsCopy.forEach((t) => {
                    if (t.id === term.id) {
                        t.relatedTerms = updatedRelatedTerms;
                        modifiedIds.add(t.id);
                    } else if (updatedRelatedTerms.includes(t.id)) {
                        if (!t.relatedTerms.includes(term.id)) {
                            t.relatedTerms = [...t.relatedTerms, term.id];
                            modifiedIds.add(t.id);
                        }
                    } else {
                        t.relatedTerms = t.relatedTerms.filter((id) => id !== term.id);
                        modifiedIds.add(t.id);
                    }
                });

                setModifiedTerms((prev) => new Set([...prev, ...modifiedIds]));
                return termsCopy;
            });

            setUnsavedChanges(true);
        },
        [term, setTerms, setModifiedTerms, setUnsavedChanges]
    );

    // Update categories
    const updateCategories = useCallback(
        (updatedCategories) => {
            setTerms((prevTerms) =>
                prevTerms.map((t) =>
                    t.id === term.id ? { ...t, categories: updatedCategories } : t
                )
            );
            setModifiedTerms((prev) => new Set([...prev, term.id]));
            setUnsavedChanges(true);
        },
        [term, setTerms, setModifiedTerms, setUnsavedChanges]
    );

    // Update tags
    const updateTags = useCallback(
        (updatedTags) => {
            setTerms((prevTerms) =>
                prevTerms.map((t) => (t.id === term.id ? { ...t, tags: updatedTags } : t))
            );
            setModifiedTerms((prev) => new Set([...prev, term.id]));
            setUnsavedChanges(true);
        },
        [term, setTerms, setModifiedTerms, setUnsavedChanges]
    );

    return (
        <Flex className="related-options" style={{ gap: '1rem' }} justify="start">
            {/* Related Terms */}
            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Related Terms', 'acemedia-glossary')}</h3>
                <div className="scroller">
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
                <h3>{__('Related Categories', 'acemedia-glossary')}</h3>
                <div className="scroller">
                    {categories
                        .filter((category) => category.value !== 1)
                        .map((category) => (
                            <CheckboxControl
                                key={category.value}
                                label={category.label}
                                checked={term.categories.some((cat) => cat.id === category.value)}
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
                                    updateCategories(updatedCategories);
                                }}
                            />
                        ))}
                </div>
            </FlexItem>

            {/* Related Tags */}
            <FlexItem style={{ flex: '1 1 30%' }}>
                <h3>{__('Related Tags', 'acemedia-glossary')}</h3>
                <div className="scroller">
                    {tags.map((tag) => (
                        <CheckboxControl
                            key={tag.value}
                            label={tag.label}
                            checked={term.tags.some((t) => t.id === tag.value)}
                            onChange={(isChecked) => {
                                const updatedTags = isChecked
                                    ? [
                                          ...term.tags,
                                          {
                                              id: tag.value,
                                              slug: tag.label.toLowerCase().replace(/\s+/g, '-'),
                                              title: tag.label,
                                          },
                                      ]
                                    : term.tags.filter((t) => t.id !== tag.value);
                                updateTags(updatedTags);
                            }}
                        />
                    ))}
                </div>
            </FlexItem>
        </Flex>
    );
};

export default RelatedTagsAndCats;
