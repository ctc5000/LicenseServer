// utils/constants.js
export const API_URL = window.location.origin;

export const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
});

export const LICENSES_PER_PAGE = 20;

export const STATUS_MAP = {
    'active': { text: 'Активна', icon: '🟢', class: 'status-active' },
    'inactive': { text: 'Неактивна', icon: '🔴', class: 'status-inactive' },
    'pending': { text: 'Ожидание', icon: '🟡', class: 'status-pending' },
    'expired': { text: 'Просрочена', icon: '⚫', class: 'status-expired' },
    'rejected': { text: 'Отклонена', icon: '🔴', class: 'status-rejected' }
};