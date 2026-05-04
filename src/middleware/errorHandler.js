const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Ошибки Sequelize
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Запись с таким значением уже существует' });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Связанная запись не найдена' });
    }

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
    }

    // Multer ошибки
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой' });
    }

    // Остальные ошибки
    const status = err.status || 500;
    const message = err.message || 'Внутренняя ошибка сервера';

    res.status(status).json({ error: message });
};

module.exports = errorHandler;