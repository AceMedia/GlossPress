import apiFetch from '@wordpress/api-fetch';

/**
 * Decode HTML entities in a string.
 * @param {string} str - String to decode.
 * @returns {string} - Decoded string.
 */
export const decodeHTMLEntities = (str) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
};

/**
 * Debounce a function call by a given delay.
 * @param {Function} func - Function to debounce.
 * @param {number} delay - Debounce delay in milliseconds.
 * @returns {Function} - Debounced function.
 */
export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), delay);
    };
};





/**
 * Smoothly scroll to a specific vertical position.
 * @param {number} targetY - The target vertical position to scroll to.
 * @param {number} [duration=1000] - Duration of the scroll animation in milliseconds.
 */
export const smoothScrollTo = (targetY, duration = 1000) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    const easeInOutQuad = (t) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease-in-out formula

    const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1); // Clamp progress to 1

        const easedProgress = easeInOutQuad(progress); // Apply easing
        window.scrollTo(0, startY + distance * easedProgress);

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
};


/**
 * Generic API fetch utility.
 * @param {string} path - API path to fetch.
 * @param {string} [method='GET'] - HTTP method.
 * @param {object|null} [data=null] - Data to send with the request.
 * @param {object} [headers={}] - Additional headers for the request.
 * @returns {Promise<object>} - Response data.
 */
export const fetchFromAPI = async (path, method = 'GET', data = null, headers = {}) => {
    const options = { method, headers };

    if (data) {
        options.body = JSON.stringify(data); // Convert data to JSON
        options.headers = {
            ...headers,
            'Content-Type': 'application/json', // Ensure JSON payload is sent
        };
    }

    try {
        const response = await apiFetch({ path, ...options });
        return response;
    } catch (error) {
        console.error(`Error fetching from API (${path}):`, error.message);
        throw error;
    }
};



/**
 * Fetch logs via API.
 * @param {Function} setLogs - State setter for logs.
 */
export const fetchLogs = async (setLogs) => {
    try {
        const response = await fetchFromAPI('/wp-json/wp/v2/logs', 'GET', null, {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
        });
        const fetchedLogs = response; // Ensure this is a string
        setLogs(fetchedLogs || ''); // Update state even if empty
    } catch (error) {
        console.error('Error fetching logs:', error);
        setLogs(''); // Clear logs in case of error
    }
};


/**
 * Clear logs via API.
 * @returns {Promise<void>} - Resolves when logs are cleared.
 */
export const clearLogs = async () => {
    try {
        const response = await fetchFromAPI('/wp-json/wp/v2/logs/clear', 'POST', null, {
            'X-WP-Nonce': AceMediaGlossaryAdmin.nonce,
        });

        if (response?.ok) {
            console.log('Logs cleared successfully.');
        } else {
            console.warn(
                `Failed to clear logs: ${response?.statusText || 'Unknown error'}.`
            );
        }
    } catch (error) {
        console.error('Error clearing logs:', error.message);
    }
};

/**
 * Save a CSS string via API.
 * @param {string} css - Custom CSS string.
 */
export const saveCss = async (css) => {
    console.log('Saving custom CSS:', css);
    try {
        if (typeof css !== 'string' || css.trim() === '') {
            throw new Error('CSS must be a valid non-empty string.');
        }

        const response = await fetchFromAPI(
            '/wp-json/wp/v2/save-custom-css',
            'POST',
            { css: css.trim() },
            { 'X-WP-Nonce': AceMediaGlossaryAdmin.nonce }
        );

        if (response?.success) {
            console.log('Custom CSS saved successfully:', response.message);
            return response.message; // Return the success message
        } else {
            console.error('Failed to save CSS:', response?.message || 'Unknown error');
            return response?.message || 'Unknown error'; // Return the error message
        }
    } catch (error) {
        console.error('Error saving custom CSS:', error.message);
        return error.message; // Return the error message
    }
};





/**
 * Format relative time from a timestamp.
 * @param {string|number} timestamp - Timestamp to format.
 * @returns {string} - Formatted relative time string.
 */
export const formatRelativeTime = (timestamp) => {
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



export const setupDragAndDrop = ({
    onFileDrop,
    setIsDragging,
    setMessage,
    clearLogs,
    setIsSaving,
    fetchLogs,
    setLoadTime,
    setTerms,
    setLogs, // Include setLogs here
}) => {
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];

        if (file && file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedTerms = JSON.parse(event.target.result);

                    if (!Array.isArray(importedTerms)) {
                        throw new Error('Invalid JSON format. Expected an array of terms.');
                    }

                    setIsSaving(true);
                    await clearLogs();

                    const startTime = performance.now();

                    const response = await onFileDrop(importedTerms);

                    const endTime = performance.now();
                    const responseTime = Math.round(endTime - startTime);

                    const { new_terms = [], matched_terms = 0 } = response;

                    const totalTerms = importedTerms.length;
                    const newTerms = totalTerms - matched_terms;

                    setMessage(
                        `${newTerms} terms imported successfully in ${responseTime}ms. ${matched_terms} terms already existed.`
                    );

                    await fetchLogs(setLogs); // Ensure fetchLogs correctly uses setLogs

                    const fetchStartTime = performance.now();
                    const updatedTerms = await fetchFromAPI('/wp-json/wp/v2/glossary');
                    const fetchEndTime = performance.now();
                    const newLoadTime = Math.round(fetchEndTime - fetchStartTime);

                    setLoadTime(newLoadTime);
                    setTerms(updatedTerms);
                } catch (error) {
                    console.error('Error importing terms:', error);
                    setMessage('Error importing terms. Please try again.');
                } finally {
                    setIsSaving(false);
                    setTimeout(() => setMessage(''), 5000);
                }
            };
            reader.readAsText(file);
        } else {
            setMessage('Please drop a valid JSON file.');
            setTimeout(() => setMessage(''), 5000);
        }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
    };
};
