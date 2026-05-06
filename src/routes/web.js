const express = require('express');
const router = express.Router();
const path = require('path');

// Страница логина
router.get('/admin/login', (req, res) => {
    // Для логина используем обычный HTML файл
    const isProduction = process.env.NODE_ENV === 'production';
    const publicDir = isProduction
        ? path.join(__dirname, '../../dist')
        : path.join(__dirname, '../../public');

    res.sendFile(path.join(publicDir, 'login.html'));
});

// Админ-панель
router.get('/admin', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.render('admin', {
        isProduction: isProduction,
        isDevelopment: isDevelopment,
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});

// Корень - редирект на админку
router.get('/', (req, res) => {
    res.redirect('/admin');
});

module.exports = router;