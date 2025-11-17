// 清除登录缓存并退出登录
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { getUserDataDir } from '../browser/browser.js';


export interface LogoutResult {
  removed: boolean;
  userDataDir: string;
}


export async function logout(): Promise<LogoutResult> {
  const userDataDir = getUserDataDir();
  if (!existsSync(userDataDir)) {
    return { removed: false, userDataDir };
  }
  try {
    await rm(userDataDir, { recursive: true, force: true });
    return { removed: true, userDataDir };
  } catch (error) {
    throw new Error(
      `无法清除登录缓存。请关闭所有 xhs-cli 打开的浏览器窗口后重试。\n缓存目录: ${userDataDir}\n` +
      (error instanceof Error ? `错误信息: ${error.message}` : '')
    );
  }
}

