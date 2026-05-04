const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const {
    validateModule,
    validateLicense,
    validateVersion,
    validateNews
} = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Логин НЕ требует авторизации
router.post('/login', adminController.login);

// Все остальные маршруты требуют JWT
router.use(authenticateJWT, requireAdmin);

// Модули
router.get('/modules', adminController.getModules);
router.get('/modules/:id', adminController.getModuleById);  // ✅ ДОБАВИТЬ ЭТУ СТРОКУ
router.post('/modules', validateModule, adminController.createModule);
router.put('/modules/:id', validateModule, adminController.updateModule);
router.delete('/modules/:id', adminController.deleteModule);

// Версии
router.get('/modules/:id/versions', adminController.getVersions);
router.post('/modules/:id/versions', validateVersion, adminController.createVersion);
router.delete('/versions/:id', adminController.deleteVersion);

// Лицензии
router.get('/modules/:id/licenses', adminController.getLicenses);
router.post('/licenses', validateLicense, adminController.createLicense);
router.put('/licenses/:id', adminController.updateLicense);
router.delete('/licenses/:id', adminController.deleteLicense);
router.post('/licenses/bulk', adminController.bulkCreateLicenses);

// Галерея
router.get('/modules/:id/gallery', adminController.getGallery);
router.post('/modules/:id/gallery', adminController.addGalleryImage);
router.put('/gallery/:id', adminController.updateGallerySort);
router.delete('/gallery/:id', adminController.deleteGalleryImage);

// Новости
router.get('/modules/:id/news', adminController.getNews);
router.post('/modules/:id/news', validateNews, adminController.createNews);
router.put('/news/:id', validateNews, adminController.updateNews);
router.delete('/news/:id', adminController.deleteNews);
// Новости (глобальные, без привязки к модулю)
router.get('/news', adminController.getAllNews);
router.get('/news/:id', adminController.getNewsById);
router.post('/news', validateNews, adminController.createGlobalNews);
router.put('/news/:id', validateNews, adminController.updateGlobalNews);
router.delete('/news/:id', adminController.deleteGlobalNews);


// Настройка загрузки файлов
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/upload/image', authenticateJWT, requireAdmin, upload.single('file'), (req, res) => {
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

router.post('/upload/file', authenticateJWT, requireAdmin, upload.single('file'), (req, res) => {
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Раздача статики для uploads
router.use('/uploads', express.static(uploadDir))

module.exports = router;