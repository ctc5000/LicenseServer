const API_URL = window.location.origin;
let currentModuleId = null;
let currentGalleryImages = [];

// Проверка авторизации
const token = localStorage.getItem('token');
if (!token && window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
}

const headers = {
    'Authorization': `Bearer ${token}`
};

// Выход
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/admin/login';
}

// Функция для локального placeholder (без внешних запросов)
function getPlaceholderImage(text = 'No image') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#e9ecef"/>
        <text x="50" y="55" text-anchor="middle" fill="#adb5bd" font-size="10" font-family="Arial">${text}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ============ ГАЛЕРЕЯ ============
let draggedImageId = null;

// Функция загрузки галереи с улучшенным UI
async function loadGallery(moduleId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/modules/${moduleId}/gallery`, { headers });
        const gallery = await response.json();
        currentGalleryImages = gallery;

        const container = document.getElementById('galleryContainer');
        if (!container) return;

        if (gallery.length === 0) {
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
                imgUrl = `${API_URL}${imgUrl}`;
            }
            html += `
                <div class="gallery-item" data-id="${img.id}" data-index="${index}" draggable="true">
                    <img src="${imgUrl}" alt="Gallery ${index + 1}" 
                         onerror="this.src='${getPlaceholderImage('Error')}'">
                    <button type="button" class="remove-btn" onclick="removeGalleryImage(${img.id})">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="order-badge">#${index + 1}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Инициализируем drag and drop после загрузки
        initDragAndDrop();

        // Обновляем статистику
        updateGalleryStats(gallery.length);

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
// Обновление статистики галереи
function updateGalleryStats(count) {
    const statsEl = document.querySelector('.gallery-stats');
    if (statsEl) {
        statsEl.textContent = `${count} ${count === 1 ? 'изображение' : 'изображений'}`;
    }
}
function initDragAndDrop() {
    const container = document.getElementById('galleryHorizontal');
    if (!container) return;

    let draggedItem = null;

    const items = container.querySelectorAll('.gallery-item');

    items.forEach(item => {
        item.setAttribute('draggable', 'true');

        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            draggedImageId = item.dataset.id;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
        });

        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            draggedItem = null;
            draggedImageId = null;
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
            e.stopPropagation();
            item.style.transform = '';

            if (!draggedItem || draggedItem === item) return;

            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(item.dataset.index);

            if (isNaN(fromIndex) || isNaN(toIndex)) return;

            // Показываем индикатор загрузки
            showLoadingIndicator(true);

            // Меняем порядок в массиве
            const reordered = [...currentGalleryImages];
            const [movedItem] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, movedItem);

            // Обновляем sort_order на сервере
            let hasErrors = false;
            for (let i = 0; i < reordered.length; i++) {
                const img = reordered[i];
                if (img.sort_order !== i) {
                    try {
                        await fetch(`${API_URL}/api/admin/gallery/${img.id}`, {
                            method: 'PUT',
                            headers: { ...headers, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sort_order: i })
                        });
                    } catch (err) {
                        console.error('Error updating order:', err);
                        hasErrors = true;
                    }
                }
            }

            if (hasErrors) {
                showNotification('Ошибка при сохранении порядка', 'error');
            } else {
                showNotification('Порядок изображений обновлен', 'success');
            }

            // Перезагружаем галерею
            await loadGallery(currentModuleId);
            showLoadingIndicator(false);
        });
    });
}
function showLoadingIndicator(show) {
    const container = document.getElementById('galleryContainer');
    if (container && show) {
        const loader = document.createElement('div');
        loader.id = 'galleryLoader';
        loader.className = 'gallery-loader';
        loader.innerHTML = '<div class="spinner"></div><p>Обновление...</p>';
        if (!document.getElementById('galleryLoader')) {
            container.style.position = 'relative';
            container.appendChild(loader);
        }
    } else {
        const loader = document.getElementById('galleryLoader');
        if (loader) loader.remove();
    }
}
async function addGalleryImages() {
    const input = document.getElementById('galleryImageInput');
    if (!input || !input.files.length) return;

    const files = Array.from(input.files);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showNotification(`${file.name} - не изображение`, 'error');
            errorCount++;
            continue;
        }

        // Проверка размера (макс 20MB)
        if (file.size > 20 * 1024 * 1024) {
            showNotification(`${file.name} - файл слишком большой (макс 20MB)`, 'error');
            errorCount++;
            continue;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Upload failed');

            const uploadData = await uploadRes.json();

            await fetch(`${API_URL}/api/admin/modules/${currentModuleId}/gallery`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: uploadData.url,
                    sort_order: currentGalleryImages.length
                })
            });

            successCount++;
        } catch (err) {
            console.error('Error uploading:', err);
            errorCount++;
        }
    }

    // Показываем результат
    if (successCount > 0) {
        showNotification(`Загружено ${successCount} ${getDeclension(successCount, 'изображение', 'изображения', 'изображений')}`, 'success');
    }
    if (errorCount > 0) {
        showNotification(`Ошибок: ${errorCount}`, 'error');
    }

    // Очищаем input и перезагружаем
    if (input) input.value = '';
    await loadGallery(currentModuleId);
}
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotification = document.querySelector('.gallery-notification');
    if (oldNotification) oldNotification.remove();

    const notification = document.createElement('div');
    notification.className = `gallery-notification gallery-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Стили для уведомлений
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
// Склонение слов
function getDeclension(number, one, two, five) {
    let n = Math.abs(number) % 100;
    if (n > 10 && n < 20) return five;
    n = n % 10;
    if (n === 1) return one;
    if (n > 1 && n < 5) return two;
    return five;
}
// Инициализация зоны перетаскивания для загрузки
function initUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const galleryInput = document.getElementById('galleryImageInput');

    if (!uploadZone || !galleryInput) return;

    // Клик по зоне
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== uploadZone.querySelector('.btn-upload')) {
            galleryInput.click();
        }
    });

    // Drag and drop для загрузки
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

        if (files.length === 0) {
            showNotification('Пожалуйста, перетащите изображения', 'error');
            return;
        }

        // Имитируем выбор файлов
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        galleryInput.files = dataTransfer.files;

        // Загружаем
        await addGalleryImages();
    });

    // Выбор файлов через диалог
    galleryInput.addEventListener('change', async () => {
        await addGalleryImages();
    });
}

// Удаление изображения с подтверждением
async function removeGalleryImage(imageId) {
    const result = await showConfirmDialog('Удалить изображение из галереи?', 'Это действие нельзя отменить.');
    if (!result) return;

    try {
        await fetch(`${API_URL}/api/admin/gallery/${imageId}`, {
            method: 'DELETE',
            headers
        });

        showNotification('Изображение удалено', 'success');
        await loadGallery(currentModuleId);
    } catch (err) {
        console.error('Error deleting image:', err);
        showNotification('Ошибка при удалении', 'error');
    }
}

// Диалог подтверждения
function showConfirmDialog(message, subtitle = '') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'confirm-dialog';
        modal.innerHTML = `
            <div class="confirm-dialog-content">
                <h4>${message}</h4>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
                <div class="confirm-dialog-buttons">
                    <button class="btn btn-secondary confirm-no">Отмена</button>
                    <button class="btn btn-danger confirm-yes">Удалить</button>
                </div>
            </div>
        `;

        // Стили для диалога
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = modal.querySelector('.confirm-dialog-content');
        content.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            min-width: 300px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(modal);

        modal.querySelector('.confirm-no').onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.querySelector('.confirm-yes').onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}
// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .gallery-notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 12px 20px;
        min-width: 250px;
    }
    
    .gallery-notification-success {
        border-left: 4px solid #27ae60;
    }
    
    .gallery-notification-error {
        border-left: 4px solid #e74c3c;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-content i {
        font-size: 20px;
    }
    
    .gallery-notification-success i {
        color: #27ae60;
    }
    
    .gallery-notification-error i {
        color: #e74c3c;
    }
    
    .gallery-loader {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255,255,255,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        z-index: 10;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e9ecef;
        border-top-color: #4ecdc4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .gallery-loader p {
        margin-top: 12px;
        color: #4ecdc4;
        font-size: 14px;
    }
`;
document.head.appendChild(style);
const originalShowModuleModal = window.showModuleModal || showModuleModal;
window.showModuleModal = function(id = null) {
    originalShowModuleModal(id);
    setTimeout(() => {
        initStyledFileInputs();
        initUploadZone();
    }, 100);
};
// ============ МОДУЛИ ============
function closeModuleModal() {
    const modal = document.getElementById('moduleModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    const galleryInput = document.getElementById('galleryImageInput');
    if (galleryInput) galleryInput.value = '';
}
function setActiveMenu(activeId) {
    const menuItems = ['menuModules', 'menuLicenses', 'menuNews'];
    menuItems.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id === activeId) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        }
    });
}
function showModuleModal(id = null) {
    const modal = document.getElementById('moduleModal');
    const modalTitle = document.getElementById('moduleModalTitle');

    if (!modal) return;

    if (id) {
        modalTitle.textContent = '✏️ Редактирование модуля';
        currentModuleId = id;

        fetch(`${API_URL}/api/admin/modules/${id}`, { headers })
            .then(res => res.json())
            .then(module => {
                document.getElementById('moduleId').value = module.id;
                document.getElementById('moduleTitle').value = module.title;
                document.getElementById('moduleDescription').value = module.description || '';
                document.getElementById('moduleFileUrl').value = module.file_url || '';
                document.getElementById('moduleVersion').value = module.current_version;

                // Сохраняем оригинальные URL для сравнения
                if (module.preview_image) {
                    const previewUrl = module.preview_image.startsWith('http') ? module.preview_image : `${API_URL}${module.preview_image}`;
                    document.getElementById('previewContainer').innerHTML = `<img src="${previewUrl}" class="preview-image">`;
                    // Сохраняем оригинальный URL в скрытое поле или data-атрибут
                    document.getElementById('modulePreview').value = module.preview_image;
                } else {
                    document.getElementById('previewContainer').innerHTML = '';
                    document.getElementById('modulePreview').value = '';
                }

                if (module.file_url) {
                    document.getElementById('moduleFileUrl').value = module.file_url;
                }

                loadGallery(id);
            });
    } else {
        modalTitle.textContent = '➕ Создание модуля';
        document.getElementById('moduleForm').reset();
        document.getElementById('moduleId').value = '';
        document.getElementById('modulePreview').value = '';
        document.getElementById('moduleFileUrl').value = '';
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('galleryContainer').innerHTML = '<div class="text-muted p-3 text-center w-100">Нет изображений</div>';
        currentModuleId = null;
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
}


async function saveModule() {
    const id = document.getElementById('moduleId').value;
    const title = document.getElementById('moduleTitle').value;
    const description = document.getElementById('moduleDescription').value;
    const version = document.getElementById('moduleVersion').value;

    // Получаем текущие значения из формы (могут быть пустыми)
    let previewImage = document.getElementById('modulePreview')?.value || null;
    let fileUrl = document.getElementById('moduleFileUrl')?.value || null;

    const previewFile = document.getElementById('previewImageFile')?.files[0];
    const moduleFile = document.getElementById('moduleFile')?.files[0];

    if (!title || !version) {
        alert('Заполните заголовок и версию');
        return;
    }

    try {
        let newPreviewImage = null;
        let newFileUrl = null;

        let hasPreviewChange = false;
        let hasFileChange = false;

        // Загружаем новую картинку превью если выбрана
        if (previewFile) {
            const formData = new FormData();
            formData.append('file', previewFile);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            newPreviewImage = uploadData.url;
            hasPreviewChange = true;
        } else if (previewImage && previewImage.trim() !== '') {
            // Если есть существующая картинка (не пустая строка и не null)
            // Преобразуем относительный путь в полный URL для отправки на сервер
            if (previewImage.startsWith('/uploads/')) {
                newPreviewImage = `${API_URL}${previewImage}`;
            } else {
                newPreviewImage = previewImage;
            }
            hasPreviewChange = true;
        } else {
            // Если поле пустое и нет файла - значит пользователь явно удалил картинку
            // Отправляем null, чтобы удалить картинку на сервере
            newPreviewImage = null;
            hasPreviewChange = true;
        }

        // Загружаем новый файл модуля если выбран
        if (moduleFile) {
            const formData = new FormData();
            formData.append('file', moduleFile);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/file`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            newFileUrl = uploadData.url;
            hasFileChange = true;
        } else if (fileUrl && fileUrl.trim() !== '') {
            // Если есть существующий файл
            if (fileUrl.startsWith('/uploads/')) {
                newFileUrl = `${API_URL}${fileUrl}`;
            } else {
                newFileUrl = fileUrl;
            }
            hasFileChange = true;
        } else {
            // Если поле пустое и нет файла - отправляем null
            newFileUrl = null;
            hasFileChange = true;
        }

        // Формируем объект только с измененными полями
        const data = {
            title,
            description,
            current_version: version
        };

        // Добавляем preview_image только если она была изменена
        if (hasPreviewChange) {
            data.preview_image = newPreviewImage;
        }

        // Добавляем file_url только если он был изменен
        if (hasFileChange) {
            data.file_url = newFileUrl;
        }

        const url = id ? `${API_URL}/api/admin/modules/${id}` : `${API_URL}/api/admin/modules`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModuleModal();
            showModulesList();
        } else {
            const err = await response.json();
            alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
        }
    } catch (err) {
        console.error(err);
        alert('Ошибка соединения');
    }
}

async function deleteModule(id) {
    if (!confirm('Удалить модуль? Все данные (галерея, лицензии, версии) будут удалены!')) return;
    await fetch(`${API_URL}/api/admin/modules/${id}`, { method: 'DELETE', headers });
    showModulesList();
}

async function showModulesList() {
    setActiveMenu('menuModules');
    currentSection = 'modules';

    const response = await fetch(`${API_URL}/api/admin/modules`, { headers });
    const modules = await response.json();

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
            previewUrl = `${API_URL}${previewUrl}`;
        } else if (!previewUrl) {
            previewUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"%3E%3Crect width="300" height="160" fill="%23e9ecef"/%3E%3Ctext x="150" y="85" text-anchor="middle" fill="%23999"%3ENo image%3C/text%3E%3C/svg%3E';
        }

        html += `
            <div class="card">
                <img src="${previewUrl}" class="card-img-top" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'160\' viewBox=\'0 0 300 160\'%3E%3Crect width=\'300\' height=\'160\' fill=\'%23e9ecef\'/%3E%3Ctext x=\'150\' y=\'85\' text-anchor=\'middle\' fill=\'%23999\'%3ENo image%3C/text%3E%3C/svg%3E'">
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


// ============ ЛИЦЕНЗИИ ============
async function showLicensesList() {
    setActiveMenu('menuLicenses');
    currentSection = 'licenses';

    const modulesRes = await fetch(`${API_URL}/api/admin/modules`, { headers });
    const modules = await modulesRes.json();

    let html = `
        <div class="page-header">
            <h2><i class="bi bi-key-fill"></i> Управление лицензиями</h2>
            <div class="header-actions">
                <div class="dropdown" id="moduleDropdown">
                    <button class="dropdown-toggle" id="dropdownBtn">
                        <i class="bi bi-folder"></i> Выбрать модуль
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <div class="dropdown-menu" id="dropdownMenu">
                        ${modules.map(m => `<a href="#" data-module-id="${m.id}" class="module-select">${escapeHtml(m.title)}</a>`).join('')}
                        ${modules.length === 0 ? '<a href="#" disabled>Нет модулей</a>' : ''}
                    </div>
                </div>
            </div>
        </div>
        <div id="licensesContent">
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Выберите модуль для управления лицензиями
            </div>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = html;

    // Инициализация дропдауна
    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        dropdownMenu.querySelectorAll('.module-select').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const moduleId = item.dataset.moduleId;
                dropdownBtn.innerHTML = `<i class="bi bi-folder"></i> ${item.textContent} <i class="bi bi-chevron-down"></i>`;
                dropdownMenu.classList.remove('show');
                await loadLicensesForModule(moduleId);
            });
        });
    }
}

async function loadLicensesForModule(moduleId) {
    const moduleRes = await fetch(`${API_URL}/api/admin/modules/${moduleId}`, { headers });
    const module = await moduleRes.json();
    const licensesRes = await fetch(`${API_URL}/api/admin/modules/${moduleId}/licenses`, { headers });
    const licenses = await licensesRes.json();

    let html = `
        <div class="card">
            <div class="card-header">
                <h4>${escapeHtml(module.title)}</h4>
                <p class="mb-0 text-muted">Управление лицензиями</p>
            </div>
            <div class="card-body">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h5>➕ Добавить лицензию</h5>
                        <div class="input-group">
                            <input type="text" id="newLicenseKey" class="form-control" placeholder="Серийный номер">
                            <select id="newLicenseStatus" class="form-select" style="width: 130px;">
                                <option value="active">Активна</option>
                                <option value="inactive">Неактивна</option>
                                <option value="pending">Ожидание</option>
                                <option value="expired">Просрочена</option>
                                <option value="rejected">Отклонена</option>
                            </select>
                            <button class="btn btn-primary" id="addLicenseBtn">Добавить</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h5>📄 Массовый импорт</h5>
                        <div class="input-group">
                            <input type="file" id="csvFile" class="form-control" accept=".csv,.txt">
                            <button class="btn btn-secondary" id="importCsvBtn">Импорт CSV</button>
                        </div>
                        <small class="text-muted">Формат: каждая строка - серийный номер</small>
                    </div>
                </div>
                
                <h5>Список лицензий (${licenses.length})</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr><th>Серийный номер</th><th>Статус</th><th>Дата создания</th><th>Истекает</th><th>Действия</th></tr>
                        </thead>
                        <tbody>
    `;

    licenses.forEach(lic => {
        html += `
            <tr>
                <td><code>${escapeHtml(lic.license_key)}</code></td>
                <td>
                    <select class="form-select form-select-sm license-status" data-id="${lic.id}" style="width: 130px;">
                        <option value="active" ${lic.status === 'active' ? 'selected' : ''}>🟢 Активна</option>
                        <option value="inactive" ${lic.status === 'inactive' ? 'selected' : ''}>🔴 Неактивна</option>
                        <option value="pending" ${lic.status === 'pending' ? 'selected' : ''}>🟡 Ожидание</option>
                        <option value="expired" ${lic.status === 'expired' ? 'selected' : ''}>⚫ Просрочена</option>
                        <option value="rejected" ${lic.status === 'rejected' ? 'selected' : ''}>🔴 Отклонена</option>
                    </select>
                </td>
                <td>${new Date(lic.created_at).toLocaleDateString()}</td>
                <td><input type="date" class="form-control form-control-sm license-expires" data-id="${lic.id}" value="${lic.expires_at || ''}" style="width: 130px;"></td>
                <td><button class="btn btn-sm btn-danger delete-license-btn" data-id="${lic.id}"><i class="bi bi-trash"></i></button></td>
            </tr>
        `;
    });

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('licensesContent').innerHTML = html;

    document.getElementById('addLicenseBtn')?.addEventListener('click', async () => {
        const key = document.getElementById('newLicenseKey').value;
        const status = document.getElementById('newLicenseStatus').value;
        if (!key) return;

        await fetch(`${API_URL}/api/admin/licenses`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_id: moduleId, license_key: key, status })
        });

        document.getElementById('newLicenseKey').value = '';
        loadLicensesForModule(moduleId);
    });

    document.getElementById('importCsvBtn')?.addEventListener('click', async () => {
        const file = document.getElementById('csvFile').files[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const licenses = lines.map(l => l.trim());

        await fetch(`${API_URL}/api/admin/licenses/bulk`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_id: moduleId, licenses })
        });

        loadLicensesForModule(moduleId);
        document.getElementById('csvFile').value = '';
    });

    document.querySelectorAll('.license-status').forEach(select => {
        select.addEventListener('change', async () => {
            await fetch(`${API_URL}/api/admin/licenses/${select.dataset.id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: select.value })
            });
        });
    });

    document.querySelectorAll('.license-expires').forEach(input => {
        input.addEventListener('change', async () => {
            await fetch(`${API_URL}/api/admin/licenses/${input.dataset.id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ expires_at: input.value || null })
            });
        });
    });

    document.querySelectorAll('.delete-license-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить лицензию?')) {
                await fetch(`${API_URL}/api/admin/licenses/${btn.dataset.id}`, { method: 'DELETE', headers });
                loadLicensesForModule(moduleId);
            }
        });
    });
}

// ============ НОВОСТИ ============
async function showNewsList() {
    setActiveMenu('menuNews');
    currentSection = 'news';

    const modulesRes = await fetch(`${API_URL}/api/admin/modules`, { headers });
    const modules = await modulesRes.json();

    const response = await fetch(`${API_URL}/api/admin/news`, { headers });
    const newsList = await response.json();

    let html = `
        <div class="page-header">
            <h2><i class="bi bi-newspaper"></i> Новости</h2>
            <div class="header-actions">
                <button class="btn btn-success" id="createNewsBtn"><i class="bi bi-plus-lg"></i> Добавить новость</button>
            </div>
        </div>
        <div class="news-grid" id="newsGrid">
    `;

    for (const news of newsList) {
        let moduleName = '🌍 Все модули';
        if (news.module_id) {
            const module = modules.find(m => m.id === news.module_id);
            moduleName = module ? `📦 ${module.title}` : '❓ Неизвестный модуль';
        }

        let imageUrl = news.image_url;
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
            imageUrl = `${API_URL}${imageUrl}`;
        }

        const imageHtml = imageUrl
            ? `<img src="${imageUrl}" class="card-img-top" onerror="this.style.display='none'">`
            : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center"><i class="bi bi-image" style="font-size: 48px; color: #ccc;"></i></div>`;

        html += `
            <div class="card">
                ${imageHtml}
                <div class="card-body">
                    <div class="mb-2">
                        <span class="badge badge-secondary">${moduleName}</span>
                    </div>
                    <h5 class="card-title">${escapeHtml(news.title)}</h5>
                    <p class="card-text"><small>${new Date(news.published_at).toLocaleDateString()}</small></p>
                    <p class="card-text">${escapeHtml(news.content.substring(0, 100))}${news.content.length > 100 ? '...' : ''}</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-warning edit-news-btn" data-id="${news.id}"><i class="bi bi-pencil"></i> Редактировать</button>
                        <button class="btn btn-sm btn-danger delete-news-btn" data-id="${news.id}"><i class="bi bi-trash"></i> Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }

    if (newsList.length === 0) {
        html += `<div class="text-muted text-center p-5">Нет новостей. Создайте первую!</div>`;
    }

    html += `</div>`;
    document.getElementById('mainContent').innerHTML = html;

    document.getElementById('createNewsBtn')?.addEventListener('click', () => showNewsModal());
    document.querySelectorAll('.edit-news-btn').forEach(btn => {
        btn.addEventListener('click', () => showNewsModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-news-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить новость?')) {
                await fetch(`${API_URL}/api/admin/news/${btn.dataset.id}`, { method: 'DELETE', headers });
                showNewsList();
            }
        });
    });
}


function showNewsModal(id = null) {
    const modal = document.getElementById('newsModal');
    const modalTitle = document.getElementById('newsModalTitle');

    if (!modal) return;

    // Загружаем модули для селекта
    fetch(`${API_URL}/api/admin/modules`, { headers })
        .then(res => res.json())
        .then(modules => {
            const select = document.getElementById('newsModuleId');
            if (select) {
                select.innerHTML = '<option value="">-- Все модули (общая новость) --</option>' +
                    modules.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join('');
            }
        });

    // Сброс превью и имени файла
    const newsImageLabel = document.getElementById('newsImageLabel');
    if (newsImageLabel) {
        const fileNameSpan = newsImageLabel.querySelector('.file-name');
        if (fileNameSpan) fileNameSpan.textContent = 'Выберите изображение...';
    }

    if (id) {
        modalTitle.textContent = '✏️ Редактирование новости';
        fetch(`${API_URL}/api/admin/news/${id}`, { headers })
            .then(res => res.json())
            .then(news => {
                document.getElementById('newsId').value = news.id;
                document.getElementById('newsTitle').value = news.title;
                document.getElementById('newsContent').value = news.content;
                document.getElementById('newsModuleId').value = news.module_id || '';

                if (news.image_url) {
                    const imgUrl = news.image_url.startsWith('http') ? news.image_url : `${API_URL}${news.image_url}`;
                    const container = document.getElementById('newsPreviewContainer');
                    if (container) {
                        container.innerHTML = `
                            <div style="position: relative; display: inline-block;">
                                <img src="${imgUrl}" class="preview-image">
                                <button type="button" class="remove-image-btn" onclick="removeNewsImage()" 
                                        style="position: absolute; top: -8px; right: -8px; background: #e74c3c; color: white; 
                                               border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;
                                               display: flex; align-items: center; justify-content: center;">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        `;
                    }

                    // Обновляем лейбл с именем файла (если есть)
                    if (news.image_url) {
                        const fileName = news.image_url.split('/').pop();
                        if (newsImageLabel) {
                            const fileNameSpan = newsImageLabel.querySelector('.file-name');
                            if (fileNameSpan) fileNameSpan.textContent = fileName;
                        }
                    }
                } else {
                    const container = document.getElementById('newsPreviewContainer');
                    if (container) {
                        container.innerHTML = `
                            <div class="preview-placeholder">
                                <i class="bi bi-image"></i>
                                <p>Нет изображения</p>
                            </div>
                        `;
                    }
                }
            });
    } else {
        modalTitle.textContent = '➕ Добавить новость';
        document.getElementById('newsForm').reset();
        document.getElementById('newsId').value = '';
        document.getElementById('newsModuleId').value = '';

        const container = document.getElementById('newsPreviewContainer');
        if (container) {
            container.innerHTML = `
                <div class="preview-placeholder">
                    <i class="bi bi-image"></i>
                    <p>Нет изображения</p>
                </div>
            `;
        }
    }

    modal.classList.add('show');
    modal.style.display = 'flex';

    // Инициализируем стилизованные инпуты после открытия модалки
    setTimeout(() => {
        initStyledFileInputs();
    }, 100);
}
function initStyledFileInputs() {
    // Для превью изображения модуля
    const previewInput = document.getElementById('previewImageFile');
    if (previewInput) {
        const label = document.querySelector('label[for="previewImageFile"]');
        if (label) {
            const fileNameSpan = label.querySelector('.file-name');
            previewInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && fileNameSpan) {
                    fileNameSpan.textContent = file.name;
                } else if (fileNameSpan) {
                    fileNameSpan.textContent = 'Выберите изображение...';
                }

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
    }

    // Для файла модуля
    const moduleFileInput = document.getElementById('moduleFile');
    if (moduleFileInput) {
        const label = document.querySelector('label[for="moduleFile"]');
        if (label) {
            const fileNameSpan = label.querySelector('.file-name');
            moduleFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && fileNameSpan) {
                    fileNameSpan.textContent = file.name;
                } else if (fileNameSpan) {
                    fileNameSpan.textContent = 'Выберите файл...';
                }
            });
        }
    }

    // Для изображения новости
    const newsImageInput = document.getElementById('newsImageFile');
    if (newsImageInput) {
        const label = document.getElementById('newsImageLabel');
        if (label) {
            const fileNameSpan = label.querySelector('.file-name');
            newsImageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && fileNameSpan) {
                    fileNameSpan.textContent = file.name;
                } else if (fileNameSpan) {
                    fileNameSpan.textContent = 'Выберите изображение...';
                }

                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const container = document.getElementById('newsPreviewContainer');
                        if (container) {
                            container.innerHTML = `<img src="${event.target.result}" class="preview-image">`;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
}
function removeNewsImage() {
    const container = document.getElementById('newsPreviewContainer');
    if (container) {
        container.innerHTML = `
            <div class="preview-placeholder">
                <i class="bi bi-image"></i>
                <p>Нет изображения</p>
            </div>
        `;
    }

    // Сбрасываем input файла
    const imageInput = document.getElementById('newsImageFile');
    if (imageInput) {
        imageInput.value = '';
    }

    // Сбрасываем лейбл
    const newsImageLabel = document.getElementById('newsImageLabel');
    if (newsImageLabel) {
        const fileNameSpan = newsImageLabel.querySelector('.file-name');
        if (fileNameSpan) fileNameSpan.textContent = 'Выберите изображение...';
    }
}


async function saveNews() {
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const moduleId = document.getElementById('newsModuleId')?.value;
    let imageUrl = null;

    const imageFile = document.getElementById('newsImageFile').files[0]; // Исправлено: было file, стало imageFile

    if (!title || !content) {
        alert('Заполните заголовок и текст');
        return;
    }

    try {
        if (imageFile) {  // Исправлено: проверяем imageFile, а не file
            const formData = new FormData();
            formData.append('file', imageFile);  // Исправлено: используем imageFile
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
        } else {
            // Проверяем, есть ли уже загруженное изображение
            const existingImg = document.getElementById('newsPreviewContainer')?.querySelector('img');
            if (existingImg && existingImg.src) {
                const src = existingImg.src;
                if (src.startsWith(API_URL)) {
                    imageUrl = src.replace(API_URL, '');
                } else if (src.startsWith('http')) {
                    imageUrl = src;
                } else {
                    imageUrl = null;
                }
            }
        }

        const data = {
            title,
            content,
            image_url: imageUrl,
            module_id: moduleId || null
        };

        const url = id ? `${API_URL}/api/admin/news/${id}` : `${API_URL}/api/admin/news`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeNewsModal();
            showNewsList();
        } else {
            const err = await response.json();
            alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
        }
    } catch (err) {
        console.error(err);
        alert('Ошибка соединения');
    }
}

