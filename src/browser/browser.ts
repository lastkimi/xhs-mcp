// 浏览器工具模块 - 支持无头模式访问
import puppeteer, { Browser, Page } from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';


// 查找系统 Chrome 路径（Windows）
function findChromePath(): string | null {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH || '',
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
  ];
  for (const path of possiblePaths) {
    if (path && existsSync(path)) {
      return path;
    }
  }
  return null;
}


// 启动浏览器（支持无头模式）
export async function launchBrowser(headless: boolean = true): Promise<Browser> {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error('未找到 Chrome 浏览器。请安装 Chrome 或设置 CHROME_PATH 环境变量指向 Chrome 可执行文件路径。');
  }
  // 使用固定的用户数据目录，保持登录状态
  const userDataDir = join(homedir(), '.xhs-mcp', 'browser-data');
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }
  return await puppeteer.launch({
    executablePath: chromePath,
    headless: headless,
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
  });
}


// 创建已登录的页面（无头模式）
export async function createLoggedInPage(): Promise<Page> {
  const browser = await launchBrowser(true);
  const page = await browser.newPage();
  // 访问创作者中心首页验证登录状态
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  const currentUrl = page.url();
  const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
  if (isLoginPage) {
    await browser.close();
    throw new Error('未登录，请先运行 npm run cli login 进行登录');
  }
  return page;
}



// 执行页面操作（自动管理浏览器生命周期）
export async function withBrowser<T>(
  headless: boolean,
  callback: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await launchBrowser(headless);
  try {
    const page = await browser.newPage();
    return await callback(page);
  } finally {
    await browser.close();
  }
}



// 执行已登录的页面操作（无头模式，自动验证登录状态）
export async function withLoggedInPage<T>(
  callback: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await launchBrowser(true);
  try {
    const page = await browser.newPage();
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    if (isLoginPage) {
      throw new Error('未登录，请先运行 npm run cli login 进行登录');
    }
    return await callback(page);
  } finally {
    await browser.close();
  }
}
