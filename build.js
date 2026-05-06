// build.js
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Пути для вашей структуры
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');
const distCSSDir = path.join(distDir, 'css');
const distJSDir = path.join(distDir, 'js');

console.log('\n🔨 Starting build process...\n');
console.log(`📁 Source: ${publicDir}`);
console.log(`📦 Output: ${distDir}\n`);

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

// Функция для минификации CSS простым способом
function minifyCSS() {
    const cssPath = path.join(publicDir, 'css', 'admin.css');

    if (!fs.existsSync(cssPath)) {
        console.error('❌ admin.css not found!');
        return false;
    }

    let css = fs.readFileSync(cssPath, 'utf8');

    // Простая минификация CSS
    css = css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем комментарии
        .replace(/\s+/g, ' ')              // Заменяем множественные пробелы
        .replace(/:\s+/g, ':')             // Убираем пробелы после :
        .replace(/;\s+/g, ';')             // Убираем пробелы после ;
        .replace(/,\s+/g, ',')             // Убираем пробелы после ,
        .replace(/\s*{\s*/g, '{')          // Убираем пробелы вокруг {
        .replace(/\s*}\s*/g, '}')          // Убираем пробелы вокруг }
        .replace(/\s*;\s*/g, ';')          // Убираем пробелы вокруг ;
        .replace(/;}/g, '}')               // Убираем последнюю ;
        .replace(/\s*:\s*/g, ':')          // Убираем пробелы вокруг :
        .replace(/  +/g, ' ')              // Убираем лишние пробелы
        .trim();

    const outputPath = path.join(distCSSDir, 'admin.min.css');
    fs.writeFileSync(outputPath, css);

    const originalSize = (fs.statSync(cssPath).size / 1024).toFixed(2);
    const minifiedSize = (css.length / 1024).toFixed(2);

    console.log(`✅ CSS minified: ${originalSize} KB → ${minifiedSize} KB`);
    return true;
}

// Функция для сборки JS
async function buildJS() {
    const jsPath = path.join(publicDir, 'js', 'admin.js');

    if (!fs.existsSync(jsPath)) {
        console.error('❌ admin.js not found!');
        return false;
    }

    const originalSize = (fs.statSync(jsPath).size / 1024).toFixed(2);

    try {
        await esbuild.build({
            entryPoints: [jsPath],
            bundle: true,
            minify: true,
            sourcemap: false,
            target: ['es2020'],
            outfile: path.join(distJSDir, 'admin.min.js'),
            format: 'iife',
            platform: 'browser',
            treeShaking: true,
            drop: ['console', 'debugger'],
            define: {
                'process.env.NODE_ENV': '"production"'
            },
        });

        const minifiedSize = (fs.statSync(path.join(distJSDir, 'admin.min.js')).size / 1024).toFixed(2);
        console.log(`✅ JS minified: ${originalSize} KB → ${minifiedSize} KB`);
        return true;
    } catch (error) {
        console.error('❌ JS build failed:', error);
        return false;
    }
}

// Копируем статические файлы
function copyStaticFiles() {
    // Копируем login.html
    const loginSrc = path.join(publicDir, 'login.html');
    const loginDest = path.join(distDir, 'login.html');

    if (fs.existsSync(loginSrc)) {
        fs.copyFileSync(loginSrc, loginDest);
        console.log('✅ Copied login.html');
    } else {
        console.warn('⚠️ login.html not found in public/');
    }
}

// Создаем файл с версией
function createVersionFile() {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
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

// Основная сборка
async function build() {
    copyStaticFiles();
    minifyCSS();
    const jsSuccess = await buildJS();

    if (jsSuccess) {
        createVersionFile();
        console.log('\n✅ Build completed successfully!\n');
        console.log('📊 Final files:');
        console.log(`   📄 ${path.join(distDir, 'login.html')}`);
        console.log(`   🎨 ${path.join(distCSSDir, 'admin.min.css')}`);
        console.log(`   📜 ${path.join(distJSDir, 'admin.min.js')}`);
        console.log(`   📋 ${path.join(distDir, 'version.json')}`);
        console.log('\n🚀 You can now run: NODE_ENV=production npm start\n');
    } else {
        console.error('\n❌ Build failed!\n');
        process.exit(1);
    }
}

// Запуск
build();