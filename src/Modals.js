import { useState, useEffect, useCallback, memo } from '@wordpress/element';
import { Modal, Button, TextControl, TextareaControl, ToggleControl, PanelRow, Card, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import RelatedTagsAndCatsOptimized from './Cards/RelatedTagsAndCatsOptimized';
import BlockEditor from './components/BlockEditor';

const Modals = ({
    isModalOpen,
    isCssModalOpen,
    newTermData,
    customCss,
    prefetchedCategories,
    prefetchedTags,
    relatedTermsLookup,
    hasMorePrefetchedCategories,
    hasMorePrefetchedTags,
    setIsModalOpen,
    setIsCssModalOpen,
    setNewTermData,
    setCustomCss,
    setTerms,
    setRelatedTermsLookup,
    setMessage,
    saveCss,
    apiFetch,
}) => {
    const editorId = 'glossary-new-term-editor';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localEditorContent, setLocalEditorContent] = useState('');

    const resetNewTermData = useCallback(() => {
        setNewTermData({
            id: Date.now(),
            title: '',
            content: '',
            autoHighlight: false,
            enablePostRelations: false,
            priority: false,
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
    }, [setNewTermData]);

    const updateNewTerm = useCallback((key, value) => {
        setNewTermData((prev) => {
            if (key === 'content' && prev.content === value) {
                return prev;
            }
            if (key === 'title' && prev.title === value) {
                return prev;
            }
            if (key === 'autoHighlight' && prev.autoHighlight === value) {
                return prev;
            }

            const next = { ...prev, [key]: value };

            if (key === 'categories') {
                next.categoryIds = Array.isArray(value) ? value.map((cat) => cat.id) : [];
            }

            if (key === 'tags') {
                next.tagIds = Array.isArray(value) ? value.map((tag) => tag.id) : [];
            }

            return next;
        });
    }, [setNewTermData]);

    const handleEditorContentChange = useCallback((content) => {
        setLocalEditorContent(content);
    }, []);

    const handleEditorFocus = useCallback(() => {
        // Focus handler if needed
    }, []);

    // Sync local content to newTermData before save
    useEffect(() => {
        if (localEditorContent !== undefined && localEditorContent !== newTermData.content) {
            updateNewTerm('content', localEditorContent);
        }
    }, [localEditorContent, newTermData.content, updateNewTerm]);

    // Initialize local content when modal opens
    useEffect(() => {
        if (isModalOpen) {
            setLocalEditorContent(newTermData.content || '');
        }
    }, [isModalOpen, newTermData.content]);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        resetNewTermData();
    }, [resetNewTermData, setIsModalOpen]);

    const handleAddTerm = useCallback(async () => {
        const categories = Array.isArray(newTermData.categories)
            ? newTermData.categories.map((cat) => cat.id)
            : [];
        const tags = Array.isArray(newTermData.tags)
            ? newTermData.tags.map((tag) => tag.id)
            : [];
        const relatedTerms = Array.isArray(newTermData.relatedTerms)
            ? newTermData.relatedTerms.map((id) => parseInt(id, 10)).filter(Boolean)
            : [];

        const title = (newTermData.title || '').trim() || __('Untitled Term', 'acemedia-glossary');

        setIsSubmitting(true);

        try {
        const response = await apiFetch({
                path: '/wp/v2/glossary',
                method: 'POST',
                data: {
                    title,
                    content: newTermData.content || '',
                    relatedTerms,
                    categories,
                    tags,
                    autoHighlight: !!newTermData.autoHighlight,
                    enablePostRelations: !!newTermData.enablePostRelations,
                    priority: !!newTermData.priority,
                    status: 'publish',
                },
                headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
            });

            const now = new Date().toISOString();

            setTerms((prevTerms) => [
                ...prevTerms,
                {
                    id: response.id,
                    title,
                    date: now,
                    modified: now,
                    categoryIds: categories,
                    tagIds: tags,
                    autoHighlight: !!newTermData.autoHighlight,
                    enablePostRelations: !!newTermData.enablePostRelations,
                    priority: !!newTermData.priority,
                    isOpen: false,
                    isLoaded: false,
                },
            ]);

            setRelatedTermsLookup((prevLookup) => ({
                ...prevLookup,
                [response.id]: title,
            }));

            setMessage(__('Term added successfully.', 'acemedia-glossary'));
            setTimeout(() => setMessage(''), 3000);

            handleCloseModal();
        } catch (error) {
            console.error('Error adding term:', error);
            setMessage(__('Failed to add the term. Please try again.', 'acemedia-glossary'));
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        apiFetch,
        handleCloseModal,
        newTermData.autoHighlight,
        newTermData.priority,
        newTermData.categories,
        newTermData.content,
        newTermData.relatedTerms,
        newTermData.tags,
        newTermData.title,
        setMessage,
        setRelatedTermsLookup,
        setTerms,
    ]);

    const handleSaveCustomCss = useCallback(async () => {
        if (customCss.trim()) {
            const responseMessage = await saveCss(customCss.trim());
            setMessage(responseMessage);
            setTimeout(() => setMessage(''), 3000);
        } else {
            console.error(__('Custom CSS cannot be empty.', 'acemedia-glossary'));
        }
        setIsCssModalOpen(false);
    }, [customCss, saveCss, setIsCssModalOpen, setMessage]);

    return (
        <>
            {isModalOpen && (
                <Modal
                    title={__('Add New Term', 'acemedia-glossary')}
                    onRequestClose={handleCloseModal}
                    isDismissible
                    size="large"
                >
                    <Card className="glossary-term-card active expanded">
                        <CardBody style={{ borderTop: '1px solid #ddd', background: '#f9f9f9' }}>
                            <TextControl
                                label={__('Term Title', 'acemedia-glossary')}
                                value={newTermData.title}
                                onChange={(value) => updateNewTerm('title', value)}
                                placeholder={__('Enter term title...', 'acemedia-glossary')}
                            />

                            <div className="glossary-editor-container">
                                <label className="components-base-control__label" htmlFor={editorId}>
                                    {__('Content', 'acemedia-glossary')}
                                </label>
                                <BlockEditor
                                    termId={newTermData?.id ?? 'new-term'}
                                    content={localEditorContent || ''}
                                    onChange={handleEditorContentChange}
                                    onFocus={handleEditorFocus}
                                    textareaId={editorId}
                                />
                            </div>

                            <PanelRow>
                                <ToggleControl
                                    label={__('Auto-highlight this term', 'acemedia-glossary')}
                                    help={__('When enabled, this term will be automatically highlighted with tooltips in your content.', 'acemedia-glossary')}
                                    checked={!!newTermData.autoHighlight}
                                    onChange={(value) => updateNewTerm('autoHighlight', value)}
                                />
                            </PanelRow>

                            <PanelRow>
                                <ToggleControl
                                    label={__('Enable post relations', 'acemedia-glossary')}
                                    help={__('When enabled, this term will show related posts and appear in post relation searches.', 'acemedia-glossary')}
                                    checked={!!newTermData.enablePostRelations}
                                    onChange={(value) => updateNewTerm('enablePostRelations', value)}
                                />
                            </PanelRow>

                            <PanelRow>
                                <ToggleControl
                                    label={__('Priority term', 'acemedia-glossary')}
                                    help={__('Priority terms are listed in the page\'s structured data (DefinedTermSet), up to 50. Every definition is always in the page HTML either way.', 'acemedia-glossary')}
                                    checked={!!newTermData.priority}
                                    onChange={(value) => updateNewTerm('priority', value)}
                                />
                            </PanelRow>

                            <RelatedTagsAndCatsOptimized
                                term={newTermData}
                                isAutoSaveEnabled={false}
                                isSaving={isSubmitting}
                                setMessage={setMessage}
                                updateActiveTerm={updateNewTerm}
                                prefetchedCategories={prefetchedCategories}
                                prefetchedTags={prefetchedTags}
                                relatedTermsLookup={relatedTermsLookup}
                                hasMorePrefetchedCategories={hasMorePrefetchedCategories}
                                hasMorePrefetchedTags={hasMorePrefetchedTags}
                            />
                        </CardBody>
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1em' }}>
                        <Button
                            isPrimary
                            onClick={handleAddTerm}
                            disabled={isSubmitting}
                            isBusy={isSubmitting}
                        >
                            {__('Add Term', 'acemedia-glossary')}
                        </Button>
                        <Button isSecondary onClick={handleCloseModal} disabled={isSubmitting}>
                            {__('Cancel', 'acemedia-glossary')}
                        </Button>
                    </div>
                </Modal>
            )}

            {isCssModalOpen && (
                <Modal
                    title={__('Edit Custom CSS', 'acemedia-glossary')}
                    onRequestClose={() => setIsCssModalOpen(false)}
                    isDismissible
                    size="large"
                >
                    <TextareaControl
                        label={__('Custom CSS', 'acemedia-glossary')}
                        value={customCss}
                        onChange={(value) => setCustomCss(value)}
                        rows={15}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            width: '100%',
                            height: '300px',
                        }}
                        placeholder={__('Write your custom CSS here...', 'acemedia-glossary')}
                    />

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '1em',
                        }}
                    >
                        <Button isPrimary onClick={handleSaveCustomCss}>
                            {__('Save Custom CSS', 'acemedia-glossary')}
                        </Button>
                        <Button isSecondary onClick={() => setIsCssModalOpen(false)}>
                            {__('Cancel', 'acemedia-glossary')}
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default memo(Modals);
