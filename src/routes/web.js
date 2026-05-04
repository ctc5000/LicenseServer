const express = require('express');
const router = express.Router();
const path = require('path');

// Страница логина
router.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Админ-панель
router.get('/admin', (req, res) => {
    res.render('admin');
});

// Корень - редирект на админку
router.get('/', (req, res) => {
    res.redirect('/admin');
});

module.exports = router;