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
 *                 example: "DEMO-PREMIUM-12345-ABCDE"
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

module.exports = router;