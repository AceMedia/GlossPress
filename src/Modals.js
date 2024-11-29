import { useState, useEffect, useRef, useCallback, memo } from '@wordpress/element';
import { Modal, Button, TextControl, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const Modals = ({
    isModalOpen,
    isCssModalOpen,
    newTermTitle,
    newTermContent,
    customCss,
    setIsModalOpen,
    setIsCssModalOpen,
    setNewTermTitle,
    setNewTermContent,
    setCustomCss,
    setTerms,
    setModifiedTerms,
    setUnsavedChanges,
    setMessage,
    saveCss,
    apiFetch,
}) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && editorRef.current) {
            wp.attachEditor(editorRef.current); // Attach the block editor to the textarea

            // Observe manual and programmatic changes to the textarea
            const textareaElement = editorRef.current;

            const originalValueDescriptor = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype,
                'value'
            );

            // Override the `value` property to intercept programmatic changes
            Object.defineProperty(textareaElement, 'value', {
                get: originalValueDescriptor.get,
                set: function (newValue) {
                    console.log(`Programmatic update detected: ${newValue}`);
                    setNewTermContent(newValue); // Update the state
                    originalValueDescriptor.set.call(this, newValue); // Call the original setter
                },
            });

            // Listen for manual input changes
            const inputListener = (event) => {
                const updatedValue = event.target.value;
                console.log(`Manual input detected: ${updatedValue}`);
                setNewTermContent(updatedValue); // Update the state
            };

            textareaElement.addEventListener('input', inputListener);

            return () => {
                // Cleanup listeners and restore the original property descriptor
                textareaElement.removeEventListener('input', inputListener);
                Object.defineProperty(textareaElement, 'value', originalValueDescriptor);
            };
        }
    }, [isModalOpen, setNewTermContent]);

    const handleAddTerm = useCallback(() => {
        const newTermData = {
            id: Date.now(),
            title: newTermTitle || __('Untitled Term', 'acemedia-glossary'),
            content: newTermContent || '',
            relatedTerms: [],
            categories: [],
            tags: [],
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
            isOpen: false,
        };

        apiFetch({
            path: '/wp-json/wp/v2/glossary',
            method: 'POST',
            data: { ...newTermData },
            headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
        })
            .then(() => {
                setTerms((prevTerms) => [...prevTerms, newTermData]);
                setModifiedTerms((prevModified) => new Set(prevModified).add(newTermData.id));
                setUnsavedChanges(false);
                setMessage(__('Term added and saved successfully!', 'acemedia-glossary'));
                setTimeout(() => setMessage(''), 3000);
            })
            .catch((error) => {
                console.error('Error saving term:', error);
                setMessage(__('Error saving new term', 'acemedia-glossary'));
                setTimeout(() => setMessage(''), 3000);
            });

        setNewTermTitle('');
        setNewTermContent('');
        setIsModalOpen(false);
    }, [
        newTermTitle,
        newTermContent,
        apiFetch,
        setTerms,
        setModifiedTerms,
        setUnsavedChanges,
        setMessage,
        setIsModalOpen,
        setNewTermTitle,
        setNewTermContent,
    ]);

    const handleSaveCustomCss = async () => {
        if (customCss.trim()) {
            const responseMessage = await saveCss(customCss.trim());
            setMessage(responseMessage);
            setTimeout(() => setMessage(''), 3000);
        } else {
            console.error(__('Custom CSS cannot be empty.', 'acemedia-glossary'));
        }
        setIsCssModalOpen(false);
    };

    return (
        <>
            {/* Add Term Modal */}
            {isModalOpen && (
                <Modal
                    title={__('Add New Term', 'acemedia-glossary')}
                    onRequestClose={() => setIsModalOpen(false)}
                    isDismissible={true}
                >
                    <TextControl
                        label={__('Term', 'acemedia-glossary')}
                        value={newTermTitle}
                        onChange={(value) => setNewTermTitle(value)}
                        placeholder={__('Enter term title...', 'acemedia-glossary')}
                    />

                    <textarea
                        id="isolated-block-editor"
                        ref={editorRef}
                        defaultValue={newTermContent}
                        style={{ minHeight: '300px', width: '100%' }}
                    ></textarea>

                    <Button isPrimary onClick={handleAddTerm}>
                        {__('Add Term', 'acemedia-glossary')}
                    </Button>
                    <Button isSecondary onClick={() => setIsModalOpen(false)}>
                        {__('Cancel', 'acemedia-glossary')}
                    </Button>
                </Modal>
            )}

            {/* Edit Custom CSS Modal */}
            {isCssModalOpen && (
                <Modal
                    title={__('Edit Custom CSS', 'acemedia-glossary')}
                    onRequestClose={() => setIsCssModalOpen(false)}
                    isDismissible={true}
                    size="large"
                >
                    <TextareaControl
                        label={__('Custom CSS', 'acemedia-glossary')}
                        value={customCss}
                        onChange={(value) => {
                            console.log('Custom CSS input value:', value);
                            setCustomCss(value);
                        }}
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
