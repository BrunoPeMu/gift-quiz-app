import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 4173;

const ROUTES = [
    '/',
    '/preguntas-frecuentes',
    '/precios',
    '/como-funciona',
    '/caracteristicas',
    '/acerca-de',
    '/legal/aviso-legal',
    '/legal/privacidad',
    '/legal/cookies',
    '/legal/terminos',
];

async function prerender() {
    console.log('Starting prerender...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const template = readFileSync(join(DIST, 'index.html'), 'utf-8');

    for (const route of ROUTES) {
        try {
            const page = await browser.newPage();
            
            await page.goto(`http://localhost:${PORT}${route}`, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            });

            await page.waitForSelector('#root > *', { timeout: 10000 });

            const html = await page.content();
            
            const outPath = route === '/'
                ? join(DIST, 'index.html')
                : join(DIST, route, 'index.html');
            
            const outDir = dirname(outPath);
            if (!existsSync(outDir)) {
                mkdirSync(outDir, { recursive: true });
            }
            
            writeFileSync(outPath, html);
            console.log(`✓ ${route}`);
            
            await page.close();
        } catch (err) {
            console.error(`✗ ${route}: ${err.message}`);
        }
    }

    await browser.close();
    console.log('Prerender complete!');
}

prerender().catch(console.error);
