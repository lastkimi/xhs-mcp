// MCP 工具处理器 - 直接调用 CLI 函数（CLI函数已返回MCP格式）
import { checkLoginState } from '../cli/check_login_state.js';
import { login } from '../cli/login.js';
import { getOperationData } from '../cli/get_operation_data.js';
import { getNoteStatistics } from '../cli/get_note_statistics.js';
import { getNoteDetail } from '../cli/get_note_detail_by_id.js';
import { loadFromCache } from '../utils/cache.js';
import { NoteDetail } from '../types/note.js';
import { launchBrowser } from '../browser/browser.js';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { formatErrorForMCP } from './format.js';

// 检查登录状态
export async function handleCheckLogin() {
  const isLoggedIn = await checkLoginState();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          isLoggedIn,
          status: isLoggedIn ? '已登录' : '未登录',
          message: isLoggedIn 
            ? '可以正常使用小红书功能' 
            : '请先运行登录命令或通过浏览器登录',
        }, null, 2),
      },
    ],
  };
}

// 获取运营数据 - 直接调用CLI函数（已返回MCP格式）
export async function handleGetOverallData() {
  try {
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    return await getOperationData();
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// 获取笔记统计 - 直接调用CLI函数（已返回MCP格式）
export async function handleGetNoteStatistics(limit?: number) {
  try {
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    return await getNoteStatistics(limit);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// 获取笔记详情 - 直接调用CLI函数（已返回MCP格式）
export async function handleGetNoteDetailById(noteId: string) {
  try {
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    return await getNoteDetail(noteId);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// 获取所有笔记详情
export async function handleGetAllNotesDetail(refresh: boolean = false) {
  try {
    if (refresh) {
      const isLoggedIn = await checkLoginState();
      if (!isLoggedIn) {
        return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
      }
    }

    // 从缓存读取笔记列表
    const today = new Date().toISOString().split('T')[0];
    const cacheFilename = `note_statistics/${today}.json`;
    const cachedStats = loadFromCache<NoteDetail[]>(cacheFilename);

    if (!cachedStats || cachedStats.length === 0) {
      return formatErrorForMCP(new Error('未找到笔记统计数据。请先运行 xhs_get_note_statistics 获取近期笔记。'));
    }

    const noteIds = cachedStats.map(note => note.noteId).filter(id => id);
    const cachedNotes: NoteDetail[] = [];
    const uncachedIds: string[] = [];

    noteIds.forEach((noteId: string) => {
      const cached = loadFromCache<NoteDetail>(`notes/${noteId}.json`);
      if (cached) {
        cachedNotes.push(cached);
      } else {
        uncachedIds.push(noteId);
      }
    });

    let allNotes = [...cachedNotes];

    if (refresh || uncachedIds.length > 0) {
      const newNotes: NoteDetail[] = [];
      for (const noteId of uncachedIds) {
        try {
          const mcpResponse = await getNoteDetail(noteId);
          if (!mcpResponse.isError) {
            const detail = JSON.parse(mcpResponse.content[0].text) as NoteDetail;
            newNotes.push(detail);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`获取笔记 ${noteId} 失败:`, error);
        }
      }
      allNotes = [...cachedNotes, ...newNotes];
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            total: allNotes.length,
            fromCache: cachedNotes.length,
            newlyFetched: allNotes.length - cachedNotes.length,
            refresh,
            notes: allNotes,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// 读取发帖指导原则（需要从 CLI 中提取核心函数，暂时用占位）
export async function handleReadPostingGuidelines(generatePlan: boolean = true) {
  // TODO: 从 CLI 中提取核心函数
  return formatErrorForMCP(new Error('功能待实现'));
}

// 登录状态详情
export async function handleLoginStatus() {
  try {
    const isLoggedIn = await checkLoginState();
    const cookiePath = join(process.cwd(), 'auth', 'cookies.json');
    let lastLoginTime: string | null = null;
    if (existsSync(cookiePath)) {
      const stats = statSync(cookiePath);
      lastLoginTime = stats.mtime.toISOString();
    }

    let browserConnection = false;
    try {
      const browser = await launchBrowser(true);
      await browser.close();
      browserConnection = true;
    } catch {
      browserConnection = false;
    }

    const statusInfo = {
      isLoggedIn,
      hasValidCookies: isLoggedIn,
      browserConnection,
      lastLoginTime,
      capabilities: {
        canAccessCreatorCenter: isLoggedIn,
        canFetchStatistics: isLoggedIn,
        canGetNoteDetails: isLoggedIn,
      },
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(statusInfo, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// 登录
export async function handleLogin() {
  try {
    const loginResult = await login();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: loginResult,
            message: loginResult 
              ? '登录成功或已处于登录状态' 
              : '登录失败，请重试',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}
