// modules/licenses.js
import { api } from '../utils/api.js';
import { escapeHtml, getStatusText, showConfirmDialog } from '../utils/helpers.js';
import { showNotification } from '../components/notifications.js';
import { LICENSES_PER_PAGE } from '../utils/constants.js';

let currentLicenseModuleId = null;
let currentModule = null;
let allLicenses = [];
let filteredLicenses = [];
let currentLicenseFilter = 'all';
let currentLicenseSearch = '';
let currentLicensePage = 1;
let searchTimeout = null;

export async function showLicensesList() {
    setActiveMenu('menuLicenses');

    const modules = await api.modules.getAll();

    if (modules.length === 0) {
        document.getElementById('mainContent').innerHTML = `
            <div class="page-header">
                <h2><i class="bi bi-key-fill"></i> Управление лицензиями</h2>
            </div>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i>
                Нет доступных модулей. Сначала создайте модуль.
            </div>
        `;
        return;
    }

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

    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    dropdownBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => dropdownMenu?.classList.remove('show'));

    dropdownMenu?.querySelectorAll('.module-select').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const moduleId = parseInt(item.dataset.moduleId);
            dropdownBtn.innerHTML = `<i class="bi bi-folder"></i> ${item.textContent} <i class="bi bi-chevron-down"></i>`;
            dropdownMenu.classList.remove('show');
            await loadLicensesForModule(moduleId);
        });
    });
}

async function loadLicensesForModule(moduleId) {
    currentLicenseModuleId = moduleId;
    currentLicensePage = 1;
    currentLicenseFilter = 'all';
    currentLicenseSearch = '';

    try {
        currentModule = await api.modules.getById(moduleId);
        const licenses = await api.modules.getLicenses(moduleId);
        allLicenses = licenses;
        filteredLicenses = [...allLicenses];
        applyFilters();
        renderLicensesPage();
    } catch (err) {
        document.getElementById('licensesContent').innerHTML = `<div class="alert alert-danger">Ошибка: ${err.message}</div>`;
    }
}

function applyFilters() {
    let filtered = [...allLicenses];

    if (currentLicenseFilter !== 'all') {
        filtered = filtered.filter(lic => lic.status === currentLicenseFilter);
    }

    if (currentLicenseSearch && currentLicenseSearch.length >= 3) {
        const searchLower = currentLicenseSearch.toLowerCase();
        filtered = filtered.filter(lic =>
            lic.license_key.toLowerCase().includes(searchLower)
        );
    }

    filteredLicenses = filtered;
}

