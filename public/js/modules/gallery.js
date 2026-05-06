// modules/gallery.js
import { api, uploadImage } from '../utils/api.js';
import { getPlaceholderImage, showConfirmDialog, getDeclension } from '../utils/helpers.js';
import { showNotification } from '../components/notifications.js';

let currentModuleId = null;
let currentGalleryImages = [];
let isUploading = false;
let uploadZoneInitialized = false;

function log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [GALLERY] ${message}`, data ? data : '');
}

export function setCurrentModuleId(id) {
    log(`setCurrentModuleId: ${id}`);
    currentModuleId = id;
}

export async function loadGallery(moduleId) {
    log(`loadGallery START, moduleId: ${moduleId}`);

    if (!moduleId) {
        const container = document.getElementById('galleryContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-gallery">
                    <i class="bi bi-info-circle"></i>
                    <p>Сначала сохраните модуль</p>
                    <small class="text-muted">Изображения можно добавить после создания модуля</small>
                </div>
            `;
        }
        return;
    }

    try {
        const gallery = await api.modules.getGallery(moduleId);
        log(`Gallery loaded, ${gallery.length} images`);
        currentGalleryImages = gallery;

        const container = document.getElementById('galleryContainer');
        if (!container) return;

        if (!gallery || gallery.length === 0) {
            container.innerHTML = `
                <div class="empty-gallery">
                    <i class="bi bi-images"></i>
                    <p>Нет изображений в галерее</p>
                    <small class="text-muted">Перетащите изображения или нажмите кнопку выше для загрузки</small>
                </div>
            `;
            return;
        }

        let html = `<div class="gallery-horizontal" id="galleryHorizontal">`;
        gallery.forEach((img, index) => {
            let imgUrl = img.image_url;
            if (imgUrl && imgUrl.startsWith('/uploads/')) {
                imgUrl = `${window.location.origin}${imgUrl}`;
            }
            html += `
                <div class="gallery-item" data-id="${img.id}" data-index="${index}" draggable="true">
                    <img src="${imgUrl}" alt="Gallery ${index + 1}" 
                         onerror="this.src='${getPlaceholderImage('Error')}'">
                    <button type="button" class="remove-btn" data-id="${img.id}">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="order-badge">#${index + 1}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Вешаем обработчики на кнопки удаления
        document.querySelectorAll('.gallery-item .remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const imageId = parseInt(btn.dataset.id);
                if (imageId) removeGalleryImage(imageId);
            });
        });

        initDragAndDrop();

    } catch (err) {
        console.error('Error loading gallery:', err);
        const container = document.getElementById('galleryContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-gallery">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Ошибка загрузки галереи</p>
                </div>
            `;
        }
    }
}

function initDragAndDrop() {
    const container = document.getElementById('galleryHorizontal');
    if (!container) return;

    let draggedItem = null;
    const items = container.querySelectorAll('.gallery-item');

    items.forEach((item, idx) => {
        item.setAttribute('draggable', 'true');

        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            item.style.transform = 'scale(1.02)';
        });

        item.addEventListener('dragleave', (e) => {
            item.style.transform = '';
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.style.transform = '';

            if (!draggedItem || draggedItem === item) return;

            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(item.dataset.index);

            const reordered = [...currentGalleryImages];
            const [movedItem] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, movedItem);

            for (let i = 0; i < reordered.length; i++) {
                const img = reordered[i];
                if (img.sort_order !== i) {
                    await api.gallery.updateOrder(img.id, i);
                }
            }

            showNotification('Порядок изображений обновлен', 'success');
            await loadGallery(currentModuleId);
        });
    });
}

