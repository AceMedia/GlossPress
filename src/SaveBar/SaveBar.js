import PropTypes from 'prop-types';
import { useState, useEffect } from '@wordpress/element';
import { Button, Flex, FlexItem, ToggleControl, Spinner } from '@wordpress/components';

const SaveBar = ({ children, onSave, setUnsavedChanges, unsavedChanges, isAutoSaveEnabled, setIsAutoSaveEnabled, buttonText, message, isSaving, setIsSaving }) => {
    const [isSuccess, setIsSuccess] = useState(false); // State to track successful save
    const [elapsedTime, setElapsedTime] = useState(0);
    const [intervalId, setIntervalId] = useState(null);

    // Function to update the fixed position
    function updateFixedPosition() {
        const adminMenuWrap = document.querySelector('#adminmenuwrap');
        const fixedElement = document.querySelector('.ace-save-bar');

        if (adminMenuWrap && fixedElement) {
            const adminMenuWidth = adminMenuWrap.offsetWidth;
            fixedElement.style.left = `${adminMenuWidth}px`;
        }
    }

    useEffect(() => {
        window.addEventListener('resize', updateFixedPosition);
        window.addEventListener('scroll', updateFixedPosition);
        window.addEventListener('load', updateFixedPosition);

        const handleBeforeUnload = (event) => {
            if (unsavedChanges) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('resize', updateFixedPosition);
            window.removeEventListener('scroll', updateFixedPosition);
            window.removeEventListener('load', updateFixedPosition);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [unsavedChanges]);

    useEffect(() => {
        if (message === 'Time since last saved') {
            const id = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
            setIntervalId(id);
        } else if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }
    }, [message]);

    const handleClick = async () => {
        setIsSaving(true); // Start saving animation
        setIsSuccess(false); // Reset success state
        await onSave(false); // Trigger save logic
        setIsSaving(false); // Stop saving animation
        setIsSuccess(true); // Indicate save was successful
        setTimeout(() => setIsSuccess(false), 2000); // Reset success icon after 2 seconds
    };

    const formatElapsedTime = (seconds) => {
        if (seconds < 60) return `${seconds} seconds ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        return `${Math.floor(seconds / 3600)} hours ago`;
    };

    const getIconClass = () => {
        if (isSaving) return 'dashicons-update';
        if (isSuccess) return 'dashicons-yes';
        return 'dashicons-book-alt';
    };

    return (
        <div className={`ace-save-bar ${unsavedChanges ? 'unsaved-changes' : ''}`}>
            <Flex justify="space-between" align="center">
                <FlexItem>{children}</FlexItem>
                <FlexItem>
                    <Flex align="center" gap="1rem" style={{ alignItems: 'center' }}>
                        {message && (
                            <span className="save-message">
                                {message === 'Time since last saved' ? formatElapsedTime(elapsedTime) : message}
                            </span>
                        )}
                        <div style={{ margin: '0px' }}>
                            <ToggleControl
                                label="Auto Save"
                                className="ace-save-bar-toggle-control"
                                checked={isAutoSaveEnabled}
                                onChange={(isChecked) => {
                                    setIsAutoSaveEnabled(isChecked);
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {isSaving && <Spinner />} {/* Render Spinner when saving */}
                            <Button
                                variant="primary"
                                onClick={handleClick}
                                className={`wp-saving-button ${unsavedChanges ? 'enabled' : ''} ${isSuccess ? 'saved' : ''}`}
                                aria-label={isSaving ? 'Saving.....' : buttonText}
                                disabled={!unsavedChanges || isAutoSaveEnabled || isSaving} // Disable button while saving
                            >
                                <span className={`dashicons ${getIconClass()}`}></span> {isSaving ? 'Saving.....' : buttonText}
                            </Button>
                        </div>
                    </Flex>
                </FlexItem>
            </Flex>
        </div>
    );
};

SaveBar.propTypes = {
    children: PropTypes.node,
    onSave: PropTypes.func.isRequired,
    setUnsavedChanges: PropTypes.func.isRequired,
    unsavedChanges: PropTypes.bool.isRequired,
    isAutoSaveEnabled: PropTypes.bool.isRequired,
    setIsAutoSaveEnabled: PropTypes.func.isRequired,
    message: PropTypes.string, // Updated to accept message as a prop
    isSaving: PropTypes.bool.isRequired, 
    setIsSaving: PropTypes.func.isRequired, 
};

export default SaveBar;
