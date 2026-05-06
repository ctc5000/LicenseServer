const db = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Auth
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const admin = await db.Admin.findOne({ where: { username } });
        if (!admin) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ token, user: { id: admin.id, username: admin.username } });
    } catch (err) {
        next(err);
    }
};

// Modules CRUD
const getModules = async (req, res, next) => {
    try {
        const modules = await db.Module.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json(modules);
    } catch (err) {
        next(err);
    }
};

const createModule = async (req, res, next) => {
    try {
        const createData = { ...req.body };

        // Если file_url относительный - преобразуем
        if (createData.file_url && createData.file_url.startsWith('/uploads/')) {
            createData.file_url = `${req.protocol}://${req.get('host')}${createData.file_url}`;
        }

        // Если preview_image относительный - преобразуем
        if (createData.preview_image && createData.preview_image.startsWith('/uploads/')) {
            createData.preview_image = `${req.protocol}://${req.get('host')}${createData.preview_image}`;
        }

        const module = await db.Module.create(createData);
        res.status(201).json(module);
    } catch (err) {
        next(err);
    }
};

const updateModule = async (req, res, next) => {
    try {
        const module = await db.Module.findByPk(req.params.id);
        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        const updateData = { ...req.body };

        // Если file_url относительный - преобразуем
        if (updateData.file_url && updateData.file_url.startsWith('/uploads/')) {
            updateData.file_url = `${req.protocol}://${req.get('host')}${updateData.file_url}`;
        }

        // Если preview_image относительный - преобразуем
        if (updateData.preview_image && updateData.preview_image.startsWith('/uploads/')) {
            updateData.preview_image = `${req.protocol}://${req.get('host')}${updateData.preview_image}`;
        }

        await module.update(updateData);
        res.json(module);
    } catch (err) {
        next(err);
    }
};

const deleteModule = async (req, res, next) => {
    try {
        const module = await db.Module.findByPk(req.params.id);
        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        await module.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// Versions
const getVersions = async (req, res, next) => {
    try {
        const versions = await db.ModuleVersion.findAll({
            where: { module_id: req.params.id },
            order: [['created_at', 'DESC']]
        });
        res.json(versions);
    } catch (err) {
        next(err);
    }
};

const createVersion = async (req, res, next) => {
    try {
        const { version, file_url, changelog } = req.body;
        const moduleId = req.params.id;

        const versionRecord = await db.ModuleVersion.create({
            module_id: moduleId,
            version,
            file_url,
            changelog
        });

        // Обновляем текущую версию модуля (версия считается новее, если отличается)
        const module = await db.Module.findByPk(moduleId);
        if (module.current_version !== version) {
            await module.update({ current_version: version });
        }

        res.status(201).json(versionRecord);
    } catch (err) {
        next(err);
    }
};

const deleteVersion = async (req, res, next) => {
    try {
        const version = await db.ModuleVersion.findByPk(req.params.id);
        if (!version) {
            return res.status(404).json({ error: 'Версия не найдена' });
        }

        await version.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// Licenses
const getLicenses = async (req, res, next) => {
    try {
        const licenses = await db.License.findAll({
            where: { module_id: req.params.id },
            order: [['created_at', 'DESC']]
        });
        res.json(licenses);
    } catch (err) {
        next(err);
    }
};

const createLicense = async (req, res, next) => {
    try {
        const { module_id, license_key, status, expires_at, is_active } = req.body;

        const license = await db.License.create({
            module_id,
            license_key,
            status: status || 'active',
            is_active: is_active !== undefined ? is_active : true,
            expires_at: expires_at || null
        });

        res.status(201).json(license);
    } catch (err) {
        next(err);
    }
};

const updateLicense = async (req, res, next) => {
    try {
        const license = await db.License.findByPk(req.params.id);
        if (!license) {
            return res.status(404).json({ error: 'Лицензия не найдена' });
        }

        await license.update(req.body);
        res.json(license);
    } catch (err) {
        next(err);
    }
};

async function deleteLicense(licenseId) {
    const confirmed = await showConfirmDialog('Удалить лицензию?', 'Это действие нельзя отменить.');
    if (!confirmed) return;

    try {
        await fetch(`${API_URL}/api/admin/licenses/${licenseId}`, { method: 'DELETE', headers });
        showNotification('Лицензия удалена', 'success');

        // Перезагружаем текущую страницу
        if (currentLicenseModuleId) {
            const moduleRes = await fetch(`${API_URL}/api/admin/modules/${currentLicenseModuleId}`, { headers });
            const module = await moduleRes.json();
            await loadLicensesForModule(currentLicenseModuleId, module.title);
        }
    } catch (err) {
        showNotification('Ошибка удаления', 'error');
    }
}

const bulkCreateLicenses = async (req, res, next) => {
    try {
        const { module_id, licenses } = req.body;

        if (!Array.isArray(licenses) || licenses.length === 0) {
            return res.status(400).json({ error: 'Массив лицензий обязателен' });
        }

        const licenseRecords = licenses.map(key => ({
            module_id,
            license_key: key.trim(),
            status: 'active',
            is_active: true
        }));

        const created = await db.License.bulkCreate(licenseRecords, {
            ignoreDuplicates: true
        });

        res.status(201).json({ count: created.length });
    } catch (err) {
        next(err);
    }
};

// Gallery
const getGallery = async (req, res, next) => {
    try {
        const gallery = await db.ModuleGallery.findAll({
            where: { module_id: req.params.id },
            order: [['sort_order', 'ASC']]
        });
        res.json(gallery);
    } catch (err) {
        next(err);
    }
};

const addGalleryImage = async (req, res, next) => {
    try {
        const { image_url, sort_order = 0 } = req.body;
        const image = await db.ModuleGallery.create({
            module_id: req.params.id,
            image_url,
            sort_order
        });
        res.status(201).json(image);
    } catch (err) {
        next(err);
    }
};

const updateGallerySort = async (req, res, next) => {
    try {
        const { sort_order } = req.body;
        const image = await db.ModuleGallery.findByPk(req.params.id);

        if (!image) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }

        await image.update({ sort_order });
        res.json(image);
    } catch (err) {
        next(err);
    }
};

const deleteGalleryImage = async (req, res, next) => {
    try {
        const image = await db.ModuleGallery.findByPk(req.params.id);
        if (!image) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }

        await image.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// News
const getNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findAll({
            where: { module_id: req.params.id },
            order: [['published_at', 'DESC']]
        });
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const createNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.create({
            module_id: req.params.id,
            ...req.body
        });
        res.status(201).json(news);
    } catch (err) {
        next(err);
    }
};

const updateNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findByPk(req.params.id);
        if (!news) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }

        await news.update(req.body);
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const deleteNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findByPk(req.params.id);
        if (!news) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }

        await news.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};
