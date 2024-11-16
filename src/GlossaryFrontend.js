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
                    <ul className="glossary-list">
                        {sortedTerms.map((term) => (
                            <li key={term.id} className="glossary-item">
                                <h3>{term.title}</h3>
                                {term.content ? (
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: term.content,
                                        }}
                                    ></div>
                                ) : (
                                    <p>{__('No content available.', 'acemedia-glossary')}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <p>{__('No glossary terms found.', 'acemedia-glossary')}</p>
            )}
        </div>
    );
};

export default GlossaryFrontend;
