// main.js - Точка входа
import { showModulesList, saveModule, closeModuleModal } from './modules/module.js';
import { showLicensesList } from './modules/licenses.js';
import { showNewsList, saveNews, closeNewsModal, removeNewsImage } from './modules/news.js';
import { addGalleryImages, removeGalleryImage } from './modules/gallery.js';
window.activeUploads = new Set();
console.log('========================================');
console.log('MAIN.JS LOADED', new Date().toLocaleTimeString());
console.log('========================================');
// Проверка авторизации
const token = localStorage.getItem('token');
if (!token && window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/admin/login';
}

function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('open');
}

// Глобальные функции для HTML onclick
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.saveModule = saveModule;
window.closeModuleModal = closeModuleModal;
window.saveNews = saveNews;
window.closeNewsModal = closeNewsModal;
window.removeNewsImage = removeNewsImage;
window.addGalleryImages = addGalleryImages;
window.removeGalleryImage = removeGalleryImage;
window.showModulesList = showModulesList;
window.showLicensesList = showLicensesList;
window.showNewsList = showNewsList;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing admin panel...');

    document.getElementById('menuModules')?.addEventListener('click', showModulesList);
    document.getElementById('menuLicenses')?.addEventListener('click', showLicensesList);
    document.getElementById('menuNews')?.addEventListener('click', showNewsList);
    document.getElementById('logoutLink')?.addEventListener('click', logout);

    document.getElementById('saveModuleBtn')?.addEventListener('click', saveModule);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModuleModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModuleModal);

    document.getElementById('saveNewsBtn')?.addEventListener('click', saveNews);
    document.getElementById('closeNewsModalBtn')?.addEventListener('click', closeNewsModal);
    document.getElementById('cancelNewsModalBtn')?.addEventListener('click', closeNewsModal);

    document.getElementById('moduleModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeModuleModal();
    });
    document.getElementById('newsModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeNewsModal();
    });

    if (!document.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.innerHTML = '<i class="bi bi-list"></i>';
        menuToggle.className = 'menu-toggle';
        menuToggle.onclick = toggleSidebar;
        document.body.appendChild(menuToggle);
    }

    showModulesList();
});