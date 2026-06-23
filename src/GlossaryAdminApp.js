import { useState, useEffect, useRef, useCallback, useMemo, memo } from '@wordpress/element';
import { Button,  
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOption as ToggleGroupControlOption, ToggleControl, PanelRow, TextControl, TextareaControl, CheckboxControl, Card, CardHeader, CardBody, PanelBody, IconButton, Notice, Flex, FlexItem, Tooltip, SelectControl, FlexBlock, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faAnchor, faEdit, faEye, faCheckDouble } from '@fortawesome/free-solid-svg-icons';



import Sidebar from './SideBar/SideBar';
import SaveBar from './SaveBar/SaveBar';
import './styles/scss/settings.scss';


import { 
    decodeHTMLEntities, 
    debounce, 
    fetchLogs, 
    clearLogs, 
    saveCss, 
    fetchFromAPI,
    setupDragAndDrop,
    fetchSingleTerm,
    updateRelatedTerms,
    updateTermCategories,
    updateTermTags,
    fetchPrefetchData,
    fetchRelatedTermsLookup,
    getRestRoot
} from './utils';

import Modals from './Modals';
import CardsOptimized from './Cards/CardsOptimized';

const DEBOUNCE_DELAY = 2000;

const createBlankTerm = () => ({
    id: Date.now(),
    title: '',
    content: '',
    autoHighlight: false,
    enablePostRelations: false,
    relatedTerms: [],
    categories: [],
    tags: [],
    categoryIds: [],
    tagIds: [],
    date: new Date().toISOString(),
    modified: new Date().toISOString(),
    isOpen: false,
    isLoaded: true,
});

