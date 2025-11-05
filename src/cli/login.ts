// 使用 Puppeteer 实现小红书登录
import puppeteer, { Browser, Page } from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { saveCookie } from '../auth/cookie.js';


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


// 启动浏览器（登录时使用非无头模式）
async function launchBrowser(): Promise<Browser> {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error('未找到 Chrome 浏览器。请安装 Chrome 或设置 CHROME_PATH 环境变量指向 Chrome 可执行文件路径。');
  }
  // 使用固定的用户数据目录，这样登录状态会被保留
  const userDataDir = join(homedir(), '.xhs-mcp', 'browser-data');
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }
  console.log(`✅ 找到 Chrome: ${chromePath}\n`);
  console.log(`📁 使用用户数据目录: ${userDataDir}\n`);
  return await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // 登录时使用非无头模式，让用户可以看到并操作
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-sync',
      '--disable-default-apps',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
    defaultViewport: null, // 设置为 null 以允许窗口自由调整大小
  });
}


// 等待登录完成
async function waitForLogin(page: Page, timeout: number = 180000): Promise<boolean> {
  const startTime = Date.now();
  console.log('⏳ 开始检测登录状态...\n');
  let lastCheckUrl = '';
  while (Date.now() - startTime < timeout) {
    try {
      // 只检查当前页面URL，不刷新页面
      const currentUrl = page.url();
      // 如果URL发生变化，说明可能发生了跳转（比如登录成功后的重定向）
      if (currentUrl !== lastCheckUrl) {
        lastCheckUrl = currentUrl;
        // 如果当前不在登录页面，且在小红书域名下，尝试使用轻量方式检测
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
        if (!isLoginPage && currentUrl.includes('xiaohongshu.com')) {
          // 使用 fetch 方式检测，不重新加载页面，避免刷新
          const canAccessCreator = await page.evaluate(async () => {
            try {
              const response = await fetch('https://creator.xiaohongshu.com/new/home', {
                method: 'HEAD',
                redirect: 'manual',
              });
              // 如果返回 200，说明可以访问（已登录）
              // 如果返回 302/301 等重定向，需要检查 Location header
              if (response.status === 200) {
                return true;
              }
              if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location') || '';
                // 如果重定向到登录页面，说明未登录
                return !location.includes('/login') && !location.includes('/signin');
              }
              return false;
            } catch (e) {
              return false;
            }
          });
          // 如果能访问创作者中心，说明已登录
          if (canAccessCreator) {
            // 登录成功，获取cookie
            const cookies = await page.cookies('https://creator.xiaohongshu.com');
            const webSessionCookie = cookies.find(c => c.name === 'web_session');
            console.log('\n✅ 检测到登录成功！');
            console.log(`   - 当前页面: ${currentUrl}`);
            if (webSessionCookie) {
              console.log(`   - web_session: ${webSessionCookie.value.substring(0, 20)}...`);
            }
            console.log('');
            return true;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // 如果访问出错，可能是网络问题，继续等待
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}


// 主登录函数
async function login() {
  let browser: Browser | null = null;
  let loginSuccessful = false;
  try {
    console.log('🚀 启动浏览器...\n');
    browser = await launchBrowser();
    const page = await browser.newPage();
    // 直接访问创作者中心首页
    console.log('🌐 访问创作者中心首页...\n');
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 检查是否已登录（如果未登录会自动重定向到登录页面）
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    if (!isLoginPage && currentUrl.includes('creator.xiaohongshu.com')) {
      const cookies = await page.cookies('https://creator.xiaohongshu.com');
      saveCookie(cookies);
      loginSuccessful = true;
      console.log('✅ 登录成功！Cookies 已保存\n');
    } else {
      console.log('\n⏳ 请在浏览器中完成登录...\n');
      console.log('提示: 支持扫码登录或账号密码登录\n');
      console.log('⏰ 您有 120 秒时间完成登录\n');
      const loginSuccess = await waitForLogin(page, 120000);
      if (loginSuccess) {
        const cookies = await page.cookies('https://creator.xiaohongshu.com');
        console.log('💾 保存登录信息...\n');
        saveCookie(cookies);
        console.log('✅ 登录成功！Cookies 已保存\n');
        loginSuccessful = true;
      } else {
        console.log('❌ 登录超时或失败\n');
        loginSuccessful = false;
      }
    }
    return loginSuccessful;
  } catch (error) {
    console.error('❌ 登录过程出错:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


// 导出登录函数
export { login };