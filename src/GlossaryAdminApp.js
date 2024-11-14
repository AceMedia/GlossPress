import { useState, useEffect, useRef } from '@wordpress/element';
import { Button, PanelRow, TextControl, TextareaControl, Card, CardHeader, PanelBody, IconButton, Notice, Flex, FlexItem, Tooltip, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

import SaveBar from './SaveBar/SaveBar';
import './styles/scss/settings.scss';

const DEBOUNCE_DELAY = 2000;

const GlossaryAdminApp = () => {
    const [terms, setTerms] = useState([]);
    const [modifiedTerms, setModifiedTerms] = useState(new Set());
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [message, setMessage] = useState('');
    const [sortOption, setSortOption] = useState('alphabetical');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
    const [loadTime, setLoadTime] = useState(null);
    const debounceTimerRef = useRef(null);
    const focusedTermIdRef = useRef(null);
    const [buttonText, setButtonText] = useState('Save Changes');
    const [searchQuery, setSearchQuery] = useState('');
    const handleSearchChange = (value) => setSearchQuery(value);

    useEffect(() => {
        const interval = setInterval(() => {
            setTerms((prevTerms) => [...prevTerms]);
        }, 1000);
    
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const startTime = performance.now();

        // Fetch glossary terms
        apiFetch({ path: '/wp-json/wp/v2/glossary' })
            .then((data) => {
                const endTime = performance.now();
                setLoadTime((endTime - startTime));
                setTerms(data.map(term => ({
                    ...term,
                    date: term.date,
                    modified: term.modified,
                    relatedTerms: term.relatedTerms || [],
                    categories: term.categories || [], // Initialize categories
                    tags: term.tags || [], // Initialize tags
                    isOpen: false
                })));
            })
            .catch((error) => {
                console.error('Error loading terms:', error);
                setLoadTime(null);
            });

        // Fetch categories
        apiFetch({ path: '/wp-json/wp/v2/categories' })
            .then((data) => setCategories(data.map(cat => ({ label: cat.name, value: cat.id }))))
            .catch((error) => console.error('Error loading categories:', error));

        // Fetch tags
        apiFetch({ path: '/wp-json/wp/v2/tags' })
            .then((data) => setTags(data.map(tag => ({ label: tag.name, value: tag.id }))))
            .catch((error) => console.error('Error loading tags:', error));
    }, []);

    const handleAutoSave = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        if (isAutoSaveEnabled) {
            debounceTimerRef.current = setTimeout(() => {
                if (unsavedChanges) {
                    saveTerms(true);
                }
            }, DEBOUNCE_DELAY);
        }
    };

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return null;

        const time = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - time) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1,
        };

        for (const [key, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `${interval} ${key}${interval !== 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    };

    const addTerm = () => {
        const newTerm = {
            id: Date.now(),
            title: '',
            content: '',
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
            relatedTerms: [],
            categories: [],
            tags: [],
            isOpen: true
        };
        setTerms([...terms.map(term => ({ ...term, isOpen: false })), newTerm]);
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const toggleTermOpen = (termId) => {
        setTerms(terms.map(term =>
            term.id === termId
                ? { ...term, isOpen: !term.isOpen }
                : { ...term, isOpen: false }
        ));
    };

    const updateTermTitle = (termId, title) => {
        focusedTermIdRef.current = termId;
        setTerms(terms.map(term => term.id === termId ? { ...term, title } : term));
        setModifiedTerms(new Set(modifiedTerms).add(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };
    
    const updateTermContent = (termId, content) => {
        setTerms(terms.map(term => term.id === termId ? { ...term, content } : term));
        setModifiedTerms(new Set(modifiedTerms).add(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const updateRelatedTerms = (termId, relatedTerms) => {
        setTerms(terms.map(term => term.id === termId ? { ...term, relatedTerms } : term));
        setModifiedTerms(new Set(modifiedTerms).add(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const updateCategories = (termId, categories) => {
        setTerms(terms.map(term => term.id === termId ? { ...term, categories } : term));
        setModifiedTerms(new Set(modifiedTerms).add(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const updateTags = (termId, tags) => {
        setTerms(terms.map(term => term.id === termId ? { ...term, tags } : term));
        setModifiedTerms(new Set(modifiedTerms).add(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const removeTerm = (termId) => {
        setTerms(terms.filter(term => term.id !== termId));
        setModifiedTerms(new Set(modifiedTerms).delete(termId));
        setUnsavedChanges(true);
        handleAutoSave();
    };

    const saveTerms = (isAutoSave = false) => {
        if (!unsavedChanges) return;

        if (!isAutoSave) {
            setButtonText('Saving...');
        }
    
        const startTime = performance.now();
    
        const termsToSave = terms.filter(term => modifiedTerms.has(term.id));
        const savePromises = termsToSave.map((term) => {
            const updatedTerm = { ...term, modified: new Date().toISOString() };
            return apiFetch({
                path: '/wp-json/wp/v2/glossary',
                method: 'POST',
                data: { 
                    id: updatedTerm.id, 
                    title: updatedTerm.title, 
                    content: updatedTerm.content,
                    relatedTerms: updatedTerm.relatedTerms,
                    categories: updatedTerm.categories,
                    tags: updatedTerm.tags
                },
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
            }).then(() => updatedTerm);
        });
    
        Promise.all(savePromises)
            .then(savedTerms => {
                setTerms(terms.map(term => savedTerms.find(t => t.id === term.id) || term));
                const endTime = performance.now();
                const calculatedSaveTime = endTime - startTime;
                setMessage(__('Terms saved successfully! Save time: ', 'acemedia-glossary') + calculatedSaveTime + ' ms');
                setModifiedTerms(new Set());
                setUnsavedChanges(false);
                setButtonText('Saved');
                setTimeout(() => setButtonText('Save Changes'), 2000);
            })
            .catch(error => {
                console.error('Error saving terms:', error);
                setButtonText('Save Failed');
                setTimeout(() => setButtonText('Save Changes'), 2000);
            });
    };

    const onSave = () => saveTerms();

    const getDisplayedTerms = () => {
        const sortedTerms = [...terms].sort((a, b) => {
            if (sortOption === 'alphabetical') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'created') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortOption === 'updated') {
                return new Date(a.modified) - new Date(b.modified);
            }
            return 0;
        });

        if (sortOption === 'alphabetical') {
            return sortedTerms.reduce((acc, term) => {
                const firstLetter = term.title.charAt(0).toUpperCase();
                if (!acc[firstLetter]) {
                    acc[firstLetter] = [];
                }
                acc[firstLetter].push(term);
                return acc;
            }, {});
        }

        return { All: sortedTerms };
    };

    const displayedTerms = getDisplayedTerms();

    const renderAlphaIndex = () => {
        if (sortOption === 'alphabetical') {
            const letters = Object.keys(displayedTerms).sort();
            return (
                <div className="alpha-index">
                    {letters.map(letter => (
                        <a key={letter} href={`#${letter}`}>{letter}</a>
                    ))}
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        if (focusedTermIdRef.current) {
            const element = document.querySelector(`[data-term-id="${focusedTermIdRef.current}"] input`);
            if (element) {
                element.focus();
            }
            focusedTermIdRef.current = null;
        }
    }, [terms]);

    const SearchComponent = ({ searchQuery, handleSearchChange }) => {
        return (
            <div className='search-holder'>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search..."
                style={{ width: '100%', marginBottom: '0px' }}
            />
        <span className="dashicons dashicons-search" style={{ marginLeft: '5px' }}></span>
        </div>
        );
    };


    return (
        <div className="glossary-admin-app">
            <SaveBar
                onSave={onSave}
                setUnsavedChanges={setUnsavedChanges}
                unsavedChanges={unsavedChanges}
                isAutoSaveEnabled={isAutoSaveEnabled}
                setIsAutoSaveEnabled={setIsAutoSaveEnabled}
                message={message}
                buttonText={unsavedChanges ? 'Save Changes' : 'Saved'}
            >
                <span>
                    <Button variant="secondary" onClick={addTerm}>
                        {__('Add New Term', 'acemedia-glossary')}
                    </Button>
                </span>
            </SaveBar>
            <Flex alignItems="flex-start">
                <FlexItem alignItems="flex-start" className="sidebar" style={{ flex: '0 0 300px', paddingRight: '20px' }}>
                    <h1>Glossary Settings</h1>
                    <h2>{__('Manage Glossary Terms', 'acemedia-glossary')}</h2>


                    <SearchComponent 
                searchQuery={searchQuery} 
                handleSearchChange={handleSearchChange} 
            />

                    <PanelRow>
                        <select onChange={(e) => setSortOption(e.target.value)} value={sortOption}>
                            <option value="alphabetical">{__('Alphabetical', 'acemedia-glossary')}</option>
                            <option value="created">{__('Created', 'acemedia-glossary')}</option>
                            <option value="updated">{__('Updated', 'acemedia-glossary')}</option>
                        </select>
                    </PanelRow>
                    {renderAlphaIndex()}
                </FlexItem>
                <FlexItem className="terms-list" style={{ flex: '1' }}>
                    {__('Load time: ', 'acemedia-glossary') + loadTime + ' ms'}
                    {Object.keys(displayedTerms).sort().map(group => (
                        <div key={group} id={group}>
                            {sortOption === 'alphabetical' && <h3>{group}</h3>}
                            {displayedTerms[group].map((term) => (
                                <Card key={term.id} className="glossary-term-card" data-term-id={term.id}>
                                    <CardHeader
                                        onClick={() => toggleTermOpen(term.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <h2>{term.title || __('New Term', 'acemedia-glossary')}</h2>
                                        <div style={{ fontSize: '0.85em', color: '#777', display: 'flex', gap: '.5em' }} className='updated-times'>
                                            <Tooltip text={`Created at ${new Date(term.date).toLocaleDateString()}`}>
                                                <p><strong>Created:</strong> {formatRelativeTime(term.date)}</p>
                                            </Tooltip>
                                            <Tooltip text={`Last edited at ${new Date(term.modified).toLocaleDateString()}`}>
                                                <p><strong>Updated:</strong> {formatRelativeTime(term.modified)}</p>
                                            </Tooltip>
                                        </div>
                                    </CardHeader>
                                    {term.isOpen && (
                                        <PanelBody>
                                            <TextControl
                                                label={__('Term', 'acemedia-glossary')}
                                                value={term.title}
                                                onChange={(value) => updateTermTitle(term.id, value)}
                                                placeholder={__('Enter term title...', 'acemedia-glossary')}
                                            />
                                            <TextareaControl
                                                label={__('Content', 'acemedia-glossary')}
                                                value={term.content}
                                                onChange={(value) => updateTermContent(term.id, value)}
                                                placeholder={__('Enter term content...', 'acemedia-glossary')}
                                            />
                                            <SelectControl
                                                multiple
                                                label={__('Related Terms', 'acemedia-glossary')}
                                                value={term.relatedTerms}
                                                options={terms.filter(t => t.id !== term.id).map(t => ({ label: t.title, value: t.id }))}
                                                onChange={(relatedTerms) => updateRelatedTerms(term.id, relatedTerms)}
                                            />
                                            <SelectControl
                                                multiple
                                                label={__('Categories', 'acemedia-glossary')}
                                                value={term.categories}
                                                options={categories}
                                                onChange={(selectedCategories) => updateCategories(term.id, selectedCategories)}
                                            />
                                            <SelectControl
                                                multiple
                                                label={__('Tags', 'acemedia-glossary')}
                                                value={term.tags}
                                                options={tags}
                                                onChange={(selectedTags) => updateTags(term.id, selectedTags)}
                                            />
                                            <PanelRow>
                                                <IconButton
                                                    icon="trash"
                                                    label={__('Remove Term', 'acemedia-glossary')}
                                                    onClick={() => removeTerm(term.id)}
                                                    className="remove-term-btn"
                                                />
                                            </PanelRow>
                                        </PanelBody>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ))}
                </FlexItem>
            </Flex>
        </div>
    );
};

export default GlossaryAdminApp;
