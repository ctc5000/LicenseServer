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
async function loadGallery(moduleId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/modules/${moduleId}/gallery`, { headers });
        const gallery = await response.json();
        currentGalleryImages = gallery;

        const container = document.getElementById('galleryContainer');
        const emptyMsg = document.getElementById('emptyGalleryMsg');

        if (!container) return;

        if (gallery.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            container.innerHTML = '<div class="text-muted p-3 text-center w-100" id="emptyGalleryMsg">Нет изображений в галерее</div>';
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';

        let html = '';
        gallery.forEach((img, index) => {
            let imgUrl = img.image_url;
            if (imgUrl && imgUrl.startsWith('/uploads/')) {
                imgUrl = `${API_URL}${imgUrl}`;
            }
            html += `
                <div class="gallery-item position-relative" data-id="${img.id}" data-index="${index}" style="min-width: 100px; cursor: grab;">
                    <img src="${imgUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" 
                         onerror="this.src='${getPlaceholderImage('Error')}'">
                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" 
                            style="width: 24px; height: 24px; padding: 0; font-size: 12px; border-radius: 50%;"
                            onclick="removeGalleryImage(${img.id})">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="text-center small mt-1">${index + 1}</div>
                </div>
            `;
        });

        container.innerHTML = html;
        initDragAndDrop();

    } catch (err) {
        console.error('Error loading gallery:', err);
    }
}

function initDragAndDrop() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;

    let draggedItem = null;

    const items = container.querySelectorAll('.gallery-item');

    items.forEach(item => {
        item.setAttribute('draggable', 'true');

        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', (e) => {
            item.style.opacity = '';
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedItem || draggedItem === item) return;

            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(item.dataset.index);

            if (isNaN(fromIndex) || isNaN(toIndex)) return;

            // Меняем порядок в массиве
            const reordered = [...currentGalleryImages];
            const [movedItem] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, movedItem);

            // Обновляем sort_order на сервере
            for (let i = 0; i < reordered.length; i++) {
                const img = reordered[i];
                if (img.sort_order !== i) {
                    await fetch(`${API_URL}/api/admin/gallery/${img.id}`, {
                        method: 'PUT',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sort_order: i })
                    });
                }
            }

            // Перезагружаем галерею
            await loadGallery(currentModuleId);
        });
    });
}

async function addGalleryImages() {
    const input = document.getElementById('galleryImageInput');
    if (!input) {
        console.error('galleryImageInput not found');
        return;
    }

    const files = Array.from(input.files);
    if (files.length === 0) return;

    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const uploadData = await uploadRes.json();

        await fetch(`${API_URL}/api/admin/modules/${currentModuleId}/gallery`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: uploadData.url,
                sort_order: currentGalleryImages.length
            })
        });
    }

    if (input) input.value = '';
    await loadGallery(currentModuleId);
}

async function removeGalleryImage(imageId) {
    if (!confirm('Удалить изображение из галереи?')) return;

    await fetch(`${API_URL}/api/admin/gallery/${imageId}`, {
        method: 'DELETE',
        headers
    });

    await loadGallery(currentModuleId);
}

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

                if (module.preview_image) {
                    const previewUrl = module.preview_image.startsWith('http') ? module.preview_image : `${API_URL}${module.preview_image}`;
                    document.getElementById('previewContainer').innerHTML = `<img src="${previewUrl}" class="preview-image">`;
                } else {
                    document.getElementById('previewContainer').innerHTML = '';
                }

                loadGallery(id);
            });
    } else {
        modalTitle.textContent = '➕ Создание модуля';
        document.getElementById('moduleForm').reset();
        document.getElementById('moduleId').value = '';
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
    let previewImage = document.getElementById('modulePreview')?.value || null;
    let fileUrl = document.getElementById('moduleFileUrl')?.value || null;

    const previewFile = document.getElementById('previewImageFile')?.files[0];
    const moduleFile = document.getElementById('moduleFile')?.files[0];

    if (!title || !version) {
        alert('Заполните заголовок и версию');
        return;
    }

    try {
        // Загружаем картинку превью если выбрана
        if (previewFile) {
            const formData = new FormData();
            formData.append('file', previewFile);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            previewImage = uploadData.url;
        } else if (previewImage && previewImage.startsWith('/uploads/')) {
            // Преобразуем относительный путь в полный URL
            previewImage = `${API_URL}${previewImage}`;
        }

        // Загружаем файл модуля если выбран
        if (moduleFile) {
            const formData = new FormData();
            formData.append('file', moduleFile);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/file`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            fileUrl = uploadData.url;
        } else if (fileUrl && fileUrl.startsWith('/uploads/')) {
            // Преобразуем относительный путь в полный URL
            fileUrl = `${API_URL}${fileUrl}`;
        }

        const data = {
            title,
            description,
            preview_image: previewImage,
            file_url: fileUrl,
            current_version: version
        };

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
                    document.getElementById('newsPreviewContainer').innerHTML = `<img src="${imgUrl}" class="preview-image">`;
                } else {
                    document.getElementById('newsPreviewContainer').innerHTML = '';
                }
            });
    } else {
        modalTitle.textContent = '➕ Добавить новость';
        document.getElementById('newsForm').reset();
        document.getElementById('newsId').value = '';
        document.getElementById('newsPreviewContainer').innerHTML = '';
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
}

async function saveNews() {
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const moduleId = document.getElementById('newsModuleId')?.value;
    let imageUrl = null;

    const imageFile = document.getElementById('newsImageFile').files[0];

    if (!title || !content) {
        alert('Заполните заголовок и текст');
        return;
    }

    try {
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
        } else {
            const existingImg = document.getElementById('newsPreviewContainer')?.querySelector('img');
            if (existingImg) {
                const src = existingImg.src;
                if (src.startsWith(API_URL)) {
                    imageUrl = src.replace(API_URL, '');
                } else {
                    imageUrl = src;
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