// Cookie 管理工具
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import type { Cookie } from 'puppeteer';
import { COOKIE_FILE } from '../config.js';


// Cookie 数据接口
interface CookieData {
  cookies: Cookie[];
  updatedAt: string;
  cookieString?: string; // 向后兼容
}



// 获取 cookie 文件路径
export function getCookieFilePath(): string {
  return COOKIE_FILE;
}



// 确保目录存在
function ensureDir() {
  const dir = dirname(COOKIE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}



// 保存 cookie（支持 Cookie 对象数组或字符串）
export function saveCookie(cookie: string | Cookie[]): void {
  ensureDir();
  let cookies: Cookie[] = [];
  let cookieString: string = '';
  if (typeof cookie === 'string') {
    cookieString = cookie;
  } else {
    cookies = cookie;
    cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  }
  const data: CookieData = {
    cookies,
    cookieString,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}



// 读取 cookie 字符串（向后兼容）
export function loadCookie(): string | null {
  if (!existsSync(COOKIE_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8')) as CookieData;
    if (data.cookieString) {
      return data.cookieString;
    }
    if (data.cookies && data.cookies.length > 0) {
      return data.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
    return null;
  } catch {
    return null;
  }
}



// 读取 cookie 对象数组
export function loadCookies(): Cookie[] | null {
  if (!existsSync(COOKIE_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8')) as CookieData;
    if (data.cookies && data.cookies.length > 0) {
      return data.cookies;
    }
    return null;
  } catch {
    return null;
  }
}



// 检查 cookie 是否过期
export function isCookieExpired(): boolean {
  const cookies = loadCookies();
  if (!cookies || cookies.length === 0) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  let hasExpiredCookie = false;
  let hasValidExpiresCookie = false;
  for (const cookie of cookies) {
    if (cookie.expires && cookie.expires > 0) {
      hasValidExpiresCookie = true;
      if (cookie.expires < now) {
        hasExpiredCookie = true;
      }
    }
  }
  if (hasExpiredCookie) {
    return true;
  }
  if (hasValidExpiresCookie) {
    return false;
  }
  return false;
}



// 检查是否已登录（快速检查，基于 cookie 文件存在性和过期时间）
export function isLoggedIn(): boolean {
  if (!existsSync(COOKIE_FILE)) {
    return false;
  }
  return !isCookieExpired();
}



// 获取 cookie 剩余有效时间（秒），返回 null 表示无法确定或已过期
export function getCookieTTL(): number | null {
  const cookies = loadCookies();
  if (!cookies || cookies.length === 0) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  let minTTL: number | null = null;
  for (const cookie of cookies) {
    if (cookie.expires && cookie.expires > 0) {
      const ttl = cookie.expires - now;
      if (ttl < 0) {
        return null;
      }
      if (minTTL === null || ttl < minTTL) {
        minTTL = ttl;
      }
    }
  }
  return minTTL;
}



// 清除 cookie
export function clearCookie(): void {
  if (existsSync(COOKIE_FILE)) {
    unlinkSync(COOKIE_FILE);
  }
}
