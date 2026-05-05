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
            attributes: ['id', 'title', 'description', 'preview_image', 'file_url', 'current_version', 'created_at', 'updated_at'],
            include: [
                {
                    model: db.ModuleGallery,
                    as: 'ModuleGalleries', // если ассоциация имеет алиас
                    attributes: ['id', 'image_url', 'sort_order'],
                    separate: true,
                    order: [['sort_order', 'ASC']]
                }
            ],
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

        if (licenseRecord.expires_at && new Date(licenseRecord.expires_at) < new Date()) {
            return res.status(403).json({ error: 'Лицензия истекла' });
        }

        const module = await db.Module.findByPk(moduleId);
        if (!module) {
            return res.status(404).json({ error: 'Модуль не найден' });
        }

        const fileUrl = module.file_url;

        if (!fileUrl) {
            return res.status(404).json({ error: 'URL файла не указан' });
        }

        if (fileUrl.startsWith('/uploads/')) {
            const filename = path.basename(fileUrl);
            const filePath = path.join(__dirname, '../../uploads', filename);

            if (fs.existsSync(filePath)) {
                const ext = path.extname(filename);
                const downloadName = `${module.title}_v${module.current_version}${ext}`;
                const safeFileName = downloadName.replace(/[^a-zA-Z0-9._-]/g, '_');

                // Используем res.download с явным указанием имени файла
                res.download(filePath, safeFileName, (err) => {
                    if (err) {
                        console.error('Download error:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Ошибка при скачивании' });
                        }
                    }
                });
            } else {
                res.status(404).json({ error: 'Файл не найден' });
            }
        } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            res.redirect(fileUrl);
        } else {
            res.status(404).json({ error: 'Некорректный URL' });
        }

    } catch (err) {
        next(err);
    }
};
// Проверка существования лицензии (без проверки версии)
const checkLicenseExists = async (req, res, next) => {
    try {
        const { license } = req.query; // или req.params / req.body

        if (!license) {
            return res.status(400).json({ error: 'Требуется параметр license' });
        }

        // Ищем лицензию в таблице Licenses
        const licenseRecord = await db.License.findOne({
            where: {
                license_key: license,
                is_active: true  // только активные лицензии
            }
        });

        // Проверяем срок действия
        let isValid = false;
        if (licenseRecord) {
            const now = new Date();
            const isNotExpired = !licenseRecord.expires_at || new Date(licenseRecord.expires_at) >= now;
            isValid = isNotExpired;
        }

        res.json({
            exists: isValid,
            license: license,
            valid: isValid
        });

    } catch (err) {
        next(err);
    }
};

// Проверка существования лицензии (включая неактивные и просроченные)
const checkLicenseExistsAny = async (req, res, next) => {
    try {
        const { license } = req.query;

        if (!license) {
            return res.status(400).json({ error: 'Требуется параметр license' });
        }

        // Ищем лицензию в таблице Licenses (даже неактивные)
        const licenseRecord = await db.License.findOne({
            where: { license_key: license },
            include: [{ model: db.Module, attributes: ['title', 'current_version'] }]
        });

        let status = 'not_found';
        let moduleInfo = null;

        if (licenseRecord) {
            const now = new Date();
            const isExpired = licenseRecord.expires_at && new Date(licenseRecord.expires_at) < now;

            if (!licenseRecord.is_active) {
                status = 'inactive';
            } else if (isExpired) {
                status = 'expired';
            } else {
                status = 'active';
            }

            moduleInfo = {
                module_id: licenseRecord.module_id,
                module_title: licenseRecord.Module?.title,
                current_version: licenseRecord.Module?.current_version,
                expires_at: licenseRecord.expires_at,
                status: licenseRecord.status
            };
        }

        res.json({
            exists: !!licenseRecord,
            valid: status === 'active',
            status: status,
            license: license,
            module: moduleInfo
        });

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
    downloadModule,
    checkLicenseExistsAny,
    checkLicenseExists,
};