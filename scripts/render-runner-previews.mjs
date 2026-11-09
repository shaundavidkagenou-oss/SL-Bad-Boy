import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('Install the optional browser test dependencies first. See README.md.');
  process.exit(2);
}

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 5191, strictPort: false },
});
await server.listen();
const address = server.httpServer.address();
let executablePath = process.env.CHROME_PATH;
let browserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'];
if (!executablePath) {
  const chromiumModule = await import('@sparticuz/chromium');
  const chromium = chromiumModule.default;
  chromium.setGraphicsMode = true;
  if (process.platform === 'linux') {
    const require = createRequire(import.meta.url);
    const packageEntry = require.resolve('@sparticuz/chromium');
    const runtime = await chromiumModule.inflate(join(dirname(packageEntry), '../bin/al2023.tar.br'));
    process.env.LD_LIBRARY_PATH = `${join(runtime, 'lib')}:${process.env.LD_LIBRARY_PATH ?? ''}`;
  }
  executablePath = await chromium.executablePath();
  browserArgs = [...chromium.args, ...browserArgs];
}
const browser = await puppeteer.launch({ executablePath, headless: true, args: browserArgs });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/scripts/runner-previews.html`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.runnerPortraitsReady === true, { timeout: 15000 });
  const ids = await page.evaluate(() => window.runnerPortraitIds);
  const output = join(process.cwd(), 'public', 'assets', 'runners');
  await mkdir(output, { recursive: true });
  for (const id of ids) {
    const data = await page.evaluate((characterId) => window.renderRunnerPortrait(characterId), id);
    const bytes = Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
    if (bytes.length < 5000) throw new Error(`Portrait for ${id} was unexpectedly empty (${bytes.length} bytes)`);
    await writeFile(join(output, `${id}.png`), bytes);
    console.log(`${id}: ${bytes.length} bytes`);
  }
  console.log(`Rendered ${ids.length} original 3D runner portraits.`);
} finally {
  await browser.close();
  await server.close();
}