const GlossaryAdminApp = () => {
    const [terms, setTerms] = useState([]);
    const [activeTerm, setActiveTerm] = useState(null); // Currently loaded full term data
    const activeEditorTextareaRef = useRef(null);
    const [termDrafts, setTermDrafts] = useState({}); // Store draft changes for each term by ID
    const [modifiedTerms, setModifiedTerms] = useState(new Set());
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [message, setMessage] = useState('');
    const [sortOption, setSortOption] = useState('alphabetical');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingTerm, setIsLoadingTerm] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
    const [loadTime, setLoadTime] = useState(null);
    const debounceTimerRef = useRef(null);
    const [buttonText, setButtonText] = useState('Save Changes');
    const [searchQuery, setSearchQuery] = useState('');
    const isInitialLoad = useRef(true);
    const [logs, setLogs] = useState('');
    const [customCss, setCustomCss] = useState(''); // State for custom CSS
    const [isDragging, setIsDragging] = useState(false);
    const [quickEdit, setQuickEdit] = useState('false'); // Initialize quickEdit state
    const [selectedTerms, setSelectedTerms] = useState([]);
    const [autoHighlight, setAutoHighlight] = useState(false);
    const [initialAutoHighlight, setInitialAutoHighlight] = useState(false);
    const [autoHighlightDirty, setAutoHighlightDirty] = useState(false);
    const [archiveFeaturesEnabled, setArchiveFeaturesEnabled] = useState(true);
    const [initialArchiveFeatures, setInitialArchiveFeatures] = useState(true);
    const [archiveFeaturesDirty, setArchiveFeaturesDirty] = useState(false);
    const [archiveSlug, setArchiveSlug] = useState('glossary');
    const [initialArchiveSlug, setInitialArchiveSlug] = useState('glossary');
    const [archiveSlugDirty, setArchiveSlugDirty] = useState(false);
    const [archiveSlugError, setArchiveSlugError] = useState('');
    const styleDefaults = useMemo(() => {
        const defaults = {
            textColor: '',
            headingBackgroundColor: '',
            headingTextColor: '',
            cardBackgroundColor: '',
            contentGap: '1.5rem',
            headingPadding: '1.25rem',
        };

        if (typeof AceMediaGlossaryAdmin !== 'undefined' && AceMediaGlossaryAdmin.styleDefaults) {
            return { ...defaults, ...AceMediaGlossaryAdmin.styleDefaults };
        }

        return defaults;
    }, []);
    const colorPalette = useMemo(() => {
        if (typeof AceMediaGlossaryAdmin !== 'undefined' && Array.isArray(AceMediaGlossaryAdmin.colorPalette)) {
            return AceMediaGlossaryAdmin.colorPalette;
        }

        return [];
    }, []);
    const [styleSettings, setStyleSettings] = useState(styleDefaults);
    const [initialStyleSettings, setInitialStyleSettings] = useState(styleDefaults);
    const [styleSettingsDirty, setStyleSettingsDirty] = useState(false);
    const stylesEndpoint = useMemo(() => {
        if (typeof AceMediaGlossaryAdmin !== 'undefined' && AceMediaGlossaryAdmin.stylesEndpoint) {
            return AceMediaGlossaryAdmin.stylesEndpoint;
        }

        return '/wp/v2/options/glossary_styles';
    }, []);
    const isSavingRef = useRef(false);
    const [newTermData, setNewTermData] = useState(() => createBlankTerm());
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const [tagFilter, setTagFilter] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCssModalOpen, setIsCssModalOpen] = useState(false); // State for the CSS modal
    
    // Prefetched data for faster card rendering
    const [prefetchedCategories, setPrefetchedCategories] = useState([]);
    const [prefetchedTags, setPrefetchedTags] = useState([]);
    const [relatedTermsLookup, setRelatedTermsLookup] = useState({});
    const [hasMorePrefetchedCategories, setHasMorePrefetchedCategories] = useState(true);
    const [hasMorePrefetchedTags, setHasMorePrefetchedTags] = useState(true);
    const siteUrl = useMemo(() => {
        if (typeof AceMediaGlossaryAdmin !== 'undefined' && AceMediaGlossaryAdmin.siteUrl) {
            return AceMediaGlossaryAdmin.siteUrl;
        }

        if (typeof window !== 'undefined' && window.location) {
            return `${window.location.origin}/`;
        }

        return '/';
    }, []);

    // Fetch the initial value from wp_option on component mount
    useEffect(() => {
    fetchFromAPI('/wp/v2/options/auto_highlight')
            .then((data) => {
                const isEnabled = !!(data && (data.value === true || data.value === 'true'));
                setAutoHighlight(isEnabled);
                setInitialAutoHighlight(isEnabled);
                setAutoHighlightDirty(false);
            })
            .catch((error) => console.error('Error fetching auto_highlight option:', error));
    }, []);

    useEffect(() => {
    fetchFromAPI('/wp/v2/options/glossary_templates')
            .then((data) => {
                const isEnabled = data && typeof data.value !== 'undefined'
                    ? !!(data.value === true || data.value === 'true')
                    : true;
                setArchiveFeaturesEnabled(isEnabled);
                setInitialArchiveFeatures(isEnabled);
                setArchiveFeaturesDirty(false);
            })
            .catch((error) => console.error('Error fetching glossary_templates option:', error));
    }, []);

    useEffect(() => {
    fetchFromAPI('/wp/v2/options/glossary_slug')
            .then((data) => {
                const slug = data && typeof data.value === 'string' ? data.value : 'glossary';
                setArchiveSlug(slug);
                setInitialArchiveSlug(slug);
                setArchiveSlugDirty(false);
                setArchiveSlugError('');
            })
            .catch((error) => console.error('Error fetching glossary_slug option:', error));
    }, []);

    useEffect(() => {
    fetchFromAPI(stylesEndpoint)
            .then((data) => {
                const value = data && typeof data.value === 'object' ? data.value : {};
                const merged = { ...styleDefaults, ...value };
                setStyleSettings(merged);
                setInitialStyleSettings(merged);
                setStyleSettingsDirty(false);
            })
            .catch((error) => console.error('Error fetching glossary_styles option:', error));
    }, [styleDefaults, stylesEndpoint]);

    // Prefetch data for faster card rendering
    useEffect(() => {
        const prefetchData = async () => {
            try {
                // Prefetch categories and tags
                const prefetchResponse = await fetchPrefetchData();
                setPrefetchedCategories(prefetchResponse.categories || []);
                setPrefetchedTags(prefetchResponse.tags || []);
                setHasMorePrefetchedCategories(prefetchResponse.hasMoreCategories || false);
                setHasMorePrefetchedTags(prefetchResponse.hasMoreTags || false);

                // Prefetch related terms lookup
                const lookupResponse = await fetchRelatedTermsLookup();
                setRelatedTermsLookup(lookupResponse || {});
            } catch (error) {
                console.error('Error prefetching data:', error);
            }
        };

        prefetchData();
    }, []);

    const saveAutoHighlightOption = useCallback((isEnabled) => {
        return fetchFromAPI(
            '/wp/v2/options/auto_highlight',
            'POST',
            { value: isEnabled ? 'true' : 'false' },
            { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
        ).catch((error) => {
            console.error('Error saving auto_highlight option:', error);
            throw error;
        });
    }, []);

    const saveArchiveFeaturesOption = useCallback((isEnabled) => {
        return fetchFromAPI(
            '/wp/v2/options/glossary_templates',
            'POST',
            { value: isEnabled ? 'true' : 'false' },
            { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
        ).catch((error) => {
            console.error('Error saving glossary_templates option:', error);
            throw error;
        });
    }, []);

    const saveArchiveSlugOption = useCallback((slug) => {
        return fetchFromAPI(
            '/wp/v2/options/glossary_slug',
            'POST',
            { value: slug },
            { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
        );
    }, []);

    const saveStyleSettingsOption = useCallback((styles) => {
        return fetchFromAPI(
            stylesEndpoint,
            'POST',
            { value: styles },
            { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
        );
    }, [stylesEndpoint]);

    const sanitizeSpacingValue = useCallback((value) => {
        if (typeof value !== 'string') {
            return '';
        }

        const trimmed = value.trim();
        if (trimmed === '' || trimmed === '0') {
            return trimmed === '0' ? '0' : '';
        }

        return /^\d+(?:\.\d+)?(px|rem|em|%)$/i.test(trimmed) ? trimmed : '';
    }, []);

    const sanitizeColorValue = useCallback((value) => {
        if (typeof value !== 'string') {
            return '';
    }

        const trimmed = value.trim();
        if (trimmed === '') {
            return '';
        }

        return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : '';
    }, []);

    const areStyleSettingsEqual = useCallback((a, b) => {
        const keys = Object.keys(styleDefaults);
        return keys.every((key) => (a[key] || '') === (b[key] || ''));
    }, [styleDefaults]);

    const handleStyleSettingChange = useCallback((key, value) => {
        setStyleSettings((prev) => {
            const nextValue = key === 'contentGap' || key === 'headingPadding'
                ? sanitizeSpacingValue(value)
                : sanitizeColorValue(value);

            if ((prev[key] || '') === (nextValue || '')) {
                return prev;
            }

            const next = { ...prev, [key]: nextValue };
            setStyleSettingsDirty(!areStyleSettingsEqual(next, initialStyleSettings));
            return next;
        });
    }, [sanitizeSpacingValue, sanitizeColorValue, areStyleSettingsEqual, initialStyleSettings]);

    const registerEditorTextarea = useCallback((ref) => {
        activeEditorTextareaRef.current = ref;
    }, []);

    const saveTerms = useCallback((isAutoSave = false) => {
        console.log('🔴 saveTerms() called');
        console.log('  - unsavedChanges:', unsavedChanges);
        console.log('  - isSavingRef.current:', isSavingRef.current);
        console.log('  - modifiedTerms:', Array.from(modifiedTerms));
        console.log('  - termDrafts:', termDrafts);
        console.log('  - activeTerm:', activeTerm);
        
        if (!unsavedChanges || isSavingRef.current) {
            console.log('  ⚠️ Exiting early - no changes or already saving');
            return;
        }

        if (archiveSlugDirty && archiveSlug === '') {
            const messageText = __('Archive slug cannot be empty.', 'acemedia-glossary');
            setMessage(messageText);
            setTimeout(() => setMessage(''), 4000);
            return;
        }

        const hasTermChanges = modifiedTerms.size > 0;

        if (!hasTermChanges && !autoHighlightDirty && !archiveFeaturesDirty && !archiveSlugDirty && !styleSettingsDirty) {
            console.log('  ⚠️ No actual changes to save');
            setUnsavedChanges(false);
            return;
        }

        console.log('  ✅ Proceeding with save...');
        setIsSaving(true);
        isSavingRef.current = true;

        const operations = [];
        const startTime = performance.now();

        // Save all modified terms using their draft data
        if (hasTermChanges) {
            console.log('  📝 Saving', modifiedTerms.size, 'modified terms');
            Array.from(modifiedTerms).forEach((termId) => {
                const draftData = termDrafts[termId] || {};
                const isActiveTermTarget = activeTerm && activeTerm.id === termId;
                const liveEditorValue = isActiveTermTarget ? activeEditorTextareaRef.current?.value : undefined;
                const effectiveDraftData = {
                    ...draftData,
                    ...(typeof liveEditorValue === 'string' ? { content: liveEditorValue } : {}),
                };

                console.log('    - Term', termId, 'draft data:', effectiveDraftData);

                // Find the original term data to merge with drafts
                const originalTerm = terms.find(t => t.id === termId);
                const baseData = activeTerm && activeTerm.id === termId ? activeTerm : originalTerm;
                
                if (!baseData) {
                    console.log('    ⚠️ No base data for term', termId);
                    return;
                }

                const termData = {
                    id: termId,
                    title: effectiveDraftData.title ?? baseData.title,
                    content: effectiveDraftData.content ?? baseData.content ?? '',
                    relatedTerms: effectiveDraftData.relatedTerms ?? baseData.relatedTerms ?? [],
                    categories: effectiveDraftData.categories 
                        ? effectiveDraftData.categories.map((cat) => (typeof cat === 'object' ? cat.id : cat))
                        : (baseData.categories ?? []).map((cat) => (typeof cat === 'object' ? cat.id : cat)),
                    tags: effectiveDraftData.tags 
                        ? effectiveDraftData.tags.map((tag) => (typeof tag === 'object' ? tag.id : tag))
                        : (baseData.tags ?? []).map((tag) => (typeof tag === 'object' ? tag.id : tag)),
                    autoHighlight: effectiveDraftData.autoHighlight ?? baseData.autoHighlight ?? false,
                    enablePostRelations: effectiveDraftData.enablePostRelations ?? baseData.enablePostRelations ?? false,
                };

                console.log('    🚀 Sending to API:', {
                    id: termData.id,
                    title: termData.title,
                    contentLength: termData.content?.length || 0,
                    content: termData.content
                });

                operations.push(
                    fetchFromAPI(
                        '/wp/v2/glossary',
                        'POST',
                        termData,
                        { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
                    ).then((response) => {
                        console.log('    ✅ API response:', response);

                        const savedId = response?.id || termData.id;
                        const savedModified = new Date().toISOString();

                        // Update active term if it's the one being saved
                        setActiveTerm((prev) => {
                            if (!prev || prev.id !== savedId) {
                                return prev;
                            }
                            return { ...prev, title: termData.title, modified: savedModified };
                        });

                        // Update terms list
                        setTerms((prevTerms) =>
                            prevTerms.map((term) =>
                                term.id === savedId
                                    ? { ...term, title: termData.title, modified: savedModified }
                                    : term
                            )
                        );

                        return response;
                    })
                );
            });
        }

        if (autoHighlightDirty) {
            operations.push(
                saveAutoHighlightOption(autoHighlight).then((response) => {
                    setInitialAutoHighlight(autoHighlight);
                    setAutoHighlightDirty(false);
                    return response;
                })
            );
        }

        if (archiveFeaturesDirty) {
            operations.push(
                saveArchiveFeaturesOption(archiveFeaturesEnabled).then((response) => {
                    setInitialArchiveFeatures(archiveFeaturesEnabled);
                    setArchiveFeaturesDirty(false);
                    return response;
                })
            );
        }

        if (archiveSlugDirty) {
            operations.push(
                saveArchiveSlugOption(archiveSlug)
                    .then((response) => {
                        const savedSlug = response && typeof response.value === 'string' ? response.value : archiveSlug;
                        setInitialArchiveSlug(savedSlug);
                        setArchiveSlug(savedSlug);
                        setArchiveSlugDirty(false);
                        setArchiveSlugError('');
                        return response;
                    })
                    .catch((error) => {
                        const errorMessage = error?.message || __('Error saving archive slug.', 'acemedia-glossary');
                        setArchiveSlugError(errorMessage);
                        throw error;
                    })
            );
        }

        if (styleSettingsDirty) {
            const payload = { ...styleDefaults, ...styleSettings };
            operations.push(
                saveStyleSettingsOption(payload)
                    .then((response) => {
                        const savedValue = response && typeof response.value === 'object' ? { ...styleDefaults, ...response.value } : payload;
                        setInitialStyleSettings(savedValue);
                        setStyleSettings(savedValue);
                        setStyleSettingsDirty(false);
                        return response;
                    })
                    .catch((error) => {
                        console.error('Error saving glossary styles option:', error);
                        throw error;
                    })
            );
        }

        if (!operations.length) {
            setIsSaving(false);
            isSavingRef.current = false;
            return;
        }

        Promise.all(operations)
            .then(() => {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);

                // Clear modified terms and drafts after successful save
                setModifiedTerms(new Set());
                setTermDrafts({});
                setUnsavedChanges(false);
                isSavingRef.current = false;

                const successMessage = isAutoSave
                    ? `Auto-saved successfully! (${responseTime}ms)`
                    : `Changes saved successfully! (${responseTime}ms)`;

                setMessage(successMessage);
                setTimeout(() => setMessage(''), 3000);
            })
            .catch((error) => {
                console.error('Error saving changes:', error);
                setMessage('Error saving changes');
                setTimeout(() => setMessage(''), 3000);
                isSavingRef.current = false;
            })
            .finally(() => {
                setIsSaving(false);
            });
    }, [unsavedChanges, archiveSlugDirty, archiveSlug, modifiedTerms, termDrafts, autoHighlightDirty, archiveFeaturesDirty, saveAutoHighlightOption, autoHighlight, saveArchiveFeaturesOption, archiveFeaturesEnabled, saveArchiveSlugOption, styleSettingsDirty, styleSettings, saveStyleSettingsOption, styleDefaults, activeTerm]);

    const sanitizeSlugValue = useCallback((value) => {
        if (typeof value !== 'string') {
            return '';
        }

        return value
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }, []);

    const handleAutoHighlightToggle = useCallback((isEnabled) => {
        setAutoHighlight(isEnabled);
        setAutoHighlightDirty(isEnabled !== initialAutoHighlight);
    }, [initialAutoHighlight]);

    const handleArchiveFeaturesToggle = useCallback((isEnabled) => {
        setArchiveFeaturesEnabled(isEnabled);
        setArchiveFeaturesDirty(isEnabled !== initialArchiveFeatures);
    }, [initialArchiveFeatures]);

    const handleArchiveSlugChange = useCallback((value) => {
        const sanitized = sanitizeSlugValue(value);
        setArchiveSlug(sanitized);
        setArchiveSlugDirty(sanitized !== initialArchiveSlug);
        setArchiveSlugError(sanitized === '' ? __('Archive slug cannot be empty.', 'acemedia-glossary') : '');
    }, [sanitizeSlugValue, initialArchiveSlug]);

    useEffect(() => {
        const hasTermChanges = modifiedTerms.size > 0;
        setUnsavedChanges(hasTermChanges || autoHighlightDirty || archiveFeaturesDirty || archiveSlugDirty || styleSettingsDirty);
    }, [modifiedTerms, autoHighlightDirty, archiveFeaturesDirty, archiveSlugDirty, styleSettingsDirty]);

    // Warn user before leaving page with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
                return ''; // Some browsers show this message
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [unsavedChanges]);




    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);



    // Fetch glossary terms (summary data only), categories, and tags once on component mount
    useEffect(() => {
        const startTime = performance.now();
    
        // Clean up orphaned related term references on load
        fetchFromAPI('/wp/v2/glossary/cleanup-orphans', 'POST', {}, {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce
        })
            .then((response) => {
                if (response.removed_references > 0) {
                    console.log(response.message);
                }
            })
            .catch((error) => {
                console.error('Error cleaning up orphaned references:', error);
            });

        fetchFromAPI('/wp/v2/glossary')
            .then((data) => {
                const endTime = performance.now();
                setLoadTime(endTime - startTime);
                setTerms(data); // Data now includes only summary information
            })
            .catch((error) => {
                console.error('Error loading terms:', error);
                setLoadTime(null);
            });
    
        fetchFromAPI('/wp/v2/categories' )
            .then((data) => setCategories(data.map(cat => ({
                label: cat.name,
                value: cat.id,
            }))))
            .catch((error) => console.error('Error loading categories:', error));

        fetchFromAPI('/wp/v2/tags?per_page=10' )
            .then((data) => setTags(data.map(tag => ({
                label: tag.name,
                value: tag.id,
            }))))
            .catch((error) => console.error('Error loading tags:', error));
    }, []);
    





useEffect(() => {
    apiFetch({
        path: '/wp/v2/get-custom-css',
        headers: {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce, // Add nonce for validation
        },
    })
        .then((data) => {
            if (data && data.css) {
                setCustomCss(data.css); // Set the retrieved CSS
            }
        })
        .catch((error) => {
            console.error('Error fetching custom CSS:', error);
        });
}, []);





const handleDownload = useCallback(() => {
    // Trigger the PHP export function via an API call
    const restRoot = getRestRoot();
    fetch(`${restRoot}/wp/v2/glossary/export`, {
        method: 'GET',
        headers: {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce, // Adjust if you have CSRF protection
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch glossary terms from server');
            }
            return response.blob();
        })
        .then((blob) => {
            const url = URL.createObjectURL(blob);

            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = 'glossary-terms.json';
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        })
        .catch((error) => {
            console.error('Error during download:', error);
            alert('An error occurred while downloading the glossary terms.');
        });
}, []);


useEffect(() => {
    const cleanup = setupDragAndDrop({
        onFileDrop: async (importedTerms) => {
            return await apiFetch({
                path: '/wp/v2/glossary/import',
                method: 'POST',
                data: importedTerms,
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            });
        },
        setIsDragging,
        setMessage,
        clearLogs,
        setIsSaving,
        fetchLogs,
        setLoadTime,
        setTerms,
        setLogs, // Pass setLogs here
    });

    return cleanup;
}, [setIsDragging, setMessage, clearLogs, setIsSaving, fetchLogs, setLoadTime, setTerms, setLogs]);

    
    
    
    
    
    useEffect(() => {
        if (isAutoSaveEnabled && unsavedChanges) {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                saveTerms(true);
            }, DEBOUNCE_DELAY);
        }
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [terms, isAutoSaveEnabled, unsavedChanges, saveTerms]);




    const onSave = useCallback(() => saveTerms(), [saveTerms]);

    const displayedTerms = useMemo(() => {
        if (!terms.length) return {}; // Fallback for empty terms list
    
        let filteredTerms = terms;
    
        // Apply search query filtering (only on title since content is not loaded)
        if (debouncedSearchQuery) {
            filteredTerms = filteredTerms.filter((term) =>
                term.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }
    
        // Apply tag and category filtering using IDs
        if (tagFilter.length > 0) {
            filteredTerms = filteredTerms.filter((term) =>
                term.tagIds && term.tagIds.some((tagId) => tagFilter.includes(tagId))
            );
        }
    
        if (categoryFilter.length > 0) {
            filteredTerms = filteredTerms.filter((term) =>
                term.categoryIds && term.categoryIds.some((catId) => categoryFilter.includes(catId))
            );
        }
    
        // Apply sorting
        const sortedTerms = filteredTerms.sort((a, b) => {
            if (sortOption === 'alphabetical') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'created') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortOption === 'updated') {
                return new Date(b.modified) - new Date(a.modified);
            }
            return 0;
        });
    
        // Group alphabetically if required
        if (sortOption === 'alphabetical') {
            return sortedTerms.reduce((acc, term) => {
                const firstLetter = decodeHTMLEntities(term.title).charAt(0).toUpperCase();
                if (!acc[firstLetter]) acc[firstLetter] = [];
                acc[firstLetter].push(term);
                return acc;
            }, {});
        }
    
        return { All: sortedTerms };
    }, [terms, sortOption, debouncedSearchQuery, tagFilter, categoryFilter]);
           