// Экспортируемая функция загрузки
export async function addGalleryImages() {
    log(`addGalleryImages called, isUploading=${isUploading}, currentModuleId=${currentModuleId}`);

    if (isUploading) {
        log('Upload already in progress, ignoring');
        return;
    }

    if (!currentModuleId) {
        showNotification('Сначала сохраните модуль', 'error');
        return;
    }

    const input = document.getElementById('galleryImageInput');
    if (!input || !input.files || !input.files.length) {
        showNotification('Выберите файлы для загрузки', 'warning');
        return;
    }

    isUploading = true;
    const files = Array.from(input.files);
    log(`Uploading ${files.length} files`);

    let successCount = 0;

    for (const file of files) {
        try {
            const imageUrl = await uploadImage(file);
            await api.modules.addGalleryImage(currentModuleId, imageUrl, currentGalleryImages.length + successCount);
            successCount++;
        } catch (err) {
            console.error('Upload error:', err);
            showNotification(`Ошибка: ${file.name}`, 'error');
        }
    }

    if (successCount > 0) {
        showNotification(`Загружено ${successCount} ${getDeclension(successCount, 'изображение', 'изображения', 'изображений')}`, 'success');
    }

    input.value = '';
    isUploading = false;
    await loadGallery(currentModuleId);
}

// Экспортируемая функция удаления
export async function removeGalleryImage(imageId) {
    log(`removeGalleryImage called, id=${imageId}`);

    const result = await showConfirmDialog('Удалить изображение?', 'Действие нельзя отменить.');
    if (!result) return;

    try {
        const token = localStorage.getItem('token');
        await fetch(`${window.location.origin}/api/admin/gallery/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        showNotification('Изображение удалено', 'success');
        await loadGallery(currentModuleId);
    } catch (err) {
        console.error('Delete error:', err);
        showNotification('Ошибка удаления', 'error');
    }
}

export function initGalleryHandlers(moduleId) {
    log(`initGalleryHandlers, moduleId=${moduleId}, initialized=${uploadZoneInitialized}`);

    if (moduleId) {
        currentModuleId = moduleId;
    }

    if (!uploadZoneInitialized) {
        initUploadZone();
        uploadZoneInitialized = true;
    }
}

function initUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const galleryInput = document.getElementById('galleryImageInput');

    if (!uploadZone || !galleryInput) return;

    log('Initializing upload zone');

    // Создаем новый upload zone без onclick атрибута
    const newZone = document.createElement('div');
    newZone.className = uploadZone.className;
    newZone.id = 'uploadZone';
    newZone.innerHTML = `
        <i class="bi bi-cloud-upload"></i>
        <p>Перетащите изображения сюда или нажмите для выбора</p>
        <button type="button" class="btn-upload" id="galleryUploadBtn">
            <i class="bi bi-plus"></i> Выбрать файлы
        </button>
    `;
    uploadZone.parentNode.replaceChild(newZone, uploadZone);

    // Создаем новый input
    const newInput = document.createElement('input');
    newInput.type = 'file';
    newInput.id = 'galleryImageInput';
    newInput.multiple = true;
    newInput.accept = 'image/*';
    newInput.style.display = 'none';
    galleryInput.parentNode.replaceChild(newInput, galleryInput);

    // Обработчик изменения input
    newInput.addEventListener('change', async (e) => {
        e.stopPropagation();
        if (newInput.files && newInput.files.length > 0) {
            log('Input change event, files detected');
            await addGalleryImages();
        }
    });

    // Кнопка загрузки
    const uploadBtn = document.getElementById('galleryUploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            log('Upload button click, opening dialog');
            newInput.click();
        });
    }

    // Клик по зоне (не по кнопке)
    newZone.addEventListener('click', (e) => {
        if (e.target === uploadBtn || (uploadBtn && uploadBtn.contains(e.target))) {
            return;
        }
        log('Zone click, opening dialog');
        newInput.click();
    });

    // Drag and drop
    newZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        newZone.classList.add('drag-over');
    });

    newZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        newZone.classList.remove('drag-over');
    });

    newZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        newZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        log(`Drop detected, ${files.length} files`);

        if (files.length === 0) {
            showNotification('Перетащите изображения', 'error');
            return;
        }

        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        newInput.files = dataTransfer.files;

        await addGalleryImages();
    });

    log('Upload zone initialized');
}