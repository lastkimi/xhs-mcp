// 测试函数 - 仅打开浏览器到主页，方便调试
import puppeteer, { Browser } from 'puppeteer';
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


// 打开浏览器到主页（仅用于调试）
export async function openTestBrowser(): Promise<void> {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error('未找到 Chrome 浏览器。请安装 Chrome 或设置 CHROME_PATH 环境变量指向 Chrome 可执行文件路径。');
  }
  const userDataDir = join(homedir(), '.xhs-mcp', 'browser-data');
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  console.log('✅ 浏览器已打开，可以开始调试\n');
  console.log('提示: 浏览器将保持打开状态，请手动关闭\n');
}


// 主函数
async function main() {
  try {
    await openTestBrowser();
  } catch (error) {
    console.error('❌ 打开浏览器失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}


// 运行
main().catch(console.error);
