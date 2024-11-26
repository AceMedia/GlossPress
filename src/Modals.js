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
    const handleAddTerm = () => {
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
    };

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
        <TextareaControl
            label={__('Content', 'acemedia-glossary')}
            value={newTermContent}
            onChange={(value) => setNewTermContent(value)}
            placeholder={__('Enter term content...', 'acemedia-glossary')}
        />
        
        <Button
    isPrimary
    onClick={() => {
        const newTermData = {
            id: Date.now(),
            title: newTermTitle || 'Untitled Term',
            content: newTermContent || '',
            relatedTerms: [],
            categories: [],
            tags: [],
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
            isOpen: false,
        };

        // Make the API save call directly
        apiFetch({
            path: '/wp-json/wp/v2/glossary',
            method: 'POST',
            data: { ...newTermData },
            headers: { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce },
        })
            .then(() => {
                // Update the state with the saved term
                setTerms((prevTerms) => [...prevTerms, newTermData]);
                setModifiedTerms((prevModified) => new Set(prevModified).add(newTermData.id));
                setUnsavedChanges(false); // Clear unsaved changes for the modal term only
                setMessage('Term added and saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            })
            .catch((error) => {
                console.error('Error saving term:', error);
                setMessage('Error saving new term');
                setTimeout(() => setMessage(''), 3000);
            });

        // Clear modal input fields and close the modal
        setNewTermTitle('');
        setNewTermContent('');
        setIsModalOpen(false);
    }}
>
    {__('Add Term', 'acemedia-glossary')}
</Button>

        <Button isSecondary onClick={() => setIsModalOpen(false)}>
            {__('Cancel', 'acemedia-glossary')}
        </Button>
    </Modal>
)}


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
        console.log('Custom CSS input value:', value); // Debugging log
        setCustomCss(value); // Update the state with the CSS value
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
         <Button
    isPrimary
    onClick={async () => {
        if (customCss.trim()) {
            const responseMessage = await saveCss(customCss.trim()); // Get the response message
            setMessage(responseMessage); // Pass the message to the SaveBar
            setTimeout(() => setMessage(''), 3000); // Clear the message after 3 seconds
        } else {
            console.error(__('Custom CSS cannot be empty.', 'acemedia-glossary'));
        }
        setIsCssModalOpen(false); // Close the modal after saving
    }}
>
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

export default Modals;
