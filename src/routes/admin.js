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
router.get('/modules/:id', adminController.getModuleById);
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

// Новости (для модуля)
router.get('/modules/:id/news', adminController.getNews);
router.post('/modules/:id/news', validateNews, adminController.createNews);
router.put('/news/:id', validateNews, adminController.updateNews);
router.delete('/news/:id', adminController.deleteNews);

// Новости (глобальные)
router.get('/news', adminController.getAllNews);
router.get('/news/:id', adminController.getNewsById);
router.post('/news', validateNews, adminController.createGlobalNews);
router.put('/news/:id', validateNews, adminController.updateGlobalNews);
router.delete('/news/:id', adminController.deleteGlobalNews);

// ============ НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ ============
const uploadDir = path.join(process.cwd(), 'uploads');

// Создаем папку если нет
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Uploads directory created:', uploadDir);
}

// Общая настройка storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});

// Фильтр только для изображений
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp, bmp, svg)'));
};

// Без фильтра - для любых файлов
const noFilter = (req, file, cb) => {
    cb(null, true);
};

// Настройка загрузки с разными лимитами
const uploadImage = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB для картинок
    fileFilter: imageFilter
});

const uploadAnyFile = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB для файлов
    fileFilter: noFilter
});

// Эндпоинты для загрузки
router.post('/upload/image', authenticateJWT, requireAdmin, uploadImage.single('file'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('✅ Image uploaded:', fileUrl);
    res.json({ url: fileUrl });
});

router.post('/upload/file', authenticateJWT, requireAdmin, uploadAnyFile.single('file'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('✅ File uploaded:', fileUrl);
    res.json({ url: fileUrl });
});

// Универсальный эндпоинт
router.post('/upload', authenticateJWT, requireAdmin, uploadAnyFile.single('file'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Маршрут для скачивания/просмотра файлов
router.get('/uploads/:filename', (req, res) => {
    const filepath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filepath)) {
        const ext = path.extname(req.params.filename).toLowerCase();
        const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        if (imageExt.includes(ext)) {
            res.sendFile(filepath);
        } else {
            res.download(filepath);
        }
    } else {
        res.status(404).json({ error: 'File not found', path: filepath });
    }
});

module.exports = router;