// build.js
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

console.log('\n🔨 Starting build process...\n');

// Пути
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');
const distCSSDir = path.join(distDir, 'css');
const distJSDir = path.join(distDir, 'js');

// Создаем папки dist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(distCSSDir)) {
    fs.mkdirSync(distCSSDir, { recursive: true });
}
if (!fs.existsSync(distJSDir)) {
    fs.mkdirSync(distJSDir, { recursive: true });
}

// Функция для минификации CSS
function minifyCSS() {
    const cssPath = path.join(publicDir, 'css', 'admin.css');

    if (!fs.existsSync(cssPath)) {
        console.error('❌ admin.css not found!');
        return false;
    }

    let css = fs.readFileSync(cssPath, 'utf8');

    // Простая минификация CSS
    css = css
        .replace(/\/\*[\s\S]*?\*\//g, '')      // Удаляем комментарии
        .replace(/\s+/g, ' ')                   // Заменяем множественные пробелы
        .replace(/:\s+/g, ':')                  // Убираем пробелы после :
        .replace(/;\s+/g, ';')                  // Убираем пробелы после ;
        .replace(/,\s+/g, ',')                  // Убираем пробелы после ,
        .replace(/\s*{\s*/g, '{')               // Убираем пробелы вокруг {
        .replace(/\s*}\s*/g, '}')               // Убираем пробелы вокруг }
        .replace(/\s*;\s*/g, ';')               // Убираем пробелы вокруг ;
        .replace(/;}/g, '}')                    // Убираем последнюю ;
        .replace(/\s*:\s*/g, ':')               // Убираем пробелы вокруг :
        .replace(/  +/g, ' ')                   // Убираем лишние пробелы
        .trim();

    const outputPath = path.join(distCSSDir, 'admin.min.css');
    fs.writeFileSync(outputPath, css);

    const originalSize = (fs.statSync(cssPath).size / 1024).toFixed(2);
    const minifiedSize = (css.length / 1024).toFixed(2);

    console.log(`✅ CSS minified: ${originalSize} KB → ${minifiedSize} KB`);
    return true;
}

// Функция для сборки JS с esbuild
async function buildJS() {
    const mainJsPath = path.join(publicDir, 'js', 'main.js');

    if (!fs.existsSync(mainJsPath)) {
        console.error('❌ main.js not found!');
        return false;
    }

    const originalSize = (fs.statSync(mainJsPath).size / 1024).toFixed(2);

    try {
        await esbuild.build({
            entryPoints: [mainJsPath],
            bundle: true,
            minify: true,
            sourcemap: false,
            target: ['es2020'],
            outfile: path.join(distJSDir, 'main.min.js'),
            format: 'esm',
            platform: 'browser',
            treeShaking: true,
            drop: ['console', 'debugger'],
            define: {
                'process.env.NODE_ENV': '"production"'
            },
            loader: {
                '.js': 'jsx'
            }
        });

        const minifiedSize = (fs.statSync(path.join(distJSDir, 'main.min.js')).size / 1024).toFixed(2);
        console.log(`✅ JS minified: ${originalSize} KB → ${minifiedSize} KB`);
        return true;
    } catch (error) {
        console.error('❌ JS build failed:', error);
        return false;
    }
}

// Копирование статических файлов
function copyStaticFiles() {
    // Копируем login.html
    const loginSrc = path.join(publicDir, 'login.html');
    const loginDest = path.join(distDir, 'login.html');

    if (fs.existsSync(loginSrc)) {
        // Минифицируем HTML
        let html = fs.readFileSync(loginSrc, 'utf8');
        html = html
            .replace(/<!--[\s\S]*?-->/g, '')    // Удаляем комментарии
            .replace(/\s+/g, ' ')                // Убираем лишние пробелы
            .replace(/>\s+</g, '><')             // Убираем пробелы между тегами
            .trim();
        fs.writeFileSync(loginDest, html);
        console.log('✅ Copied and minified login.html');
    } else {
        console.warn('⚠️ login.html not found in public/');
    }

    // Копируем favicon если есть
    const faviconSrc = path.join(publicDir, 'favicon.ico');
    const faviconDest = path.join(distDir, 'favicon.ico');
    if (fs.existsSync(faviconSrc)) {
        fs.copyFileSync(faviconSrc, faviconDest);
        console.log('✅ Copied favicon.ico');
    }
}

// Создание файла версии
function createVersionFile() {
    let packageJson = { version: '1.0.0' };
    try {
        packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    } catch (e) {
        console.warn('⚠️ package.json not found');
    }

    const version = {
        version: packageJson.version,
        buildTime: new Date().toISOString(),
        environment: 'production'
    };

    fs.writeFileSync(
        path.join(distDir, 'version.json'),
        JSON.stringify(version, null, 2)
    );
    console.log('✅ Created version.json');
}

// Очистка dist папки перед сборкой
function cleanDist() {
    if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        for (const file of files) {
            const filePath = path.join(distDir, file);
            if (fs.statSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
        console.log('🧹 Cleaned dist directory');
    }
}

// Основная сборка
async function build() {
    console.log('📁 Source: ' + publicDir);
    console.log('📦 Output: ' + distDir + '\n');

    // Очищаем dist
    cleanDist();

    // Создаем папки заново
    if (!fs.existsSync(distCSSDir)) {
        fs.mkdirSync(distCSSDir, { recursive: true });
    }
    if (!fs.existsSync(distJSDir)) {
        fs.mkdirSync(distJSDir, { recursive: true });
    }

    // Копируем статические файлы
    copyStaticFiles();

    // Минифицируем CSS
    minifyCSS();

    // Собираем JS
    const jsSuccess = await buildJS();

    if (jsSuccess) {
        createVersionFile();
        console.log('\n✅ Build completed successfully!\n');
        console.log('📊 Build stats:');

        const cssSize = fs.statSync(path.join(distCSSDir, 'admin.min.css')).size;
        const jsSize = fs.statSync(path.join(distJSDir, 'main.min.js')).size;

        console.log(`   CSS: ${(cssSize / 1024).toFixed(2)} KB`);
        console.log(`   JS:  ${(jsSize / 1024).toFixed(2)} KB`);
        console.log(`   Total: ${((cssSize + jsSize) / 1024).toFixed(2)} KB`);
        console.log('\n📁 Output files:');
        console.log(`   📄 ${path.join(distDir, 'login.html')}`);
        console.log(`   🎨 ${path.join(distCSSDir, 'admin.min.css')}`);
        console.log(`   📜 ${path.join(distJSDir, 'main.min.js')}`);
        console.log(`   📋 ${path.join(distDir, 'version.json')}`);
        console.log('\n🚀 You can now run: NODE_ENV=production npm start\n');
    } else {
        console.error('\n❌ Build failed!\n');
        process.exit(1);
    }
}

// Запуск сборки
build().catch(err => {
    console.error('Build error:', err);
    process.exit(1);
});