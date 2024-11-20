import React, { useState, useEffect, useMemo, useRef } from '@wordpress/element';
import { Spinner, TextControl, PanelBody, ToggleControl, Flex, FlexItem, Card, CardHeader, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const GlossaryFrontend = ({ data }) => {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState(data.sort || 'alphabetical');
    const [openCardId, setOpenCardId] = useState(null);
    const termRefs = useRef({});
    const [searchQuery, setSearchQuery] = useState(''); // State for search query
 


    useEffect(() => {
        if (openCardId && termRefs.current[openCardId]) {
            termRefs.current[openCardId].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [openCardId]);

    const toggleCard = (id) => {
        setOpenCardId((prevId) => (prevId === id ? null : id)); // Toggle the card
    };


    const decodeHTMLEntities = (str) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    };
    
    const GlossaryItem = ({ term, isOpen, onToggle }) => {
        const [relatedPosts, setRelatedPosts] = useState([]);
        const [loadingRelatedPosts, setLoadingRelatedPosts] = useState(false);
    
        useEffect(() => {
            const fetchRelatedPosts = async () => {
                if (!isOpen) return;
            
                const categoryIds = term.categories.map((cat) => cat.id);
                const tagIds = term.tags.map((tag) => tag.id);
            
                if (categoryIds.length === 0 && tagIds.length === 0) {
                    setRelatedPosts([]);
                    return;
                }
            
                setLoadingRelatedPosts(true);
            
                try {
                    const params = new URLSearchParams();
                    if (categoryIds.length > 0) params.append('categories', categoryIds.join(','));
                    if (tagIds.length > 0) params.append('tags', tagIds.join(','));
                    params.append('per_page', 3);
            
                    const response = await fetch(`/wp-json/wp/v2/related-posts?${params.toString()}`);
                    const posts = await response.json();
                    setRelatedPosts(posts);
                } catch (error) {
                    console.error('Error fetching related posts:', error);
                    setRelatedPosts([]);
                } finally {
                    setLoadingRelatedPosts(false);
                }
            };
            
            if (isOpen) {
                fetchRelatedPosts();
            }
        }, [isOpen, term.categories, term.tags]);
    
        useEffect(() => {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify({
                "@context": "https://schema.org",
                "@type": "DefinedTerm",
                "name": term.title,
                "description": term.content
                    ? term.content.replace(/<[^>]*>?/gm, '').slice(0, 150)
                    : "No description available.",
                "url": window.location.origin + `#term-${term.id}`,
            });
            document.head.appendChild(script);
    
            return () => {
                document.head.removeChild(script);
            };
        }, [term]);
    
        return (
            <Card
                className="glossary-item-card"
                key={term.id}
                ref={(el) => (termRefs.current[term.id] = el)}
                style={{ backgroundColor: 'none' }} 
            >
                <CardHeader
                    onClick={() => onToggle(term.id)}
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <h4 id={`term-${term.id}`}>{term.title}</h4>
                </CardHeader>
                {isOpen && (
                    <CardBody>
                    {term.content ? (
                        <div>
                            {term.content.split('\n').map((line, index) => (
                                <p key={index}>{line.trim()}</p>
                            ))}
                        </div>
                    ) : (
                        <p>{__('No content available.', 'acemedia-glossary')}</p>
                    )}
    
                        {/* "See Also" Section */}
                        {term.relatedTerms.length > 0 && (
                            <div className="see-also">
                            {term.relatedTerms.length > 0 && (
                                <>
                                <strong>
                                    {__('See Also:', 'acemedia-glossary')}{' '}
                                    </strong>
                                    {term.relatedTerms.map((relatedId, index) => {
                                        const termTitle =
                                            terms.find((t) => t.id === relatedId)?.title || __('Unknown Term', 'acemedia-glossary');
                                        const isLast = index === term.relatedTerms.length - 1;
                                        const isSecondLast = index === term.relatedTerms.length - 2;
                        
                                        return (
                                            <>
                                                <a
                                                    key={relatedId}
                                                    href={`#term-${relatedId}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onToggle(relatedId, true);
                                                    }}
                                                >
                                                    {termTitle}
                                                </a>
                                                {!isLast && (isSecondLast ? ' & ' : ', ')}
                                            </>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                        
                        )}
  {/* Categories and Tags Section */}
{(term.categories.length > 0 || term.tags.length > 0) && (
    <div className="categories-tags">
        {/* Categories Section */}
        {term.categories.length > 0 && (
                        <>
            <strong>
                {__('Categories:', 'acemedia-glossary')}{' '}
            </strong>
                {term.categories.map((category, index) => {
                    const isLast = index === term.categories.length - 1;
                    const isSecondLast = index === term.categories.length - 2;

                    return (
                        <>
                            <a href={`/category/${category.slug}`} key={category.id}>
                                {category.title}
                            </a>
                            {!isLast && (isSecondLast ? ' & ' : ', ')}
                        </>
                    );
                })}
                </>
        )}

        {/* Tags Section */}
        {term.tags.length > 0 && (

<>
            <strong>
                {' '}
                {__('Tags:', 'acemedia-glossary')}{' '}
            </strong>
                {term.tags.map((tag, index) => {
                    const isLast = index === term.tags.length - 1;
                    const isSecondLast = index === term.tags.length - 2;

                    return (
                        <>
                            <a href={`/tag/${tag.slug}`} key={tag.id}>
                                {tag.title}
                            </a>
                            {!isLast && (isSecondLast ? ' & ' : ', ')}
                        </>
                    );
                })}
                </>
        )}
    </div>
)}



{/* Related Posts Section */}
<div className="related-posts">
    <>
    <strong>{__('Related Posts:', 'acemedia-glossary')}{' '}
    </strong>
        {loadingRelatedPosts ? (
            <span>{__('Loading...', 'acemedia-glossary')}</span>
        ) : relatedPosts.length > 0 ? (
            relatedPosts.map((post, index) => {
                const isLast = index === relatedPosts.length - 1;
                const isSecondLast = index === relatedPosts.length - 2;

                return (
                    <>
                        <a href={post.link} target="_blank" rel="noopener noreferrer" key={post.id}>
                            {post.title}
                        </a>
                        {!isLast && (isSecondLast ? ' & ' : ', ')}
                    </>
                );
            })
        ) : (
            <span>{__('No related posts found.', 'acemedia-glossary')}</span>
        )}
    </>
</div>
      </CardBody>
                )}
            </Card>
        );
    };
    
    

    const fetchTerms = async () => {
        setLoading(true);
        try {
            const response = await fetch(AceMediaGlossaryData.restUrl, {
                headers: {
                    'X-WP-Nonce': AceMediaGlossaryData.nonce,
                },
            });
            const data = await response.json();

            setTerms(
                data.map((term) => ({
                    id: term.id || '',
                    title: decodeHTMLEntities(term.title || __('Untitled', 'acemedia-glossary')),
                    content: decodeHTMLEntities(term.content || ''),
                    modified: term.modified || null,
                    relatedTerms: term.relatedTerms || [],
                    categories: term.categories || [],
                    tags: term.tags || [],
                }))
            );
        } catch (error) {
            console.error('Error fetching glossary terms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (data.preloadedTerms) {
            setTerms(data.preloadedTerms);
            setLoading(false);
        } else {
            fetchTerms();
        }
    }, [data]);


    // Filter terms based on search query
    const filteredTerms = useMemo(() => {
        if (!searchQuery) return terms;
        const lowercasedQuery = searchQuery.toLowerCase();
        return terms.filter(
            (term) =>
                term.title.toLowerCase().includes(lowercasedQuery) ||
                term.content.toLowerCase().includes(lowercasedQuery)
        );
    }, [terms, searchQuery]);

    const sortedTerms = useMemo(() => {
        return [...filteredTerms].sort((a, b) => {
            if (sortOption === 'alphabetical') return a.title.localeCompare(b.title, undefined, { numeric: true });
            if (sortOption === 'updated') return new Date(b.modified || 0) - new Date(a.modified || 0);
            return 0;
        });
    }, [filteredTerms, sortOption]); // Use filteredTerms here
    
    const groupedTerms = useMemo(() => {
        return sortedTerms.reduce((groups, term) => {
            const firstChar = term.title.charAt(0).toUpperCase();
            if (!groups[firstChar]) groups[firstChar] = [];
            groups[firstChar].push(term);
            return groups;
        }, {});
    }, [sortedTerms]);
    
    
    const sortedGroupKeys = useMemo(() => {
        const keys = Object.keys(groupedTerms);
        return keys.sort((a, b) => {
            const isANumber = /^\d$/.test(a);
            const isBNumber = /^\d$/.test(b);
    
            if (isANumber && !isBNumber) return -1; // Numbers before letters
            if (!isANumber && isBNumber) return 1;  // Letters after numbers
    
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [groupedTerms]);
    
    

    return (
        <div className="acemedia-glossary-frontend">
            {loading ? (
                <div className="loading-spinner">
                    <Spinner />
                    <p>{__('Loading glossary...', 'acemedia-glossary')}</p>
                </div>
            ) : terms.length > 0 ? (
                <>


                    {/* Search Field */}
                    <div className="glossary-search">
                        <TextControl
                            label={__('Search Terms', 'acemedia-glossary')}
                            value={searchQuery}
                            onChange={(value) => setSearchQuery(value)}
                            placeholder={__('Type to search...', 'acemedia-glossary')}
                        />
                    </div>


                    <div className="glossary-alphanumeric-index">
    <Flex className="alphanumeric-links" justify="start" align="center" wrap gap="0.5em">
        {'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => (
            <FlexItem key={char}>
                {groupedTerms[char] ? (
                    <a
                        href={`#group-${char}`}
                        onClick={(e) => {
                            e.preventDefault();
                            const group = groupedTerms[char];
                            if (group && group[0]) {
                                toggleCard(group[0].id, true);
                            }
                        }}
                        className="alphanumeric-link"
                    >
                        {char}
                    </a>
                ) : (
                    <span className="alphanumeric-link disabled">{char}</span>
                )}
            </FlexItem>
        ))}
    </Flex>
</div>


                    <div className="glossary-index">
                    <Flex
    className="glossary-anchor-links"
    justify="start"
    align="flex-start"
    wrap
    gap="1em"
>
    {sortedGroupKeys.map((key) => (
        <FlexItem
            key={key}
        >
                <Flex direction="row" align="flex-start" gap={2}>
                    {/* First link with 20% width */}
                    <FlexItem style={{ flex: '1 1 20%' }}>
                        <a
                            href={`#group-${key}`}
                            onClick={(e) => {
                                e.preventDefault();
                                toggleCard(groupedTerms[key][0]?.id, true);
                            }}
                            className="glossary-anchor-link"
                        >
                            {key}
                        </a>
                    </FlexItem>

                    {/* UL taking the remaining width */}
                    <FlexItem style={{ flex: '1 1 80%' }}>
                        <ul className="glossary-anchor-list">
                            {groupedTerms[key].map((term) => (
                                <li key={`anchor-${term.id}`} className="glossary-anchor-item">
                                    <a
                                        href={`#term-${term.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleCard(term.id, true);
                                        }}
                                        className="glossary-term-link"
                                    >
                                        {term.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </FlexItem>
                </Flex>
            </FlexItem>
        ))}
    </Flex>
</div>


                    <div className="glossary-terms">
                        {sortedGroupKeys.map((key) => (
                            <div key={key} id={`group-${key}`}>
                                <h3>{key}</h3>
                                {groupedTerms[key].map((term) => (
                                    <GlossaryItem
                                        key={term.id}
                                        term={term}
                                        isOpen={openCardId === term.id}
                                        onToggle={toggleCard}
                                    />
                                ))}
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