function renderLicensesPage() {
    const totalPages = Math.ceil(filteredLicenses.length / LICENSES_PER_PAGE);
    const startIndex = (currentLicensePage - 1) * LICENSES_PER_PAGE;
    const endIndex = startIndex + LICENSES_PER_PAGE;
    const pageLicenses = filteredLicenses.slice(startIndex, endIndex);

    const stats = {
        total: allLicenses.length,
        active: allLicenses.filter(l => l.status === 'active').length,
        inactive: allLicenses.filter(l => l.status === 'inactive').length,
        pending: allLicenses.filter(l => l.status === 'pending').length,
        expired: allLicenses.filter(l => l.status === 'expired').length
    };

    let html = `
        <!-- Stats Cards -->
        <div class="license-stats">
            <div class="stat-card">
                <div class="stat-icon"><i class="bi bi-key"></i></div>
                <div class="stat-info"><h3>${stats.total}</h3><p>Всего лицензий</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #27ae60;"><i class="bi bi-check-circle"></i></div>
                <div class="stat-info"><h3>${stats.active}</h3><p>Активных</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #e74c3c;"><i class="bi bi-x-circle"></i></div>
                <div class="stat-info"><h3>${stats.inactive + stats.expired}</h3><p>Неактивных</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #f39c12;"><i class="bi bi-clock"></i></div>
                <div class="stat-info"><h3>${stats.pending}</h3><p>В ожидании</p></div>
            </div>
        </div>
        
        <!-- License Check Card -->
        <div class="license-check-card">
            <h4><i class="bi bi-shield-check"></i> Проверка лицензии</h4>
            <div class="check-form">
                <input type="text" id="checkLicenseKey" placeholder="Введите серийный номер">
                <button id="checkLicenseBtn"><i class="bi bi-search"></i> Проверить</button>
            </div>
            <div id="checkResult" class="check-result"></div>
        </div>
        
        <!-- Add License Form -->
        <div class="add-license-form">
            <h4><i class="bi bi-plus-circle"></i> Добавить новую лицензию</h4>
            <div class="form-row">
                <div class="form-group" style="flex: 2;">
                    <input type="text" id="newLicenseKey" class="form-control" placeholder="Серийный номер">
                </div>
                <div class="form-group" style="flex: 1;">
                    <select id="newLicenseStatus" class="form-control">
                        <option value="active">🟢 Активна</option>
                        <option value="inactive">🔴 Неактивна</option>
                        <option value="pending">🟡 Ожидание</option>
                        <option value="expired">⚫ Просрочена</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <input type="date" id="newLicenseExpires" class="form-control" placeholder="Дата истечения">
                </div>
                <button class="btn btn-primary" id="addLicenseBtn">
                    <i class="bi bi-plus-lg"></i> Добавить
                </button>
            </div>
            <div class="mt-2">
                <small class="text-muted">
                    <i class="bi bi-upload"></i> Массовый импорт: 
                    <input type="file" id="csvFile" accept=".csv,.txt" style="display: inline-block; width: auto;">
                    <button class="btn btn-sm btn-secondary" id="importCsvBtn">Импорт CSV</button>
                </small>
            </div>
        </div>
        
        <!-- Search and Filter -->
        <div class="licenses-search-section">
            <div class="search-box">
                <i class="bi bi-search"></i>
                <input type="text" id="licenseSearch" placeholder="Поиск по серийному номеру (мин. 3 символа)...">
            </div>
            <div class="filter-buttons">
                <button class="filter-btn ${currentLicenseFilter === 'all' ? 'active' : ''}" data-filter="all">
                    Все (${stats.total})
                </button>
                <button class="filter-btn ${currentLicenseFilter === 'active' ? 'active' : ''}" data-filter="active">
                    🟢 Активные (${stats.active})
                </button>
                <button class="filter-btn ${currentLicenseFilter === 'inactive' ? 'active' : ''}" data-filter="inactive">
                    🔴 Неактивные (${stats.inactive})
                </button>
                <button class="filter-btn ${currentLicenseFilter === 'pending' ? 'active' : ''}" data-filter="pending">
                    🟡 Ожидание (${stats.pending})
                </button>
                <button class="filter-btn ${currentLicenseFilter === 'expired' ? 'active' : ''}" data-filter="expired">
                    ⚫ Просроченные (${stats.expired})
                </button>
                ${currentLicenseFilter !== 'all' ? `<button class="filter-btn" id="clearFilterBtn">✖️ Сбросить фильтр</button>` : ''}
            </div>
        </div>
        
        <!-- Licenses Table -->
        <div class="licenses-table-container">
            <table class="licenses-table">
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Серийный номер</th>
                        <th>Статус</th>
                        <th>Дата создания</th>
                        <th>Истекает</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (pageLicenses.length === 0) {
        html += `<tr><td colspan="6" class="text-center p-5"><i class="bi bi-inbox" style="font-size: 48px; color: #ccc;"></i><p class="mt-2">Лицензии не найдены</p></td></tr>`;
    } else {
        pageLicenses.forEach((lic, index) => {
            html += `
                <tr>
                    <td>${startIndex + index + 1}</td>
                    <td><code class="license-key">${escapeHtml(lic.license_key)}</code></td>
                    <td><span class="status-badge status-${lic.status}">${getStatusText(lic.status)}</span></td>
                    <td><small>${new Date(lic.created_at).toLocaleDateString()}</small></td>
                    <td>
                        <input type="date" class="form-control form-control-sm license-expires" 
                               data-id="${lic.id}" value="${lic.expires_at || ''}">
                    </td>
                    <td>
                        <select class="form-select form-select-sm license-status" data-id="${lic.id}">
                            <option value="active" ${lic.status === 'active' ? 'selected' : ''}>Активна</option>
                            <option value="inactive" ${lic.status === 'inactive' ? 'selected' : ''}>Неактивна</option>
                            <option value="pending" ${lic.status === 'pending' ? 'selected' : ''}>Ожидание</option>
                            <option value="expired" ${lic.status === 'expired' ? 'selected' : ''}>Просрочена</option>
                        </select>
                        <button class="action-btn delete" data-id="${lic.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                     </td>
                 </tr>
            `;
        });
    }

    html += `
                </tbody>
             </table>
            <div class="pagination">
                <div class="pagination-info">
                    Показано ${startIndex + 1}-${Math.min(endIndex, filteredLicenses.length)} из ${filteredLicenses.length}
                </div>
                <div class="pagination-buttons">
                    <button class="page-btn" id="prevPageBtn" ${currentLicensePage === 1 ? 'disabled' : ''}>
                        <i class="bi bi-chevron-left"></i> Назад
                    </button>
                    <span>Стр. ${currentLicensePage} из ${totalPages || 1}</span>
                    <button class="page-btn" id="nextPageBtn" ${currentLicensePage === totalPages || totalPages === 0 ? 'disabled' : ''}>
                        Вперед <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('licensesContent').innerHTML = html;
    attachLicenseHandlers();
}

