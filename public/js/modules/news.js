// modules/news.js
import { api, uploadImage } from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';
import { showNotification } from '../components/notifications.js';

export async function showNewsList() {
    setActiveMenu('menuNews');

    const [modules, newsList] = await Promise.all([api.modules.getAll(), api.news.getAll()]);

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
            imageUrl = `${window.location.origin}${imageUrl}`;
        }

        const imageHtml = imageUrl
            ? `<img src="${imageUrl}" class="card-img-top" onerror="this.style.display='none'">`
            : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center"><i class="bi bi-image" style="font-size: 48px; color: #ccc;"></i></div>`;

        html += `
            <div class="card">
                ${imageHtml}
                <div class="card-body">
                    <div class="mb-2"><span class="badge badge-secondary">${moduleName}</span></div>
                    <h5 class="card-title">${escapeHtml(news.title)}</h5>
                    <p class="card-text"><small>${new Date(news.published_at).toLocaleDateString()}</small></p>
                    <p class="card-text">${escapeHtml(news.content.substring(0, 100))}${news.content.length > 100 ? '...' : ''}</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-warning edit-news-btn" data-id="${news.id}">Редактировать</button>
                        <button class="btn btn-sm btn-danger delete-news-btn" data-id="${news.id}">Удалить</button>
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
                await api.news.delete(btn.dataset.id);
                showNewsList();
            }
        });
    });
}

export async function showNewsModal(id = null) {
    const modal = document.getElementById('newsModal');
    const modalTitle = document.getElementById('newsModalTitle');

    if (!modal) return;

    const modules = await api.modules.getAll();
    const select = document.getElementById('newsModuleId');
    if (select) {
        select.innerHTML = '<option value="">-- Все модули --</option>' + modules.map(m => `<option value="${m.id}">${escapeHtml(m.title)}</option>`).join('');
    }

    if (id) {
        modalTitle.textContent = '✏️ Редактирование новости';
        const news = await api.news.getById(id);

        document.getElementById('newsId').value = news.id;
        document.getElementById('newsTitle').value = news.title;
        document.getElementById('newsContent').value = news.content;
        document.getElementById('newsModuleId').value = news.module_id || '';

        if (news.image_url) {
            const imgUrl = news.image_url.startsWith('http') ? news.image_url : `${window.location.origin}${news.image_url}`;
            document.getElementById('newsPreviewContainer').innerHTML = `<img src="${imgUrl}" class="preview-image">`;
        } else {
            document.getElementById('newsPreviewContainer').innerHTML = '<div class="preview-placeholder"><i class="bi bi-image"></i><p>Нет изображения</p></div>';
        }
    } else {
        modalTitle.textContent = '➕ Добавить новость';
        document.getElementById('newsForm').reset();
        document.getElementById('newsId').value = '';
        document.getElementById('newsPreviewContainer').innerHTML = '<div class="preview-placeholder"><i class="bi bi-image"></i><p>Нет изображения</p></div>';
    }

    modal.classList.add('show');
    modal.style.display = 'flex';

    setTimeout(() => initNewsImageInput(), 100);
}

export async function saveNews() {
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
            imageUrl = await uploadImage(imageFile);
        } else {
            const existingImg = document.getElementById('newsPreviewContainer')?.querySelector('img');
            if (existingImg && existingImg.src) {
                imageUrl = existingImg.src;
            }
        }

        const data = { title, content, image_url: imageUrl, module_id: moduleId || null };

        if (id) {
            await api.news.update(id, data);
        } else {
            await api.news.create(data);
        }

        closeNewsModal();
        showNewsList();
    } catch (err) {
        console.error(err);
        alert('Ошибка: ' + err.message);
    }
}

export function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

export function removeNewsImage() {
    document.getElementById('newsPreviewContainer').innerHTML = '<div class="preview-placeholder"><i class="bi bi-image"></i><p>Нет изображения</p></div>';
    document.getElementById('newsImageFile').value = '';
}

function initNewsImageInput() {
    const newsImageInput = document.getElementById('newsImageFile');
    if (!newsImageInput) return;

    const newInput = newsImageInput.cloneNode(true);
    newsImageInput.parentNode.replaceChild(newInput, newsImageInput);

    newInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('newsPreviewContainer').innerHTML = `<img src="${event.target.result}" class="preview-image">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

function setActiveMenu(activeId) {
    ['menuModules', 'menuLicenses', 'menuNews'].forEach(id => {
        document.getElementById(id)?.classList[id === activeId ? 'add' : 'remove']('active');
    });
}