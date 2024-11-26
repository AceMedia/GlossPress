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

    console.log('Payload:', options);

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
