import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const billingApi = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

/**
 * Get Billing Configuration for a project
 */
export const getBillingConfig = async (projectId, getToken) => {
    const token = await getToken();
    const response = await billingApi.get(`/projects/${projectId}/billing-config`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

/**
 * Update Billing Configuration for a project
 */
export const updateBillingConfig = async (projectId, config, getToken) => {
    const token = await getToken();
    const response = await billingApi.put(`/projects/${projectId}/billing-config`, config, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

/**
 * Get Time Entries for a project
 */
export const getTimeEntries = async (projectId, getToken) => {
    const token = await getToken();
    const response = await billingApi.get(`/projects/${projectId}/time-entries`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

/**
 * Create a new Time Entry
 */
export const createTimeEntry = async (projectId, entryData, getToken) => {
    const token = await getToken();
    const response = await billingApi.post(`/projects/${projectId}/time-entries`, entryData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

/**
 * Delete a Time Entry
 */
export const deleteTimeEntry = async (projectId, entryId, getToken) => {
    const token = await getToken();
    const response = await billingApi.delete(`/projects/${projectId}/time-entries/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

/**
 * Get Project Earnings (Read-Only)
 */
export const getProjectEarnings = async (projectId, getToken) => {
    const token = await getToken();
    const response = await billingApi.get(`/projects/${projectId}/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};