const deleteSelectedTerms = async () => {
    if (!selectedTerms.length) {
        setMessage(__('No terms selected for deletion.', 'acemedia-glossary'));
        return;
    }

    setIsSaving(true);

    const confirmDelete = window.confirm(
        __('Are you sure you want to delete the selected terms? This action cannot be undone.', 'acemedia-glossary')
    );

    if (!confirmDelete) {
        setIsSaving(false); // Reset saving state if canceled
        return;
    }

    try {
        const response = await fetch(`${AceMediaGlossaryAdmin.apiUrl}wp/v2/glossary/bulk-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
            },
            body: JSON.stringify({ ids: selectedTerms }),
        });

        if (!response.ok) {
            throw new Error(__('Failed to delete selected terms.', 'acemedia-glossary'));
        }

        // Update terms after successful deletion
        const deletedIds = await response.json();
        setTerms((prevTerms) => {
            const updatedTerms = prevTerms.filter((term) => !deletedIds.includes(term.id));
            
            // Check if terms are empty and reset Quick Edit if true
            if (updatedTerms.length === 0) {
                setQuickEdit('false');
            }

            return updatedTerms;
        });

        setSelectedTerms([]); // Clear selection
        setMessage(__('Selected terms deleted successfully.', 'acemedia-glossary'));
    } catch (error) {
        console.error('Error deleting selected terms:', error);
        setMessage(__('Failed to delete selected terms. Please try again.', 'acemedia-glossary'));
    } finally {
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    }
};

// Function to remove a single term
const removeTerm = async (termId) => {
    setIsSaving(true);

    try {
        const response = await fetch(`${AceMediaGlossaryAdmin.apiUrl}wp/v2/glossary/${termId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
            },
        });

        if (!response.ok) {
            throw new Error(__('Failed to delete term.', 'acemedia-glossary'));
        }

        // Update terms after successful deletion
        setTerms((prevTerms) => {
            const updatedTerms = prevTerms.filter((term) => term.id !== termId);
            
            // Check if terms are empty and reset Quick Edit if true
            if (updatedTerms.length === 0) {
                setQuickEdit('false');
            }

            return updatedTerms;
        });

        // Close the active term if it was the one deleted
        if (activeTerm && activeTerm.id === termId) {
            closeActiveTerm();
        }

        setMessage(__('Term deleted successfully.', 'acemedia-glossary'));
    } catch (error) {
        console.error('Error deleting term:', error);
        setMessage(__('Failed to delete term. Please try again.', 'acemedia-glossary'));
    } finally {
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    }
};


