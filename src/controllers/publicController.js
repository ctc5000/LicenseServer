const db = require('../models');
const { Op } = require('sequelize');

const checkLicense = async (req, res, next) => {
    try {
        const { license, version } = req.body;

        // Шаг 1: Поиск лицензии
        const licenseRecord = await db.License.findOne({
            where: { license_key: license },
            include: [{ model: db.Module }]
        });

        // Шаг 2: Лицензия не найдена
        if (!licenseRecord) {
            return res.json({
                scope: false,
                license: false,
                version:null,
                needUpdate: false
            });
        }

        // Шаг 3: Проверка активности и срока действия
        const now = new Date();
        const isActive = licenseRecord.is_active === true;
        const isNotExpired = !licenseRecord.expires_at || new Date(licenseRecord.expires_at) >= now;

        if (!isActive || !isNotExpired) {
            return res.json({
                scope: false,
                license: false,
                version: null,
                needUpdate: false
            });
        }

        // Шаг 4: Проверка версии
        const module = licenseRecord.Module;
        const isVersionMatch = module.current_version === version;

        // Шаг 5: Формирование ответа
        return res.json({
            scope: isVersionMatch,
            license: true,
            version: module.current_version,
            needUpdate: version==null?false: !isVersionMatch
        });

    } catch (err) {
        next(err);
    }
};

const getModules = async (req, res, next) => {
    try {
        const modules = await db.Module.findAll({
            attributes: ['id', 'title', 'description', 'preview_image', 'current_version'],
            order: [['created_at', 'DESC']]
        });
        res.json(modules);
    } catch (err) {
        next(err);
    }
};

const getModuleById = async (req, res, next) => {
    try {
        const module = await db.Module.findByPk(req.params.id, {
            attributes: ['id', 'title', 'description', 'preview_image', 'current_version']
        });

        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        res.json(module);
    } catch (err) {
        next(err);
    }
};

const getModuleVersions = async (req, res, next) => {
    try {
        const versions = await db.ModuleVersion.findAll({
            where: { module_id: req.params.id },
            attributes: ['id', 'version', 'file_url', 'changelog', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        res.json(versions);
    } catch (err) {
        next(err);
    }
};

const getModuleGallery = async (req, res, next) => {
    try {
        const gallery = await db.ModuleGallery.findAll({
            where: { module_id: req.params.id },
            attributes: ['id', 'image_url', 'sort_order'],
            order: [['sort_order', 'ASC']]
        });
        res.json(gallery);
    } catch (err) {
        next(err);
    }
};

const getModuleNews = async (req, res, next) => {
    try {
        const news = await db.ModuleNews.findAll({
            where: { module_id: req.params.id },
            attributes: ['id', 'title', 'content', 'published_at'],
            order: [['published_at', 'DESC']]
        });
        res.json(news);
    } catch (err) {
        next(err);
    }
};

const downloadModule = async (req, res, next) => {
    try {
        const { license } = req.query;
        const moduleId = req.params.id;

        if (!license) {
            return res.status(400).json({ error: 'Требуется лицензия' });
        }

        // Проверка лицензии
        const licenseRecord = await db.License.findOne({
            where: {
                license_key: license,
                module_id: moduleId,
                is_active: true
            }
        });

        if (!licenseRecord) {
            return res.status(403).json({ error: 'Недействительная лицензия' });
        }

        // Проверка срока действия
        if (licenseRecord.expires_at && new Date(licenseRecord.expires_at) < new Date()) {
            return res.status(403).json({ error: 'Лицензия истекла' });
        }

        const module = await db.Module.findByPk(moduleId);
        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        // Редирект на URL файла
        res.json({ download_url: module.file_url });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    checkLicense,
    getModules,
    getModuleById,
    getModuleVersions,
    getModuleGallery,
    getModuleNews,
    downloadModule
};