function attachLicenseHandlers() {
    // Поиск с задержкой и минимальной длиной 3 символа
    const searchInput = document.getElementById('licenseSearch');
    if (searchInput) {
        searchInput.value = currentLicenseSearch;
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value;

            // Очищаем предыдущий таймер
            if (searchTimeout) clearTimeout(searchTimeout);

            // Если меньше 3 символов и не пусто - показываем подсказку
            if (value.length > 0 && value.length < 3) {
                showNotification('Введите минимум 3 символа для поиска', 'info');
                return;
            }

            // Ждем 500ms после последнего ввода
            searchTimeout = setTimeout(() => {
                currentLicenseSearch = value;
                currentLicensePage = 1;
                applyFilters();
                renderLicensesPage();
            }, 500);
        });
    }

    // Кнопка сброса фильтра
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            currentLicenseFilter = 'all';
            currentLicenseSearch = '';
            currentLicensePage = 1;
            if (searchInput) searchInput.value = '';
            applyFilters();
            renderLicensesPage();
            showNotification('Фильтр сброшен', 'success');
        });
    }

    // Фильтры
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLicenseFilter = btn.dataset.filter;
            currentLicensePage = 1;
            applyFilters();
            renderLicensesPage();
        });
    });

    // Пагинация
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    prevBtn?.addEventListener('click', () => {
        if (currentLicensePage > 1) {
            currentLicensePage--;
            renderLicensesPage();
        }
    });

    nextBtn?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredLicenses.length / LICENSES_PER_PAGE);
        if (currentLicensePage < totalPages) {
            currentLicensePage++;
            renderLicensesPage();
        }
    });

    // Добавление лицензии вручную
    const addBtn = document.getElementById('addLicenseBtn');
    if (addBtn) {
        addBtn.onclick = async () => {
            const key = document.getElementById('newLicenseKey').value.trim();
            const status = document.getElementById('newLicenseStatus').value;
            const expiresAt = document.getElementById('newLicenseExpires').value;

            if (!key) {
                showNotification('Введите серийный номер', 'error');
                return;
            }

            try {
                await api.licenses.create({
                    module_id: currentLicenseModuleId,
                    license_key: key,
                    status: status,
                    expires_at: expiresAt || null
                });

                showNotification('Лицензия добавлена', 'success');
                document.getElementById('newLicenseKey').value = '';
                document.getElementById('newLicenseExpires').value = '';
                await loadLicensesForModule(currentLicenseModuleId);
            } catch (err) {
                showNotification('Ошибка: ' + err.message, 'error');
            }
        };
    }

    // Изменение статуса
    document.querySelectorAll('.license-status').forEach(select => {
        select.addEventListener('change', async () => {
            try {
                await api.licenses.update(select.dataset.id, { status: select.value });
                showNotification('Статус обновлен', 'success');
                await loadLicensesForModule(currentLicenseModuleId);
            } catch (err) {
                showNotification('Ошибка обновления', 'error');
            }
        });
    });

    // Изменение даты истечения
    document.querySelectorAll('.license-expires').forEach(input => {
        input.addEventListener('change', async () => {
            try {
                await api.licenses.update(input.dataset.id, { expires_at: input.value || null });
                showNotification('Дата обновлена', 'success');
            } catch (err) {
                showNotification('Ошибка обновления', 'error');
            }
        });
    });

    // Удаление лицензии
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const licenseId = btn.dataset.id;
            const confirmed = await showConfirmDialog('Удалить лицензию?', 'Это действие нельзя отменить.');
            if (confirmed) {
                try {
                    await api.licenses.delete(licenseId);
                    showNotification('Лицензия удалена', 'success');
                    await loadLicensesForModule(currentLicenseModuleId);
                } catch (err) {
                    showNotification('Ошибка удаления', 'error');
                }
            }
        });
    });

    // Проверка лицензии
    const checkBtn = document.getElementById('checkLicenseBtn');
    const checkInput = document.getElementById('checkLicenseKey');
    const resultDiv = document.getElementById('checkResult');

    checkBtn?.addEventListener('click', async () => {
        const licenseKey = checkInput.value.trim();
        if (!licenseKey) {
            showNotification('Введите ключ лицензии', 'error');
            return;
        }

        resultDiv.innerHTML = '<div class="text-center"><i class="bi bi-hourglass-split"></i> Проверка...</div>';
        resultDiv.classList.add('show');

        try {
            const data = await api.checkLicense(licenseKey);

            if (data.valid) {
                resultDiv.className = 'check-result show valid';
                resultDiv.innerHTML = `
                    <div class="result-title">
                        <i class="bi bi-check-circle-fill"></i> Лицензия действительна!
                    </div>
                    <div class="result-details">
                        <strong>Модуль:</strong> ${data.module?.module_title || '—'}<br>
                        <strong>Статус:</strong> ${getStatusText(data.status)}<br>
                        ${data.module?.expires_at ? `<strong>Истекает:</strong> ${new Date(data.module.expires_at).toLocaleDateString()}<br>` : ''}
                        <strong>Версия модуля:</strong> ${data.module?.current_version || '—'}
                    </div>
                `;
            } else {
                resultDiv.className = 'check-result show invalid';
                let errorMessage = 'Лицензия недействительна';
                if (data.status === 'expired') errorMessage = 'Срок действия истек';
                if (data.status === 'inactive') errorMessage = 'Лицензия деактивирована';
                if (!data.exists) errorMessage = 'Лицензия не найдена';

                resultDiv.innerHTML = `
                    <div class="result-title">
                        <i class="bi bi-x-circle-fill"></i> ${errorMessage}
                    </div>
                    <div class="result-details">
                        ${data.module ? `<strong>Модуль:</strong> ${data.module.module_title}<br>` : ''}
                        <strong>Статус:</strong> ${data.status || 'not_found'}
                    </div>
                `;
            }
        } catch (err) {
            resultDiv.className = 'check-result show invalid';
            resultDiv.innerHTML = `
                <div class="result-title">
                    <i class="bi bi-exclamation-triangle-fill"></i> Ошибка проверки
                </div>
                <div class="result-details">${err.message}</div>
            `;
        }
    });

    checkInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkBtn?.click();
    });

    // Импорт CSV
    const importBtn = document.getElementById('importCsvBtn');
    const csvFile = document.getElementById('csvFile');

    if (importBtn && csvFile) {
        importBtn.onclick = async () => {
            const file = csvFile.files[0];
            if (!file) {
                showNotification('Выберите файл CSV', 'error');
                return;
            }

            try {
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                const licenses = lines.map(l => l.trim());

                if (licenses.length === 0) {
                    showNotification('Файл пуст', 'error');
                    return;
                }

                await api.licenses.bulkCreate(currentLicenseModuleId, licenses);
                showNotification(`Импортировано ${licenses.length} лицензий`, 'success');
                csvFile.value = '';
                await loadLicensesForModule(currentLicenseModuleId);
            } catch (err) {
                showNotification('Ошибка импорта: ' + err.message, 'error');
            }
        };
    }
}

function setActiveMenu(activeId) {
    ['menuModules', 'menuLicenses', 'menuNews'].forEach(id => {
        document.getElementById(id)?.classList[id === activeId ? 'add' : 'remove']('active');
    });
}