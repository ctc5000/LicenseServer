// utils/api.js
import { API_URL, getHeaders } from './constants.js';

export async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    });

    if (!response.ok) {
        let errorMessage;
        try {
            const error = await response.json();
            errorMessage = error.error || `HTTP ${response.status}`;
        } catch (e) {
            errorMessage = `HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
    }

    // Для DELETE запросов может не быть тела
    if (options.method === 'DELETE') {
        return null;
    }

    try {
        return await response.json();
    } catch (e) {
        return null;
    }
}

export async function uploadImage(file) {
    console.log('uploadImage called with file:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);

    const response = await fetch(`${API_URL}/api/admin/upload/image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Upload response data:', data);
    return data.url;
}

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/admin/upload/file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url;
}

export const api = {
    modules: {
        getAll: () => apiFetch('/api/admin/modules'),
        getById: (id) => apiFetch(`/api/admin/modules/${id}`),
        create: (data) => apiFetch('/api/admin/modules', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiFetch(`/api/admin/modules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiFetch(`/api/admin/modules/${id}`, { method: 'DELETE' }),
        getGallery: (moduleId) => apiFetch(`/api/admin/modules/${moduleId}/gallery`),
        addGalleryImage: (moduleId, imageUrl, sortOrder) => apiFetch(`/api/admin/modules/${moduleId}/gallery`, {
            method: 'POST',
            body: JSON.stringify({ image_url: imageUrl, sort_order: sortOrder })
        }),
        getLicenses: (moduleId) => apiFetch(`/api/admin/modules/${moduleId}/licenses`)
    },
    licenses: {
        create: (data) => apiFetch('/api/admin/licenses', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiFetch(`/api/admin/licenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiFetch(`/api/admin/licenses/${id}`, { method: 'DELETE' }),
        bulkCreate: (moduleId, licenses) => apiFetch('/api/admin/licenses/bulk', {
            method: 'POST',
            body: JSON.stringify({ module_id: moduleId, licenses })
        })
    },
    gallery: {
        updateOrder: (id, sortOrder) => apiFetch(`/api/admin/gallery/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ sort_order: sortOrder })
        }),
        delete: (id) => apiFetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
    },
    news: {
        getAll: () => apiFetch('/api/admin/news'),
        getById: (id) => apiFetch(`/api/admin/news/${id}`),
        create: (data) => apiFetch('/api/admin/news', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiFetch(`/api/admin/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiFetch(`/api/admin/news/${id}`, { method: 'DELETE' })
    },
    checkLicense: (licenseKey) => apiFetch(`/api/license/check-exists-any?license=${encodeURIComponent(licenseKey)}`)
};