const openModalForNewTerm = () => {
        setNewTermData(createBlankTerm());
        setIsModalOpen(true);
    };


  
    
useEffect(() => {
    fetchLogs(setLogs);
}, []);
    
    
    // Function to load a single term with full data
    const loadSingleTerm = useCallback(async (termId) => {
        if (activeTerm && activeTerm.id === termId && activeTerm.isLoaded) {
            return activeTerm; // Already loaded
        }

        const termSummary = terms.find(term => term.id === termId) || {};
        const draftSnapshot = termDrafts[termId] || {};

        setActiveTerm({
            ...termSummary,
            ...draftSnapshot,
            id: termSummary.id ?? termId,
            content: draftSnapshot.content ?? termSummary.content ?? '',
            isOpen: true,
            isLoaded: false,
            isLoading: true,
        });

        setIsLoadingTerm(true);
        try {
            // Always fetch the full term data from API to ensure we have complete data
            // (The terms list only contains summary info without content)
            const termData = await fetchSingleTerm(termId);
            
            // Apply any draft changes if they exist for this term
            const draftChanges = termDrafts[termId] || {};
            
            console.log('Loading term:', termId);
            console.log('Fresh data from API:', termData);
            console.log('Draft changes:', draftChanges);
            console.log('Has draft content?', !!draftChanges.content);
            
            // Ensure the term is marked as open when we set it as active
            const activeTermData = {
                ...termData,
                ...draftChanges, // Apply draft changes on top of fresh data
                isOpen: true,
                isLoaded: true,
                isLoading: false,
            };
            
            console.log('Final active term data:', activeTermData);
            console.log('Content length:', activeTermData.content?.length || 0);
            
            setActiveTerm(prev => ({
                ...prev,
                ...activeTermData,
            }));

            setTermDrafts(prevDrafts => {
                if (prevDrafts[termId]) {
                    return prevDrafts;
                }
                return {
                    ...prevDrafts,
                    [termId]: {
                        title: activeTermData.title,
                        content: activeTermData.content,
                        autoHighlight: !!activeTermData.autoHighlight,
                        enablePostRelations: !!activeTermData.enablePostRelations,
                        relatedTerms: Array.isArray(activeTermData.relatedTerms) ? [...activeTermData.relatedTerms] : [],
                        categories: Array.isArray(activeTermData.categories) ? [...activeTermData.categories] : [],
                        tags: Array.isArray(activeTermData.tags) ? [...activeTermData.tags] : [],
                        categoryIds: Array.isArray(activeTermData.categoryIds) ? [...activeTermData.categoryIds] : [],
                        tagIds: Array.isArray(activeTermData.tagIds) ? [...activeTermData.tagIds] : [],
                    },
                };
            });
            
            // Update the terms list to mark this term as loaded and open
            setTerms(prevTerms => 
                prevTerms.map(term => ({
                    ...term,
                    isOpen: term.id === termId,
                    isLoaded: term.id === termId ? true : term.isLoaded
                }))
            );
            
            return activeTermData;
        } catch (error) {
            console.error('Error loading term:', error);
            setMessage('Error loading term data');
            setTimeout(() => setMessage(''), 3000);
            return null;
        } finally {
            setIsLoadingTerm(false);
        }
    }, [activeTerm, termDrafts, terms]);

    // Function to close the active term
    const closeActiveTerm = useCallback(() => {
        setActiveTerm(null);
        setTerms(prevTerms => 
            prevTerms.map(term => ({ ...term, isOpen: false }))
        );
    }, []);

    // Function to update active term data
    const updateActiveTerm = useCallback((key, value) => {
        if (!activeTerm) return;
        
        console.log('updateActiveTerm called:', key, '=', value?.substring?.(0, 50) || value);
        
        // For 'content' key, only update drafts to avoid re-renders while typing
        // The editor maintains its own internal state
        if (key === 'content') {
            // Store the change in drafts only
            setTermDrafts(prev => {
                const newDrafts = {
                    ...prev,
                    [activeTerm.id]: {
                        ...(prev[activeTerm.id] || {}),
                        [key]: value
                    }
                };
                console.log('Updated termDrafts (content):', newDrafts[activeTerm.id]);
                return newDrafts;
            });
            
            // Mark as modified
            setModifiedTerms(prev => {
                if (prev.has(activeTerm.id)) {
                    return prev;
                }
                const newSet = new Set(prev);
                newSet.add(activeTerm.id);
                console.log('Term marked as modified:', activeTerm.id);
                return newSet;
            });
            setUnsavedChanges(true);
            return; // Don't update activeTerm state for content
        }
        
        // For other keys (title, toggles, etc.), update activeTerm state
        setActiveTerm(prev => ({ ...prev, [key]: value }));
        
        // Store the change in drafts
        setTermDrafts(prev => {
            const newDrafts = {
                ...prev,
                [activeTerm.id]: {
                    ...(prev[activeTerm.id] || {}),
                    [key]: value
                }
            };
            console.log('Updated termDrafts:', newDrafts);
            return newDrafts;
        });
        
        // Only update modifiedTerms if this term isn't already in the set
        setModifiedTerms(prev => {
            if (prev.has(activeTerm.id)) {
                return prev; // Return same Set to avoid re-render
            }
            const newSet = new Set(prev);
            newSet.add(activeTerm.id);
            console.log('Term marked as modified:', activeTerm.id);
            return newSet;
        });
        setUnsavedChanges(true);
        
        // Update these specific fields in the terms list immediately for UI feedback
        if (key === 'autoHighlight' || key === 'enablePostRelations') {
            setTerms(prevTerms => {
                const termIndex = prevTerms.findIndex(term => term.id === activeTerm.id);
                if (termIndex === -1) return prevTerms;
                
                const newTerms = [...prevTerms];
                newTerms[termIndex] = { ...newTerms[termIndex], [key]: value };
                return newTerms;
            });
        }
    }, [activeTerm]);

    // Separate optimized function for title sync to avoid re-rendering all terms
    const updateActiveTermTitle = useCallback((title) => {
        if (!activeTerm) return;
        
        setActiveTerm(prev => ({ ...prev, title }));
        
        // Store the change in drafts
        setTermDrafts(prev => ({
            ...prev,
            [activeTerm.id]: {
                ...(prev[activeTerm.id] || {}),
                title: title
            }
        }));
        
        setModifiedTerms(prev => new Set([...prev, activeTerm.id]));
        setUnsavedChanges(true);
        
        // Update title in terms list more efficiently
        setTerms(prevTerms => {
            const termIndex = prevTerms.findIndex(term => term.id === activeTerm.id);
            if (termIndex === -1) return prevTerms;
            
            const newTerms = [...prevTerms];
            newTerms[termIndex] = { ...newTerms[termIndex], title };
            return newTerms;
        });
    }, [activeTerm]);
    
    return (
        <>
        <div className={`admin-ui ${isDragging ? 'dragging' : ''}`}>
            {isDragging && (
                <div className="drag-overlay">
                    <p>Drop your file anywhere to import!</p>
                </div>
            )}
            <Flex alignItems="flex-start" className='main-panel'>
                
            <Sidebar
                tags={tags}
                setTags={setTags}
                setCategories={setCategories}
                categories={categories}
                sortOption={sortOption}
                setSortOption={setSortOption}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                tagFilter={tagFilter}
                categoryFilter={categoryFilter}
                autoHighlight={autoHighlight}
                onAutoHighlightToggle={handleAutoHighlightToggle}
                archiveFeaturesEnabled={archiveFeaturesEnabled}
                onArchiveFeaturesToggle={handleArchiveFeaturesToggle}
                archiveSlug={archiveSlug}
                archiveSlugError={archiveSlugError}
                onArchiveSlugChange={handleArchiveSlugChange}
                siteUrl={siteUrl}
                styleSettings={styleSettings}
                onStyleSettingChange={handleStyleSettingChange}
                styleDefaults={styleDefaults}
                colorPalette={colorPalette}
                customCss={customCss}
                setIsCssModalOpen={setIsCssModalOpen}
                handleDownload={handleDownload}
                unsavedChanges={unsavedChanges}
                setTagFilter={setTagFilter} // Pass setter instead of handlers
                setCategoryFilter={setCategoryFilter} 
                logs={logs}
                displayedTerms={displayedTerms}
                fetchLogs={() => {/* Logic to fetch logs */}}
                clearLogs={() => {/* Logic to clear logs */}}
            />



<CardsOptimized
    displayedTerms={displayedTerms}
    loadTime={loadTime}
    terms={terms}
    activeTerm={activeTerm}
    setActiveTerm={setActiveTerm}
    categories={categories}
    tags={tags}
    sortOption={sortOption}
    setSortOption={setSortOption}
    quickEdit={quickEdit}
    selectedTerms={selectedTerms}
    setSelectedTerms={setSelectedTerms}
    setTerms={setTerms}
    modifiedTerms={modifiedTerms}
    setModifiedTerms={setModifiedTerms}
    setUnsavedChanges={setUnsavedChanges}
    setQuickEdit={setQuickEdit}
    setMessage={setMessage}
    setIsSaving={setIsSaving}
    isAutoSaveEnabled={isAutoSaveEnabled}
    isSaving={isSaving}
    isLoadingTerm={isLoadingTerm}
    loadSingleTerm={loadSingleTerm}
    closeActiveTerm={closeActiveTerm}
    updateActiveTerm={updateActiveTerm}
    updateActiveTermTitle={updateActiveTermTitle}
    removeTerm={removeTerm}
    prefetchedCategories={prefetchedCategories}
    prefetchedTags={prefetchedTags}
    relatedTermsLookup={relatedTermsLookup}
    hasMorePrefetchedCategories={hasMorePrefetchedCategories}
    hasMorePrefetchedTags={hasMorePrefetchedTags}
    globalAutoHighlightEnabled={autoHighlight}
    registerEditorTextarea={registerEditorTextarea}
/>




            </Flex>



            </div>

            <SaveBar
    onSave={onSave}
    setUnsavedChanges={setUnsavedChanges}
    unsavedChanges={unsavedChanges}
    isAutoSaveEnabled={isAutoSaveEnabled}
    setIsAutoSaveEnabled={setIsAutoSaveEnabled}
    message={message}
    isSaving={isSaving}
    setIsSaving={setIsSaving} 
    buttonText={unsavedChanges ? 'Save Changes' : 'Saved'}
>
    {quickEdit === 'true' ? (
        <Button
        isDestructive isPrimary 
            onClick={() => {
                    deleteSelectedTerms();
            }}
        >
            {__('Delete Terms', 'acemedia-glossary')}
        </Button>
    ) : (
        <Button variant="secondary" onClick={openModalForNewTerm}>
            {__('Add New Term', 'acemedia-glossary')}
        </Button>
    )}
</SaveBar>


<Modals
    isModalOpen={isModalOpen}
    isCssModalOpen={isCssModalOpen}
    newTermData={newTermData}
    customCss={customCss}
    prefetchedCategories={prefetchedCategories}
    prefetchedTags={prefetchedTags}
    relatedTermsLookup={relatedTermsLookup}
    hasMorePrefetchedCategories={hasMorePrefetchedCategories}
    hasMorePrefetchedTags={hasMorePrefetchedTags}
    setIsModalOpen={setIsModalOpen}
    setIsCssModalOpen={setIsCssModalOpen}
    setNewTermData={setNewTermData}
    setCustomCss={setCustomCss}
    setTerms={setTerms}
    setRelatedTermsLookup={setRelatedTermsLookup}
    setMessage={setMessage}
    saveCss={saveCss}
    apiFetch={apiFetch}
/>

        </>
    );
};

export default GlossaryAdminApp;
