const express = require('express');
const router = express.Router();
const path = require('path');

// Страница логина
router.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Админ-панель
router.get('/admin', (req, res) => {
    // Передаем переменные окружения в шаблон
    res.render('admin', {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});

// Корень - редирект на админку
router.get('/', (req, res) => {
    res.redirect('/admin');
});

module.exports = router;