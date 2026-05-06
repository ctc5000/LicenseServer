// modules/module.js
import { api, uploadImage, uploadFile } from '../utils/api.js';
import { escapeHtml, getPlaceholderImage, showConfirmDialog } from '../utils/helpers.js';
import { showNotification } from '../components/notifications.js';
import { loadGallery, initGalleryHandlers, setCurrentModuleId, addGalleryImages } from './gallery.js';

let currentModuleId = null;

export async function showModulesList() {
    setActiveMenu('menuModules');

    const modules = await api.modules.getAll();

    let html = `
        <div class="page-header">
            <h2><i class="bi bi-grid-3x3-gap-fill"></i> Модули</h2>
            <div class="header-actions">
                <button class="btn btn-success" id="createModuleBtn"><i class="bi bi-plus-lg"></i> Создать модуль</button>
            </div>
        </div>
        <div class="modules-grid" id="modulesGrid">
    `;

    for (const module of modules) {
        let previewUrl = module.preview_image;
        if (previewUrl && previewUrl.startsWith('/uploads/')) {
            previewUrl = `${window.location.origin}${previewUrl}`;
        } else if (!previewUrl) {
            previewUrl = getPlaceholderImage('No image');
        }

        html += `
            <div class="card">
                <img src="${previewUrl}" class="card-img-top" onerror="this.src='${getPlaceholderImage('No image')}'">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(module.title)}</h5>
                    <p class="card-text">Версия: ${escapeHtml(module.current_version)}</p>
                    <p class="card-text">${escapeHtml(module.description || 'Нет описания')}</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-warning edit-module-btn" data-id="${module.id}"><i class="bi bi-pencil"></i> Редактировать</button>
                        <button class="btn btn-sm btn-danger delete-module-btn" data-id="${module.id}"><i class="bi bi-trash"></i> Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }

    if (modules.length === 0) {
        html += `<div class="text-muted text-center p-5">Нет модулей. Создайте первый!</div>`;
    }

    html += `</div>`;
    document.getElementById('mainContent').innerHTML = html;

    document.getElementById('createModuleBtn')?.addEventListener('click', () => showModuleModal());
    document.querySelectorAll('.edit-module-btn').forEach(btn => {
        btn.addEventListener('click', () => showModuleModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-module-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteModule(btn.dataset.id));
    });
}

export async function showModuleModal(id = null) {
    console.log('========================================');
    console.log('showModuleModal CALLED', new Date().toLocaleTimeString());
    console.log('ID:', id);
    console.log('========================================');

    const modal = document.getElementById('moduleModal');
    const modalTitle = document.getElementById('moduleModalTitle');

    if (!modal) return;

    if (id) {
        modalTitle.textContent = '✏️ Редактирование модуля';
        currentModuleId = id;
        setCurrentModuleId(id);

        try {
            const module = await api.modules.getById(id);

            document.getElementById('moduleId').value = module.id;
            document.getElementById('moduleTitle').value = module.title;
            document.getElementById('moduleDescription').value = module.description || '';
            document.getElementById('moduleFileUrl').value = module.file_url || '';
            document.getElementById('moduleVersion').value = module.current_version;

            // Превью
            const previewContainer = document.getElementById('previewContainer');
            if (module.preview_image) {
                const previewUrl = module.preview_image.startsWith('http') ? module.preview_image : `${window.location.origin}${module.preview_image}`;
                previewContainer.innerHTML = `<img src="${previewUrl}" class="preview-image">`;
                document.getElementById('modulePreview').value = module.preview_image;
            } else {
                previewContainer.innerHTML = '<div class="preview-placeholder"><i class="bi bi-image"></i><p>Нет изображения</p></div>';
                document.getElementById('modulePreview').value = '';
            }

            // Загружаем галерею ТОЛЬКО ОДИН РАЗ
            await loadGallery(id);

        } catch (err) {
            console.error('Error loading module:', err);
            showNotification('Ошибка загрузки модуля', 'error');
        }
    } else {
        modalTitle.textContent = '➕ Создание модуля';
        document.getElementById('moduleForm').reset();
        document.getElementById('moduleId').value = '';
        document.getElementById('modulePreview').value = '';
        document.getElementById('moduleFileUrl').value = '';
        document.getElementById('previewContainer').innerHTML = '<div class="preview-placeholder"><i class="bi bi-image"></i><p>Нет изображения</p></div>';
        document.getElementById('galleryContainer').innerHTML = '<div class="empty-gallery"><i class="bi bi-images"></i><p>Нет изображений в галерее</p><small class="text-muted">Сначала сохраните модуль</small></div>';
        currentModuleId = null;
        setCurrentModuleId(null);
    }

    modal.classList.add('show');
    modal.style.display = 'flex';

    setTimeout(() => {
        initPreviewInput();
        initModuleFileInput();
        initGalleryHandlers(currentModuleId);  // Убираем флаг, initGalleryHandlers сам проверит
    }, 100);
}

function initPreviewInput() {
    const previewInput = document.getElementById('previewImageFile');
    if (!previewInput) return;

    const newInput = previewInput.cloneNode(true);
    previewInput.parentNode.replaceChild(newInput, previewInput);

    newInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const container = document.getElementById('previewContainer');
                if (container) {
                    container.innerHTML = `<img src="${event.target.result}" class="preview-image">`;
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

function initModuleFileInput() {
    const moduleFileInput = document.getElementById('moduleFile');
    if (!moduleFileInput) return;

    const newInput = moduleFileInput.cloneNode(true);
    moduleFileInput.parentNode.replaceChild(newInput, moduleFileInput);

    newInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const label = document.querySelector('label[for="moduleFile"]');
            if (label) {
                const fileNameSpan = label.querySelector('.file-name');
                if (fileNameSpan) fileNameSpan.textContent = file.name;
            }
        }
    });
}

export async function saveModule() {
    const id = document.getElementById('moduleId').value;
    const title = document.getElementById('moduleTitle').value;
    const description = document.getElementById('moduleDescription').value;
    const version = document.getElementById('moduleVersion').value;

    const previewFile = document.getElementById('previewImageFile')?.files[0];
    const moduleFile = document.getElementById('moduleFile')?.files[0];

    if (!title || !version) {
        alert('Заполните заголовок и версию');
        return;
    }

    try {
        let newPreviewImage = null;
        let newFileUrl = null;

        if (previewFile) {
            newPreviewImage = await uploadImage(previewFile);
        }

        if (moduleFile) {
            newFileUrl = await uploadFile(moduleFile);
        }

        const data = { title, description, current_version: version };
        if (newPreviewImage) data.preview_image = newPreviewImage;
        if (newFileUrl) data.file_url = newFileUrl;

        if (id) {
            await api.modules.update(id, data);
        } else {
            const response = await api.modules.create(data);
            currentModuleId = response.id;
            setCurrentModuleId(response.id);
        }

        showNotification('Модуль сохранен', 'success');
        closeModuleModal();
        showModulesList();

    } catch (err) {
        console.error(err);
        alert('Ошибка: ' + err.message);
    }
}

async function deleteModule(id) {
    const confirmed = await showConfirmDialog('Удалить модуль?', 'Все данные будут удалены!');
    if (!confirmed) return;

    await api.modules.delete(id);
    showNotification('Модуль удален', 'success');
    showModulesList();
}

export function closeModuleModal() {
    const modal = document.getElementById('moduleModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function setActiveMenu(activeId) {
    ['menuModules', 'menuLicenses', 'menuNews'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            id === activeId ? element.classList.add('active') : element.classList.remove('active');
        }
    });
}

window.saveModule = saveModule;
window.closeModuleModal = closeModuleModal;
