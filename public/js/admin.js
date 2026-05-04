const API_URL = window.location.origin;
let currentSection = 'modules';

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

// ============ МОДАЛКИ ============
function closeModuleModal() {
    const modal = document.getElementById('moduleModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function showModuleModal(id = null) {
    const modal = document.getElementById('moduleModal');
    const modalTitle = document.getElementById('moduleModalTitle');
    const form = document.getElementById('moduleForm');

    if (id) {
        modalTitle.textContent = '✏️ Редактирование модуля';
        fetch(`${API_URL}/api/admin/modules/${id}`, { headers })
            .then(res => res.json())
            .then(module => {
                document.getElementById('moduleId').value = module.id;
                document.getElementById('moduleTitle').value = module.title;
                document.getElementById('moduleDescription').value = module.description || '';
                document.getElementById('modulePreview').value = module.preview_image || '';
                document.getElementById('moduleFileUrl').value = module.file_url || '';
                document.getElementById('moduleVersion').value = module.current_version;
                if (module.preview_image) {
                    document.getElementById('previewContainer').innerHTML = `<img src="${module.preview_image}" class="preview-image">`;
                }
            });
    } else {
        modalTitle.textContent = '➕ Создание модуля';
        form.reset();
        document.getElementById('moduleId').value = '';
        document.getElementById('previewContainer').innerHTML = '';
    }

    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function showNewsModal(id = null) {
    const modal = document.getElementById('newsModal');
    const modalTitle = document.getElementById('newsModalTitle');

    if (id) {
        modalTitle.textContent = '✏️ Редактирование новости';
        fetch(`${API_URL}/api/admin/news/${id}`, { headers })
            .then(res => res.json())
            .then(news => {
                document.getElementById('newsId').value = news.id;
                document.getElementById('newsTitle').value = news.title;
                document.getElementById('newsContent').value = news.content;
                document.getElementById('newsImage').value = news.image_url || '';
                if (news.image_url) {
                    document.getElementById('newsPreviewContainer').innerHTML = `<img src="${news.image_url}" class="preview-image">`;
                }
            });
    } else {
        modalTitle.textContent = '➕ Добавить новость';
        document.getElementById('newsForm').reset();
        document.getElementById('newsId').value = '';
        document.getElementById('newsPreviewContainer').innerHTML = '';
    }

    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

// ============ МОДУЛИ ============
async function saveModule() {
    const id = document.getElementById('moduleId').value;
    const title = document.getElementById('moduleTitle').value;
    const description = document.getElementById('moduleDescription').value;
    const version = document.getElementById('moduleVersion').value;
    let previewImage = document.getElementById('modulePreview').value;
    let fileUrl = document.getElementById('moduleFileUrl').value;

    const previewFile = document.getElementById('previewImageFile').files[0];
    const moduleFile = document.getElementById('moduleFile').files[0];

    if (!title || !version) {
        alert('Заполните заголовок и версию');
        return;
    }

    try {
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
        }

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
        }

        const data = { title, description, preview_image: previewImage, file_url: fileUrl, current_version: version };
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
        alert('Ошибка соединения');
    }
}

async function deleteModule(id) {
    if (!confirm('Удалить модуль?')) return;
    await fetch(`${API_URL}/api/admin/modules/${id}`, { method: 'DELETE', headers });
    showModulesList();
}

async function showModulesList() {
    currentSection = 'modules';
    const response = await fetch(`${API_URL}/api/admin/modules`, { headers });
    const modules = await response.json();

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-grid-3x3-gap-fill"></i> Модули</h2>
            <button class="btn btn-success" id="createModuleBtn"><i class="bi bi-plus-lg"></i> Создать модуль</button>
        </div>
        <div class="row">
    `;

    for (const module of modules) {
        const galleryRes = await fetch(`${API_URL}/api/admin/modules/${module.id}/gallery`, { headers });
        const gallery = await galleryRes.json();

        const versionsRes = await fetch(`${API_URL}/api/admin/modules/${module.id}/versions`, { headers });
        const versions = await versionsRes.json();

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <img src="${module.preview_image || 'https://via.placeholder.com/300x180?text=No+Image'}" class="card-img-top" style="height: 180px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(module.title)}</h5>
                        <p class="card-text text-muted small">Версия: ${escapeHtml(module.current_version)}</p>
                        <p class="card-text small">${escapeHtml(module.description || 'Нет описания')}</p>
                        
                        <hr>
                        <h6 class="mb-2">🖼️ Галерея (${gallery.length})</h6>
                        <div class="gallery-grid mb-3">
        `;

        gallery.slice(0, 3).forEach(img => {
            html += `<div class="gallery-item"><img src="${img.image_url}" onerror="this.src='https://via.placeholder.com/150'"></div>`;
        });

        html += `</div>
                        <h6 class="mb-2">📜 Версии (${versions.length})</h6>
                        <div class="small text-muted mb-3">
                         версия: ${escapeHtml(module.current_version)}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-warning edit-module-btn" data-id="${module.id}"><i class="bi bi-pencil"></i> Редактировать</button>
                            <button class="btn btn-sm btn-danger delete-module-btn" data-id="${module.id}"><i class="bi bi-trash"></i> Удалить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
    currentSection = 'licenses';
    const modulesRes = await fetch(`${API_URL}/api/admin/modules`, { headers });
    const modules = await modulesRes.json();

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-key-fill"></i> Управление лицензиями</h2>
            <div class="dropdown">
                <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown">Выбрать модуль</button>
                <ul class="dropdown-menu">
        ${modules.map(m => `<li><a class="dropdown-item" href="#" data-module-id="${m.id}">${escapeHtml(m.title)}</a></li>`).join('')}
                </ul>
            </div>
        </div>
        <div id="licensesContent">
            <div class="alert alert-info">Выберите модуль для управления лицензиями</div>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = html;

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const moduleId = e.target.dataset.moduleId;
            await loadLicensesForModule(moduleId);
        });
    });
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
                
                <h5>Список лицензий</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Серийный номер</th>
                                <th>Статус</th>
                                <th>Дата создания</th>
                                <th>Истекает</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    const statusLabels = {
        active: '🟢 Активна',
        inactive: '🔴 Неактивна',
        pending: '🟡 Ожидание',
        expired: '⚫ Просрочена',
        rejected: '🔴 Отклонена'
    };

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
                <td>
                    <button class="btn btn-sm btn-danger delete-license-btn" data-id="${lic.id}"><i class="bi bi-trash"></i></button>
                </td>
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

    // Добавить лицензию
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

    // Импорт CSV
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

    // Обновление статуса
    document.querySelectorAll('.license-status').forEach(select => {
        select.addEventListener('change', async () => {
            await fetch(`${API_URL}/api/admin/licenses/${select.dataset.id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: select.value })
            });
        });
    });

    // Обновление даты истечения
    document.querySelectorAll('.license-expires').forEach(input => {
        input.addEventListener('change', async () => {
            await fetch(`${API_URL}/api/admin/licenses/${input.dataset.id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ expires_at: input.value || null })
            });
        });
    });

    // Удаление
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
    currentSection = 'news';
    const response = await fetch(`${API_URL}/api/admin/news`, { headers });
    const newsList = await response.json();

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="bi bi-newspaper"></i> Новости</h2>
            <button class="btn btn-success" id="createNewsBtn"><i class="bi bi-plus-lg"></i> Добавить новость</button>
        </div>
        <div class="row">
    `;

    for (const news of newsList) {
        // Получаем модуль для новости
        let moduleName = 'Все модули';
        if (news.module_id) {
            const moduleRes = await fetch(`${API_URL}/api/admin/modules/${news.module_id}`, { headers });
            const module = await moduleRes.json();
            moduleName = module.title;
        }

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <img src="${news.image_url || 'https://via.placeholder.com/300x160?text=News'}" class="card-img-top" style="height: 160px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(news.title)}</h5>
                        <p class="card-text text-muted small">
                            <i class="bi bi-folder"></i> ${escapeHtml(moduleName)} | 
                            <i class="bi bi-calendar"></i> ${new Date(news.published_at).toLocaleDateString()}
                        </p>
                        <p class="card-text">${escapeHtml(news.content.substring(0, 100))}${news.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-warning edit-news-btn" data-id="${news.id}"><i class="bi bi-pencil"></i> Редактировать</button>
                            <button class="btn btn-sm btn-danger delete-news-btn" data-id="${news.id}"><i class="bi bi-trash"></i> Удалить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (newsList.length === 0) {
        html += `<div class="col-12"><div class="alert alert-info">Нет новостей. Создайте первую!</div></div>`;
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

async function saveNews() {
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    let imageUrl = document.getElementById('newsImage').value;

    const imageFile = document.getElementById('newsImageFile').files[0];

    if (!title || !content) {
        alert('Заполните заголовок и текст');
        return;
    }

    try {
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', imageFile);
            const uploadRes = await fetch(`${API_URL}/api/admin/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
        }

        const data = { title, content, image_url: imageUrl };
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
        alert('Ошибка соединения');
    }
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ============
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', function() {
    // Навигация
    document.getElementById('menuModules')?.addEventListener('click', showModulesList);
    document.getElementById('menuLicenses')?.addEventListener('click', showLicensesList);
    document.getElementById('menuNews')?.addEventListener('click', showNewsList);
    document.getElementById('logoutLink')?.addEventListener('click', logout);

    // Модалки
    document.getElementById('saveModuleBtn')?.addEventListener('click', saveModule);
    document.getElementById('saveNewsBtn')?.addEventListener('click', saveNews);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModuleModal);
    document.getElementById('cancelModalBtn')?.addEventListener('click', closeModuleModal);
    document.getElementById('closeNewsModalBtn')?.addEventListener('click', closeNewsModal);
    document.getElementById('cancelNewsModalBtn')?.addEventListener('click', closeNewsModal);

    // Превью картинок
    const previewInput = document.getElementById('previewImageFile');
    if (previewInput) {
        previewInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('previewContainer').innerHTML = `<img src="${event.target.result}" class="preview-image">`;
                    document.getElementById('modulePreview').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const newsImageInput = document.getElementById('newsImageFile');
    if (newsImageInput) {
        newsImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('newsPreviewContainer').innerHTML = `<img src="${event.target.result}" class="preview-image">`;
                    document.getElementById('newsImage').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    showModulesList();
});