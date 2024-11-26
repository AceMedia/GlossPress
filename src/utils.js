export const decodeHTMLEntities = (str) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
};

export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

export const fetchFromAPI = async (path, method = 'GET', data = null, headers = {}) => {
    const options = { method, headers };
    if (data) {
        options.body = JSON.stringify(data);
    }
    try {
        const response = await apiFetch({ path, ...options });
        return response;
    } catch (error) {
        console.error(`Error fetching from API (${path}):`, error);
        throw error;
    }
};
