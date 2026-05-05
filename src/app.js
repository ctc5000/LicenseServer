require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const db = require('./models');
const specs = require('./utils/swagger');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const webRoutes = require('./routes/web');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем папку uploads если её нет
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

app.use(cors());
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: true, limit: '5000mb' }));

// Статика - ПРАВИЛЬНЫЙ ПУТЬ к uploads

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Rate limiting
app.use('/api', apiLimiter);

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', webRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);
app.use(express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        // Для файлов в uploads - принудительное скачивание
        res.setHeader('Content-Disposition', 'attachment');
    }
}));
// Sync database and start server
const startServer = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Database connected successfully');

        if (process.env.NODE_ENV === 'development') {
            await db.sequelize.sync();
            console.log('📦 Database synced');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
            console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
            console.log(`👤 Admin login: admin / admin123`);
            console.log(`📁 Uploads directory: ${uploadsDir}`);
            console.log(`📁 Static URL: http://localhost:${PORT}/uploads/`);
        });
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;