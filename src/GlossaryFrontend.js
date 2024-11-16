import React, { useState, useEffect, useMemo } from '@wordpress/element';
import { Spinner, PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

const GlossaryFrontend = () => {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState('alphabetical');

    // Fetch terms from the WordPress REST API
    const fetchTerms = async () => {
        setLoading(true);
        try {
            const data = await apiFetch({ path: '/wp-json/wp/v2/glossary?per_page=100' });

            // Ensure proper structure and sanitize data
            const sanitizedData = data.map((term) => ({
                id: term.id || '',
                title: term.title || __('Untitled', 'acemedia-glossary'),
                content: term.content || '',
                modified: term.modified || null,
                relatedTerms: term.relatedTerms || [], // Include related terms
                categories: term.categories || [],    // Include categories
                tags: term.tags || [],                // Include tags
            }));

            setTerms(sanitizedData);
        } catch (error) {
            console.error('Error fetching glossary terms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTerms();
    }, []);

    // Memoize sorted terms based on the selected sort option
    const sortedTerms = useMemo(() => {
        if (!terms.length) return [];

        return [...terms].sort((a, b) => {
            if (sortOption === 'alphabetical') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'updated') {
                const dateA = new Date(a.modified || 0);
                const dateB = new Date(b.modified || 0);
                return dateB - dateA;
            }
            return 0;
        });
    }, [terms, sortOption]);

    // Group terms alphabetically
    const groupedTerms = useMemo(() => {
        return sortedTerms.reduce((groups, term) => {
            const firstLetter = term.title.charAt(0).toUpperCase();
            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(term);
            return groups;
        }, {});
    }, [sortedTerms]);

    return (
        <div className="acemedia-glossary-frontend">
            {loading ? (
                <div className="loading-spinner">
                    <Spinner />
                    <p>{__('Loading glossary...', 'acemedia-glossary')}</p>
                </div>
            ) : terms.length > 0 ? (
                <>
                    <PanelBody title={__('Glossary Options', 'acemedia-glossary')} initialOpen={true}>
                        <ToggleControl
                            label={__('Sort Alphabetically', 'acemedia-glossary')}
                            checked={sortOption === 'alphabetical'}
                            onChange={(isChecked) =>
                                setSortOption(isChecked ? 'alphabetical' : 'updated')
                            }
                        />
                    </PanelBody>

                    {/* A-Z Grouped Navigation */}
                    <div className="glossary-index">
                        <h2>{__('Glossary Index', 'acemedia-glossary')}</h2>
                        <ul className="glossary-anchor-links">
                            {Object.keys(groupedTerms).sort().map((letter) => (
                                <li key={letter}>
                                    <a href={`#group-${letter}`}>{letter}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* A-Z Grouped Terms */}
                    <div className="glossary-terms">
                        {Object.keys(groupedTerms).sort().map((letter) => (
                            <div key={letter} id={`group-${letter}`} className="glossary-group">
                                <h3>{letter}</h3>
                                <ul>
                                    {groupedTerms[letter].map((term) => (
                                      <li key={term.id} className="glossary-item">
                                      <h4 id={`term-${term.id}`}>{term.title}</h4>
                                      {term.content ? (
                                          <div
                                              dangerouslySetInnerHTML={{
                                                  __html: term.content,
                                              }}
                                          ></div>
                                      ) : (
                                          <p>{__('No content available.', 'acemedia-glossary')}</p>
                                      )}
                                  
                                      {/* "See Also" Section */}
                                      {term.relatedTerms.length > 0 && (
                                          <div className="see-also">
                                              <strong>{__('See Also:', 'acemedia-glossary')}</strong>
                                              <ul>
                                                  {term.relatedTerms.map((relatedId) => {
                                                      const relatedTerm = terms.find((t) => t.id === relatedId);
                                                      return relatedTerm ? (
                                                          <li key={relatedId}>
                                                              <a href={`#term-${relatedId}`}>{relatedTerm.title}</a>
                                                          </li>
                                                      ) : null;
                                                  })}
                                              </ul>
                                          </div>
                                      )}
                                  
                                      {/* Categories Section */}
                                      {term.categories.length > 0 && (
                                        console.log(term.categories),
    <div className="categories">
        <strong>{__('Categories:', 'acemedia-glossary')}</strong>
        <ul>
            {term.categories.map((category) => (
                <li key={category.id}>
                    <a href={`/category/${category.slug}`}>{category.title}</a>
                </li>
            ))}
        </ul>
    </div>
)}

{/* Tags Section */}
{term.tags.length > 0 && (
    <div className="tags">
        <strong>{__('Tags:', 'acemedia-glossary')}</strong>
        <ul>
            {term.tags.map((tag) => (
                <li key={tag.id}>
                    <a href={`/tag/${tag.slug}`}>{tag.title}</a>
                </li>
            ))}
        </ul>
    </div>
)}
                                  </li>
                                  
                                   
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p>{__('No glossary terms found.', 'acemedia-glossary')}</p>
            )}
        </div>
    );
};

export default GlossaryFrontend;