function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
// Добавить в начало файла после API_URL
let isSidebarOpen = false;

// Функция для мобильного меню
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}
// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', function() {
    // Навигация
    const menuModules = document.getElementById('menuModules');
    const menuLicenses = document.getElementById('menuLicenses');
    const menuNews = document.getElementById('menuNews');
    const logoutLink = document.getElementById('logoutLink');

    if (menuModules) menuModules.addEventListener('click', showModulesList);
    if (menuLicenses) menuLicenses.addEventListener('click', showLicensesList);
    if (menuNews) menuNews.addEventListener('click', showNewsList);
    if (logoutLink) logoutLink.addEventListener('click', logout);

    // Модалки - кнопки закрытия
    const saveModuleBtn = document.getElementById('saveModuleBtn');
    const saveNewsBtn = document.getElementById('saveNewsBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const closeNewsModalBtn = document.getElementById('closeNewsModalBtn');
    const cancelNewsModalBtn = document.getElementById('cancelNewsModalBtn');

    if (saveModuleBtn) saveModuleBtn.addEventListener('click', saveModule);
    if (saveNewsBtn) saveNewsBtn.addEventListener('click', saveNews);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModuleModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModuleModal);
    if (closeNewsModalBtn) closeNewsModalBtn.addEventListener('click', closeNewsModal);
    if (cancelNewsModalBtn) cancelNewsModalBtn.addEventListener('click', closeNewsModal);

    // Закрытие модалки по клику на оверлей
    const moduleModal = document.getElementById('moduleModal');
    const newsModal = document.getElementById('newsModal');

    if (moduleModal) {
        moduleModal.addEventListener('click', function(e) {
            if (e.target === moduleModal) {
                closeModuleModal();
            }
        });
    }

    if (newsModal) {
        newsModal.addEventListener('click', function(e) {
            if (e.target === newsModal) {
                closeNewsModal();
            }
        });
    }

    // Превью картинки модуля
    const previewInput = document.getElementById('previewImageFile');
    if (previewInput) {
        previewInput.addEventListener('change', function(e) {
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

    // Превью картинки новости
    const newsImageInput = document.getElementById('newsImageFile');
    if (newsImageInput) {
        newsImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const container = document.getElementById('newsPreviewContainer');
                    if (container) {
                        container.innerHTML = `<img src="${event.target.result}" class="preview-image">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // Мобильное меню
    const menuToggle = document.createElement('button');
    menuToggle.innerHTML = '<i class="bi bi-list"></i>';
    menuToggle.className = 'menu-toggle';
    menuToggle.onclick = toggleSidebar;
    document.body.appendChild(menuToggle);

    // Закрыть меню при клике вне его на мобильных
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            const toggle = document.querySelector('.menu-toggle');
            if (sidebar && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        }
    });
    // Стартовая страница
    showModulesList();
});