const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { validateLicenseCheck } = require('../middleware/validation');
const { licenseCheckLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /api/license/check:
 *   post:
 *     summary: Проверка лицензии и версии модуля
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license
 *               - version
 *             properties:
 *               license:
 *                 type: string
 *                 example: "LIC-010-JKLM-NOPQ-0123"
 *               version:
 *                 type: string
 *                 example: "v1.0.0"
 *     responses:
 *       200:
 *         description: Успешная проверка
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scope:
 *                   type: boolean
 *                   example: true
 *                 license:
 *                   type: boolean
 *                   example: true
 *                 version:
 *                   type: string
 *                   example: "v1.0.0"
 *                 needUpdate:
 *                   type: boolean
 *                   example: false
 */
router.post('/license/check', licenseCheckLimiter, validateLicenseCheck, publicController.checkLicense);

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Получить список всех модулей
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Список модулей
 */
router.get('/modules', publicController.getModules);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Получить модуль по ID
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные модуля
 *       404:
 *         description: Модуль не найден
 */
router.get('/modules/:id', publicController.getModuleById);

/**
 * @swagger
 * /api/modules/{id}/versions:
 *   get:
 *     summary: История версий модуля
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список версий
 */
router.get('/modules/:id/versions', publicController.getModuleVersions);

/**
 * @swagger
 * /api/modules/{id}/gallery:
 *   get:
 *     summary: Галерея изображений модуля
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список изображений
 */
router.get('/modules/:id/gallery', publicController.getModuleGallery);

/**
 * @swagger
 * /api/modules/{id}/news:
 *   get:
 *     summary: Новости модуля
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Список новостей
 */
router.get('/modules/:id/news', publicController.getModuleNews);

/**
 * @swagger
 * /api/modules/{id}/download:
 *   get:
 *     summary: Скачать файл модуля (требуется лицензия)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: license
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ссылка на скачивание
 *       403:
 *         description: Недействительная лицензия
 */
router.get('/modules/:id/download', publicController.downloadModule);
/**
 * @swagger
 * /api/license/check-exists:
 *   get:
 *     summary: Проверка существования лицензии (только активные)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: license
 *         required: true
 *         schema:
 *           type: string
 *         description: Серийный номер лицензии
 *     responses:
 *       200:
 *         description: Результат проверки
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 license:
 *                   type: string
 */
router.get('/license/check-exists', publicController.checkLicenseExists);

/**
 * @swagger
 * /api/license/check-exists-any:
 *   get:
 *     summary: Проверка существования лицензии (включая неактивные)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: license
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Детальная информация о лицензии
 */
router.get('/license/check-exists-any', publicController.checkLicenseExistsAny);

/**
 * @swagger
 * /api/license/check-exists-any:
 *   post:
 *     summary: Проверка существования лицензии (включая неактивные)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: license
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Детальная информация о лицензии
 */
router.post('/license/check-exists', publicController.checkLicenseExists);


module.exports = router;