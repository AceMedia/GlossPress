import React, { useState, useEffect, useMemo, useRef } from '@wordpress/element';
import { Spinner, TextControl, PanelBody, ToggleControl, Flex, FlexItem, Card, CardHeader, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

const GlossaryFrontend = ({ data }) => {
    const [terms, setTerms] = useState([]);
    const [loading, setLoading] = useState(!data.preloadedTerms || data.preloadedTerms.length === 0);
    const [sortOption, setSortOption] = useState(data.sort || 'alphabetical');
    const [openCardId, setOpenCardId] = useState(null);
    const termRefs = useRef({});
    const [searchQuery, setSearchQuery] = useState(''); // State for search query
 
    const generateAnchorId = (title) => {
        return title
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/[^\w\-]/g, ''); // Remove all non-word characters except dashes
    };

    useEffect(() => {
        if (openCardId && termRefs.current[openCardId]) {
         //   scrollToElement(openCardId);
            window.history.pushState(null, '', `#${openCardId}`);
        }
    }, [openCardId]);

    useEffect(() => {
        if (!loading) {
            const hash = window.location.hash;
            if (hash) {
                const id = hash.substring(1); // Remove the '#' from the hash
                toggleCard(id); // Open the card and scroll to it
            }
        }
    }, [loading]);


    const toggleCard = (title, shouldScrollOnly = false) => {
        const id = generateAnchorId(title);
    
        if (shouldScrollOnly && openCardId === id) {
            scrollToElement(id); // Only scroll if the card is already open
            return;
        }
    
        setOpenCardId((prevId) => {
            if (prevId === id) {
                if (!shouldScrollOnly) return null; // Close card if toggle requested
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        scrollToElement(id);
                    }, 50);
                });
                return prevId; // Keep it open if only scrolling
            }
            // Open the new card and scroll to it
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        scrollToElement(id);
                    }, 50);
                });
            return id;
        });
    };
    

    const escapeCSSSelector = (id) => {
        return id.replace(/([!"#$%&'()*+,.\/:;<=>?@[\]^`{|}~])/g, '\\$1');
    };
    
    const calculateHeaderOffset = () => {
        const fixedElementsOffset = Array.from(document.querySelectorAll('header, .fixed, .sticky, #wpadminbar'))
            .reduce((total, el) => {
            const position = window.getComputedStyle(el).position;
            if (position === 'fixed' || position === 'sticky' || el.id === 'wpadminbar') {
                return total + el.getBoundingClientRect().height;
            }
            if (el.tagName.toLowerCase() === 'header') {
                const childHeights = Array.from(el.children).map(child => {
                const childPosition = window.getComputedStyle(child).position;
                if (childPosition === 'fixed' || childPosition === 'sticky') {
                    return child.getBoundingClientRect().height;
                }
                return 0;
                });
                const maxChildHeight = Math.max(...childHeights);
                return total + maxChildHeight;
            }
            return total;
            }, 0);
        
        // Add 2em padding
        const emSize = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2;
        return fixedElementsOffset + emSize;
    };
    
    const scrollToElement = (id, retries = 5) => {
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = calculateHeaderOffset();
            const elementRect = element.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;
            const middle = absoluteElementTop - headerOffset;
    
            requestAnimationFrame(() => {
                window.scrollTo({
                    top: middle,
                    behavior: 'smooth'
                });
            });
    
            setTimeout(() => {
                const newRect = element.getBoundingClientRect();
                if (newRect.top < 0 || newRect.top > window.innerHeight) {
                    window.scrollTo({
                        top: middle,
                        behavior: 'auto'
                    });
                }
            }, 500);
        } else if (retries > 0) {
            setTimeout(() => scrollToElement(id, retries - 1), 100);
        }
    };
    


    const decodeHTMLEntities = (str) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    };
    
    const GlossaryItem = ({ term, isOpen, onToggle }) => {
        const [relatedPosts, setRelatedPosts] = useState([]);
        const [loadingRelatedPosts, setLoadingRelatedPosts] = useState(false);
        const anchorId = generateAnchorId(term.title);

    
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
                key={anchorId}
                ref={(el) => (termRefs.current[anchorId] = el)}
                style={{ backgroundColor: 'none' }} 
                id={anchorId}
            >
                <CardHeader
    onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle the card
        onToggle(term.title);
        
        // Then attempt scroll after a brief delay
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollToElement(generateAnchorId(term.title));
            }, 50);
        });
    }}
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <h4>{term.title}</h4>
                </CardHeader>
                {isOpen && (
                    <CardBody>
                        {term.content ? (
                            <div dangerouslySetInnerHTML={{ __html: term.content }} />
                        ) : (
                            <p>{__('No content available.', 'acemedia-glossary')}</p>
                        )}
    
                        {/* "See Also" Section */}
                        {term.relatedTerms.length > 0 && (
                            <div className="see-also">
                                <strong>{__('See Also:', 'acemedia-glossary')}{' '}</strong>
                                {term.relatedTerms.map((relatedId, index) => {
                                    const relatedTerm = terms.find((t) => t.id === relatedId);
                                    const relatedAnchorId = relatedTerm ? generateAnchorId(relatedTerm.title) : null;
                                    const termTitle = relatedTerm ? relatedTerm.title : __('Unknown Term', 'acemedia-glossary');
                                    const isLast = index === term.relatedTerms.length - 1;
                                    const isSecondLast = index === term.relatedTerms.length - 2;
    
                                    return (
                                        <span key={relatedId}>
                                           <a
    key={relatedId}
    href={`#${relatedAnchorId}`}
    onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle the card
        onToggle(relatedTerm.title);
        
        // Then attempt scroll after a brief delay
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollToElement(generateAnchorId(relatedTerm.title));
            }, 50);
        });
    }}
>
    {termTitle}
</a>
                                            {!isLast && (isSecondLast ? ' & ' : ', ')}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
    
                        {/* Categories and Tags Section */}
                        {(term.categories.length > 0 || term.tags.length > 0) && (
                            <div className="categories-tags">
                                {/* Categories Section */}
                                {term.categories.length > 0 && (
                                    <>
                                        <strong>{__('Categories:', 'acemedia-glossary')}{' '}</strong>
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
                                        <strong>{' '}{__('Tags:', 'acemedia-glossary')}{' '}</strong>
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
                            <strong>{__('Related Posts:', 'acemedia-glossary')}{' '}</strong>
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
        if (data.preloadedTerms && data.preloadedTerms.length > 0) {
            // Use preloaded terms data (no AJAX request needed)
            setTerms(
                data.preloadedTerms.map((term) => ({
                    id: term.id || '',
                    title: decodeHTMLEntities(term.title || __('Untitled', 'acemedia-glossary')),
                    content: decodeHTMLEntities(term.content || ''),
                    modified: term.modified || null,
                    relatedTerms: term.relatedTerms || [],
                    categories: term.categories || [],
                    tags: term.tags || [],
                }))
            );
            setLoading(false);
        } else {
            // Fallback to AJAX request if no preloaded data
            fetchTerms();
        }
    }, [data]);


    // Filter terms based on search query
    const filteredTerms = useMemo(() => {
        if (!searchQuery) return terms;
        const lowercasedQuery = searchQuery.toLowerCase();
        return terms.filter(
            (term) =>
                (term.title && term.title.toLowerCase().includes(lowercasedQuery)) ||
                (term.content && term.content.toLowerCase().includes(lowercasedQuery))
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
        if (!terms.length) return {};
        // Use sortedTerms instead of terms to maintain consistent order
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


                    {/* Hide alphanumeric index and anchor links when searching */}
                    {!searchQuery && (
                    <><div className="glossary-alphanumeric-index">
                                <Flex className="alphanumeric-links" justify="start" align="center" wrap gap="0.5em">
                                    {'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => (
                                        <FlexItem key={char}>
                                            {groupedTerms[char] ? (
                                                <a
                                                    href={`#${generateAnchorId(char)}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        const group = groupedTerms[char];
                                                        if (group && group[0]) {
                                                            toggleCard(group[0].title, true);
                                                        }
                                                    } }
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
                            </div><div className="glossary-index">
                                    <Flex className="glossary-anchor-links" justify="start" align="flex-start" wrap gap="1em">
                                        {sortedGroupKeys.map((key) => (
                                            <FlexItem key={key}>
                                                <Flex direction="row" align="flex-start" gap={2}>
                                                    <FlexItem style={{ flex: '1 1 20%' }}>
                                                        <a
                                                            href={`#${generateAnchorId(key)}`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleCard(generateAnchorId(groupedTerms[key][0]?.title), true);
                                                            } }
                                                            className="glossary-anchor-link"
                                                        >
                                                            {key}
                                                        </a>
                                                    </FlexItem>
                                                    <FlexItem style={{ flex: '1 1 80%' }}>
                                                        <ul className="glossary-anchor-list">
                                                            {groupedTerms[key].map((term) => (
                                                                <li key={generateAnchorId(term.title)} className="glossary-anchor-item">
                                                          <a
    href={`#${generateAnchorId(term.title)}`}
    onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        // First toggle the card
        toggleCard(term.title, true);
        
        // Then attempt scroll after a brief delay
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollToElement(generateAnchorId(term.title));
            }, 50);
        });
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
                                </div></>
                    )}

<div className="glossary-terms">
    {Object.keys(groupedTerms).map((key) => {
        // Filter terms dynamically based on the search query
        const filteredGroupTerms = groupedTerms[key].filter((term) =>
            term.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            term.content?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Skip rendering the group if no terms match the search query
        if (filteredGroupTerms.length === 0) return null;

        return (
            <div key={key} id={`group-${key}`}>
                <h3>{key}</h3>
                {filteredGroupTerms.map((term) => (
                    <GlossaryItem
                        key={generateAnchorId(term.title)}
                        term={term}
                        isOpen={openCardId === generateAnchorId(term.title)}
                        onToggle={toggleCard}
                    />
                ))}
            </div>
        );
    })}
</div>

                    

                </>
            ) : (
                <p>{__('No glossary terms found.', 'acemedia-glossary')}</p>
            )}
        </div>
    );
};

export default GlossaryFrontend;
