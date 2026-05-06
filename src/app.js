require('dotenv').config();

// Проверка обязательных переменных окружения
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is required');
    process.exit(1);
}

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

// Определяем окружение
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Создаем папку uploads если её нет
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

// Настройки Helmet
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
    })
);

app.use(cors());
app.use(express.json({ limit: '3000mb' }));
app.use(express.urlencoded({ extended: true, limit: '3000mb' }));

// ============ СТАТИЧЕСКИЕ ФАЙЛЫ ============
// Папка uploads всегда доступна
app.use('/uploads', express.static(uploadsDir));

// В продакшене используем минифицированные файлы из dist
if (isProduction) {
    const distDir = path.join(__dirname, '../dist');
    if (fs.existsSync(distDir)) {
        // Раздача минифицированных файлов
        app.use('/css', express.static(path.join(distDir, 'css')));
        app.use('/js', express.static(path.join(distDir, 'js')));
        app.use(express.static(distDir));
        console.log('📦 Production mode: serving minified files from dist');
    } else {
        console.warn('⚠️ dist directory not found, run `npm run build` first');
        // Fallback на public если dist нет
        app.use(express.static(path.join(__dirname, '../public')));
    }
}

// В разработке используем исходники из public
if (isDevelopment) {
    app.use('/css', express.static(path.join(__dirname, '../public/css')));
    app.use('/js', express.static(path.join(__dirname, '../public/js')));
    app.use(express.static(path.join(__dirname, '../public')));
    console.log('🛠️ Development mode: serving source files from public');
}

// Если окружение не определено, используем public
if (!isProduction && !isDevelopment) {
    app.use(express.static(path.join(__dirname, '../public')));
}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Передаем переменные окружения во все шаблоны
app.use((req, res, next) => {
    res.locals.isProduction = isProduction;
    res.locals.isDevelopment = isDevelopment;
    res.locals.nodeEnv = process.env.NODE_ENV || 'development';
    res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
    next();
});

// Rate limiting
app.use('/api', apiLimiter);

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', webRoutes);

// Health check с проверкой БД
app.get('/health', async (req, res) => {
    try {
        await db.sequelize.authenticate();
        res.json({
            status: 'ok',
            database: 'connected',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    }
});

// Error handler
app.use(errorHandler);

// Sync database and start server
const startServer = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Database connected successfully');

        if (isDevelopment) {
            await db.sequelize.sync();
            console.log('📦 Database synced');
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
            console.log(`🔐 Admin panel: http://localhost:${PORT}/admin`);
            console.log(`📁 Uploads directory: ${uploadsDir}`);

            if (isProduction) {
                console.log(`📦 Minified assets: http://localhost:${PORT}/css/admin.min.css`);
                console.log(`📦 Minified JS: http://localhost:${PORT}/js/main.min.js`);
            } else {
                console.log(`🛠️ Source CSS: http://localhost:${PORT}/css/admin.css`);
                console.log(`🛠️ Source JS: http://localhost:${PORT}/js/main.js`);
            }
            console.log('');
        });
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;