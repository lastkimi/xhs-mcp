// src/config.ts
// 配置文件

import { join } from 'path';

export const CACHE_DIR = join(process.cwd(), '.cache');
export const NOTES_CACHE_DIR = join(CACHE_DIR, 'notes');
export const COOKIE_DIR = join(CACHE_DIR, 'cookies');
export const COOKIE_FILE = join(COOKIE_DIR, 'cookies.json');
export const USER_PROFILE_CACHE_FILE = join(CACHE_DIR, 'user_profile.json');