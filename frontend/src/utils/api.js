import axios from 'axios';

// Default API base URLs to try in order
const DEFAULT_API_BASE_URLS = [
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5000'
];

// Create a custom axios instance
const api = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Keep track of the current working base URL
let currentBaseUrl = localStorage.getItem('apiBaseUrl') || '';

/**
 * Check if a server URL is responding
 * @param {string} url - The URL to test
 * @returns {Promise<boolean>} - True if server is responding
 */
export const checkServerUrl = async (url) => {
    try {
        const response = await axios.get(url, { timeout: 3000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

/**
 * Find a working server from the list of available URLs
 * @returns {Promise<string|null>} - Working base URL or null if none found
 */
export const findWorkingServer = async () => {
    // Use stored URL from localStorage if available
    if (currentBaseUrl) {
        const isWorking = await checkServerUrl(currentBaseUrl);
        if (isWorking) return currentBaseUrl;
    }

    // Try all URLs in sequence
    for (const url of DEFAULT_API_BASE_URLS) {
        const isWorking = await checkServerUrl(url);
        if (isWorking) {
            // Store the working URL
            currentBaseUrl = url;
            localStorage.setItem('apiBaseUrl', url);
            return url;
        }
    }

    return null;
};

/**
 * Make an API request with automatic server fallback
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} endpoint - API endpoint (e.g., '/api/users')
 * @param {object} data - Request data (for POST, PUT)
 * @param {object} config - Additional axios config
 * @returns {Promise} - Axios response
 */
export const apiRequest = async (method, endpoint, data = null, config = {}) => {
    // Ensure we have a working base URL
    if (!currentBaseUrl) {
        currentBaseUrl = await findWorkingServer();
        if (!currentBaseUrl) {
            throw new Error('No server is available. Please try again later.');
        }
    }

    // Add authorization token if available
    const token = localStorage.getItem('token');
    const headers = config.headers || {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const url = `${currentBaseUrl}${endpoint}`;

        switch (method.toLowerCase()) {
            case 'get':
                return await api.get(url, { ...config, headers });
            case 'post':
                return await api.post(url, data, { ...config, headers });
            case 'put':
                return await api.put(url, data, { ...config, headers });
            case 'delete':
                return await api.delete(url, { ...config, headers });
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    } catch (error) {
        // If server connection fails, try to find another working server
        if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
            currentBaseUrl = await findWorkingServer();
            if (currentBaseUrl) {
                // Retry the request with the new server
                return apiRequest(method, endpoint, data, config);
            }
        }

        throw error;
    }
};

export default api; 