const getModuleById = async (req, res, next) => {
    try {
        const module = await db.Module.findByPk(req.params.id);

        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        res.json(module);
    } catch (err) {
        next(err);
    }
};

// Глобальные новости
const getAllNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findAll({
            order: [['published_at', 'DESC']]
        });
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const getNewsById = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findByPk(req.params.id);
        if (!news) return res.status(404).json({ error: 'Новость не найдена' });
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const createGlobalNews = async (req, res, next) => {
    try {
        const { title, content, image_url, published_at, module_id } = req.body;

        const news = await db.ModuleNews.create({
            module_id: module_id || null,
            title,
            content,
            image_url: image_url || null,
            published_at: published_at || new Date()
        });
        res.status(201).json(news);
    } catch (err) {
        next(err);
    }
};

const updateGlobalNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findByPk(req.params.id);
        if (!news) return res.status(404).json({ error: 'Новость не найдена' });

        const { title, content, image_url, published_at, module_id } = req.body;

        await news.update({
            title: title !== undefined ? title : news.title,
            content: content !== undefined ? content : news.content,
            image_url: image_url !== undefined ? image_url : news.image_url,
            published_at: published_at || news.published_at,
            module_id: module_id !== undefined ? (module_id || null) : news.module_id
        });
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const deleteGlobalNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findByPk(req.params.id);
        if (!news) return res.status(404).json({ error: 'Новость не найдена' });
        await news.destroy();
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    getModules,
    createModule,
    updateModule,
    deleteModule,
    getVersions,
    createVersion,
    deleteVersion,
    getLicenses,
    createLicense,
    updateLicense,
    deleteLicense,
    bulkCreateLicenses,
    getGallery,
    addGalleryImage,
    updateGallerySort,
    deleteGalleryImage,
    getNews,
    createNews,
    updateNews,
    deleteNews,
    getModuleById,
    deleteGlobalNews,
    updateGlobalNews,
    createGlobalNews,
    getNewsById,
    getAllNews,
};