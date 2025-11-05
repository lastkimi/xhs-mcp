#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchNotes, getNoteDetail, getUserInfo } from './xhs.js';
import { launchBrowser, withLoggedInPage } from './browser/browser.js';
import { checkLoginState } from './cli/check_login_state.js';
import type { Page } from 'puppeteer';
import type { Browser } from 'puppeteer';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { login } from './cli/login.js';
import { getOverallDataCommand } from './cli/get_operation_data.js';
import { getNoteStatisticsCommand, updateDetailedStatisticsCommand } from './cli/get_note_statistics.js';
import { getNoteDetailByIdCommand, getAllNotesDetailCommand, readPostingGuidelinesCommand } from './cli/get_note_detail_by_id.js';

// 类型定义
interface DataItem {
  title: string;
  number: string;
  tendency: 'up' | 'down' | 'none';
  tendencyValue: string;
}

interface AccountStatisticsItem {
  title: string;
  number: string;
  description: string;
}

interface FanData {
  totalFans: string;
  newFans: string;
  lostFans: string;
  interests: string[];
}

interface NoteStatistics {
  title: string;
  publishTime: string;
  coverImage?: string;
  noteId?: string;
  detailUrl?: string;
  exposure: string;
  views: string;
  coverClickRate: string;
  likes: string;
  comments: string;
  favorites: string;
  fansIncrease: string;
  shares: string;
  avgViewTime: string;
  danmaku: string;
}

interface NoteDetail {
  noteId: string;
  title: string;
  content?: string;
  author?: string;
  publishTime?: string;
  coverImage?: string;
  images?: string[];
  views?: string;
  likes?: string;
  comments?: string;
  favorites?: string;
  shares?: string;
  tags?: string[];
  location?: string;
  url: string;
}

interface CachedStatistics {
  data: NoteStatistics[];
  fetchedAt: string;
}

interface CachedNoteDetail {
  data: NoteDetail;
  cachedAt: string;
}

// 缓存配置
const CACHE_DIR = join(process.cwd(), 'cache', 'statistics');
const LATEST_CACHE_FILE = join(CACHE_DIR, 'statistics-latest.json');
const NOTES_CACHE_DIR = join(process.cwd(), 'cache', 'notes');

// 确保缓存目录存在
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!existsSync(NOTES_CACHE_DIR)) {
    mkdirSync(NOTES_CACHE_DIR, { recursive: true });
  }
}

// 缓存函数实现
function readLatestCache(): NoteStatistics[] | null {
  if (!existsSync(LATEST_CACHE_FILE)) {
    return null;
  }
  try {
    const fileContent = readFileSync(LATEST_CACHE_FILE, 'utf-8');
    const cached: CachedStatistics = JSON.parse(fileContent);
    return cached.data;
  } catch {
    return null;
  }
}

function saveStatisticsCache(data: NoteStatistics[]): void {
  ensureCacheDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cacheFile = join(CACHE_DIR, `statistics-${timestamp}.json`);
  const cached: CachedStatistics = {
    data,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(cacheFile, JSON.stringify(cached, null, 2), 'utf-8');
  writeFileSync(LATEST_CACHE_FILE, JSON.stringify(cached, null, 2), 'utf-8');
}

function mergeStatistics(existingData: NoteStatistics[], detailedStats: NoteStatistics[]): NoteStatistics[] {
  const detailedMap = new Map<string, NoteStatistics>();
  detailedStats.forEach(stat => {
    if (stat.noteId) {
      detailedMap.set(stat.noteId, stat);
    }
  });
  
  const merged: NoteStatistics[] = [];
  
  existingData.forEach(existing => {
    if (existing.noteId && detailedMap.has(existing.noteId)) {
      const detailed = detailedMap.get(existing.noteId)!;
      merged.push({
        ...existing,
        exposure: detailed.exposure !== '未提供' ? detailed.exposure : existing.exposure,
        coverClickRate: detailed.coverClickRate !== '未提供' ? detailed.coverClickRate : existing.coverClickRate,
        fansIncrease: detailed.fansIncrease !== '未提供' ? detailed.fansIncrease : existing.fansIncrease,
        avgViewTime: detailed.avgViewTime !== '未提供' ? detailed.avgViewTime : existing.avgViewTime,
        danmaku: detailed.danmaku !== '未提供' ? detailed.danmaku : existing.danmaku,
        views: detailed.views || existing.views,
        likes: detailed.likes || existing.likes,
        comments: detailed.comments || existing.comments,
        favorites: detailed.favorites || existing.favorites,
        shares: detailed.shares || existing.shares,
      });
      detailedMap.delete(existing.noteId);
    } else {
      merged.push(existing);
    }
  });
  
  detailedMap.forEach(detailed => {
    merged.push(detailed);
  });
  
  return merged;
}

function readCache(noteId: string): NoteDetail | null {
  const cacheFile = join(NOTES_CACHE_DIR, `note-${noteId}.json`);
  if (!existsSync(cacheFile)) {
    return null;
  }
  
  try {
    const fileContent = readFileSync(cacheFile, 'utf-8');
    const cached: CachedNoteDetail = JSON.parse(fileContent);
    return cached.data;
  } catch (error) {
    return null;
  }
}

function saveCache(noteId: string, detail: NoteDetail): void {
  ensureCacheDir();
  const cacheFile = join(NOTES_CACHE_DIR, `note-${noteId}.json`);
  const cached: CachedNoteDetail = {
    data: detail,
    cachedAt: new Date().toISOString(),
  };
  writeFileSync(cacheFile, JSON.stringify(cached, null, 2), 'utf-8');
}

// 格式化函数实现
function formatDataForDisplay(
  homeData: DataItem[], 
  accountData: AccountStatisticsItem[], 
  fanData: FanData
): string {
  let output = '\n📊 近期笔记运营数据\n';
  output += '='.repeat(60) + '\n\n';
  
  if (homeData.length > 0) {
    output += '【首页数据】\n';
    homeData.forEach((item) => {
      let trendIcon = '';
      if (item.tendency === 'up') {
        trendIcon = '📈';
      } else if (item.tendency === 'down') {
        trendIcon = '📉';
      } else {
        trendIcon = '➖';
      }
      output += `${item.title.padEnd(20)} ${item.number.padStart(10)} ${trendIcon} ${item.tendencyValue}\n`;
    });
    output += '\n';
  }
  
  if (accountData.length > 0) {
    output += '【账户统计数据】\n';
    accountData.forEach((item) => {
      output += `${item.title.padEnd(20)} ${item.number.padStart(10)} ${item.description}\n`;
    });
    output += '\n';
  }
  
  output += '【粉丝数据】\n';
  output += `总粉丝数: ${fanData.totalFans.padStart(15)}\n`;
  output += `新增粉丝: ${fanData.newFans.padStart(15)}\n`;
  output += `流失粉丝: ${fanData.lostFans.padStart(15)}\n`;
  output += '\n';
  
  if (fanData.interests.length > 0) {
    output += '【粉丝兴趣分布】\n';
    fanData.interests.forEach((interest, index) => {
      output += `${(index + 1).toString().padStart(2)}. ${interest}\n`;
    });
    output += '\n';
  } else {
    output += '【粉丝兴趣分布】\n暂无兴趣分布数据\n\n';
  }
  
  output += '='.repeat(60) + '\n';
  return output;
}

function formatStatisticsForDisplay(data: NoteStatistics[]): string {
  if (data.length === 0) {
    return '❌ 未找到笔记数据';
  }
  let output = '\n📊 近期笔记统计数据\n';
  output += '='.repeat(120) + '\n\n';
  data.forEach((note, index) => {
    output += `笔记 ${index + 1}: ${note.title}\n`;
    output += `发布时间: ${note.publishTime}\n`;
    if (note.noteId) {
      output += `笔记ID: ${note.noteId}\n`;
    }
    if (note.detailUrl) {
      output += `详情链接: ${note.detailUrl}\n`;
    }
    if (note.exposure !== '未提供') {
      output += `曝光: ${note.exposure.padEnd(8)} | `;
    }
    output += `观看: ${note.views.padEnd(8)} | `;
    if (note.coverClickRate !== '未提供') {
      output += `封面点击率: ${note.coverClickRate.padEnd(8)} | `;
    }
    output += '\n';
    output += `点赞: ${note.likes.padEnd(8)} | 评论: ${note.comments.padEnd(8)} | 收藏: ${note.favorites.padEnd(8)} | 分享: ${note.shares}\n`;
    if (note.fansIncrease !== '未提供' || note.avgViewTime !== '未提供' || note.danmaku !== '未提供') {
      output += `涨粉: ${note.fansIncrease.padEnd(8)} | 人均观看时长: ${note.avgViewTime.padEnd(8)} | 弹幕: ${note.danmaku}\n`;
    }
    output += '\n' + '-'.repeat(120) + '\n\n';
  });
  output += '='.repeat(120) + '\n';
  return output;
}

function formatDetailForDisplay(detail: NoteDetail): string {
  let output = '\n📝 笔记详情\n';
  output += '='.repeat(120) + '\n\n';
  
  output += `标题: ${detail.title}\n`;
  if (detail.author) {
    output += `作者: ${detail.author}\n`;
  }
  if (detail.publishTime) {
    output += `发布时间: ${detail.publishTime}\n`;
  }
  if (detail.location) {
    output += `位置: ${detail.location}\n`;
  }
  output += `笔记ID: ${detail.noteId}\n`;
  output += `链接: ${detail.url}\n\n`;
  
  if (detail.content) {
    output += `内容:\n${detail.content}\n\n`;
  }
  
  if (detail.tags && detail.tags.length > 0) {
    output += `标签: ${detail.tags.join(', ')}\n\n`;
  }
  
  if (detail.coverImage) {
    output += `封面: ${detail.coverImage}\n`;
  }
  
  if (detail.images && detail.images.length > 0) {
    output += `\n图片 (${detail.images.length} 张):\n`;
    detail.images.forEach((img, index) => {
      output += `  ${index + 1}. ${img}\n`;
    });
    output += '\n';
  }
  
  if (detail.views || detail.likes || detail.comments || detail.favorites || detail.shares) {
    output += '统计数据:\n';
    if (detail.views) {
      output += `  观看: ${detail.views}\n`;
    }
    if (detail.likes) {
      output += `  点赞: ${detail.likes}\n`;
    }
    if (detail.comments) {
      output += `  评论: ${detail.comments}\n`;
    }
    if (detail.favorites) {
      output += `  收藏: ${detail.favorites}\n`;
    }
    if (detail.shares) {
      output += `  分享: ${detail.shares}\n`;
    }
    output += '\n';
  }
  
  output += '='.repeat(120) + '\n';
  return output;
}

// 页面数据获取函数（完整实现）
async function getHomeData(page: Page): Promise<DataItem[]> {
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  return await page.$$eval('.creator-block', (blocks: Element[]): DataItem[] => {
    return blocks.map((block: Element): DataItem | null => {
      const titleEl = block.querySelector('.title');
      const numberEl = block.querySelector('.number');
      const tendencyEl = block.querySelector('.tendency');
      if (!titleEl || !numberEl) {
        return null;
      }
      const title = (titleEl.textContent || '').trim() || '';
      const number = (numberEl.textContent || '').trim() || '0';
      let tendency: 'up' | 'down' | 'none' = 'none';
      let tendencyValue = '--';
      if (tendencyEl) {
        const tendencyNumberEl = tendencyEl.querySelector('.tendency-number');
        if (tendencyNumberEl) {
          tendencyValue = (tendencyNumberEl.textContent || '').trim() || '--';
          const classList = Array.from(tendencyNumberEl.classList);
          if (classList.includes('up')) {
            tendency = 'up';
          } else if (classList.includes('down')) {
            tendency = 'down';
          }
        }
      }
      return {
        title,
        number,
        tendency,
        tendencyValue
      };
    }).filter((item): item is DataItem => item !== null);
  });
}

async function getAccountStatistics(page: Page): Promise<AccountStatisticsItem[]> {
  await page.goto('https://creator.xiaohongshu.com/statistics/account', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  return await page.$$eval('.suggestionItem', (items: Element[]): AccountStatisticsItem[] => {
    return items.map((item: Element): AccountStatisticsItem | null => {
      const titleEl = item.querySelector('.title');
      const suggestionDataEl = item.querySelector('.suggestionData');
      if (!titleEl || !suggestionDataEl) {
        return null;
      }
      const title = (titleEl.textContent || '').trim() || '';
      const allText = (suggestionDataEl.textContent || '').trim() || '';
      const numberEls = suggestionDataEl.querySelectorAll('.number');
      let number = '';
      if (numberEls.length > 0) {
        number = (numberEls[0].textContent || '').trim() || '';
      }
      const descEls = suggestionDataEl.querySelectorAll('.desc');
      let description = '';
      if (descEls.length > 0) {
        const descTexts = Array.from(descEls).map((el: Element) => (el.textContent || '').trim()).filter(t => t);
        description = descTexts.join(' ');
      }
      if (!title || !number) {
        return null;
      }
      return {
        title: title.replace('：', ''),
        number,
        description
      };
    }).filter((item): item is AccountStatisticsItem => item !== null);
  });
}

async function getFanData(page: Page): Promise<FanData> {
  await page.goto('https://creator.xiaohongshu.com/creator/fans', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return await page.evaluate((): FanData => {
    const data: FanData = {
      totalFans: '0',
      newFans: '0',
      lostFans: '0',
      interests: []
    };
    
    const blockContainers = document.querySelectorAll('.block-container');
    for (let i = 0; i < blockContainers.length; i++) {
      const container = blockContainers[i] as Element;
      const desEl = container.querySelector('.des');
      const conEl = container.querySelector('.con');
      if (desEl && conEl) {
        const description = (desEl.textContent || '').trim();
        const value = (conEl.textContent || '').trim().replace(/,/g, '');
        
        if (description.includes('总粉丝数')) {
          data.totalFans = value;
        } else if (description.includes('新增粉丝数')) {
          const match = value.match(/\d+/);
          data.newFans = match ? match[0] : '0';
        } else if (description.includes('流失粉丝数')) {
          const match = value.match(/\d+/);
          data.lostFans = match ? match[0] : '0';
        }
      }
    }
    
    const wordCloudBox = document.querySelector('.word-cloud-box');
    if (wordCloudBox) {
      const rowItems = wordCloudBox.querySelectorAll('.row-item');
      for (let i = 0; i < rowItems.length; i++) {
        const item = rowItems[i] as Element;
        const text = (item.textContent || '').trim();
        if (text && !data.interests.includes(text)) {
          data.interests.push(text);
        }
      }
    }
    
    return data;
  });
}

async function getRecentNotes(page: Page): Promise<NoteStatistics[]> {
  await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const noteCards = await page.$$('div.note');
  const data: NoteStatistics[] = [];
  
  for (const card of noteCards) {
    const impressionData = await page.evaluate((el: Element) => {
      const dataImpression = el.getAttribute('data-impression');
      if (!dataImpression) return null;
      try {
        return JSON.parse(dataImpression);
      } catch {
        return null;
      }
    }, card);
    
    let noteId = '';
    if (impressionData?.noteTarget?.value?.noteId) {
      noteId = impressionData.noteTarget.value.noteId;
    }
    
    const titleEl = await card.$('.info .title');
    const title = titleEl ? await page.evaluate((el: Element) => (el.textContent || '').trim(), titleEl) : '';
    
    const timeEl = await card.$('.info .time');
    const publishTime = timeEl ? await page.evaluate((el: Element) => (el.textContent || '').trim(), timeEl) : '';
    
    const coverEl = await card.$('.img img');
    let coverImage = '';
    if (coverEl) {
      coverImage = await page.evaluate((el: Element) => el.getAttribute('src') || '', coverEl);
    }
    
    const iconList = await card.$('.icon_list');
    let views = '0';
    let likes = '0';
    let comments = '0';
    let favorites = '0';
    let shares = '0';
    
    if (iconList) {
      const icons = await iconList.$$('.icon');
      for (const icon of icons) {
        const iconText = await page.evaluate((el: Element) => {
          const svg = el.querySelector('svg');
          const path = svg?.querySelector('path');
          const d = path?.getAttribute('d') || '';
          const span = el.querySelector('span');
          const count = span ? (span.textContent || '').trim() : '';
          
          if (d.includes('M21.83 11.442') || d.includes('M15 12')) {
            return { type: 'views', count };
          }
          if (d.includes('M12 22c5.5 0') || d.includes('M8.4 11')) {
            return { type: 'likes', count };
          }
          if (d.includes('M12 4.32A6.19') || d.includes('l7.244 7.17')) {
            return { type: 'favorites', count };
          }
          if (d.includes('M5.873 21.142') || d.includes('l.469-4.549')) {
            return { type: 'comments', count };
          }
          if (d.includes('M20.673 12.764') || d.includes('l-8.612-6.236')) {
            return { type: 'shares', count };
          }
          return null;
        }, icon);
        
        if (iconText) {
          switch (iconText.type) {
            case 'views':
              views = iconText.count || '0';
              break;
            case 'likes':
              likes = iconText.count || '0';
              break;
            case 'comments':
              comments = iconText.count || '0';
              break;
            case 'favorites':
              favorites = iconText.count || '0';
              break;
            case 'shares':
              shares = iconText.count || '0';
              break;
          }
        }
      }
    }
    
    const detailUrl = noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : undefined;
    
    data.push({
      title,
      publishTime,
      coverImage: coverImage || undefined,
      noteId: noteId || undefined,
      detailUrl,
      exposure: '未提供',
      views,
      coverClickRate: '未提供',
      likes,
      comments,
      favorites,
      fansIncrease: '未提供',
      shares,
      avgViewTime: '未提供',
      danmaku: '未提供',
    });
  }
  
  return data;
}

async function getDetailedStatistics(page: Page): Promise<NoteStatistics[]> {
  await page.goto('https://creator.xiaohongshu.com/statistics/data-analysis', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const rows = await page.$$('tbody.d-table__body tr');
  const data: NoteStatistics[] = [];
  
  for (const row of rows) {
    const cells = await row.$$('td');
    if (cells.length < 12) {
      continue;
    }
    
    const noteInfoCell = cells[0];
    const titleEl = await noteInfoCell.$('.note-title');
    const timeEl = await noteInfoCell.$('.time');
    const coverEl = await noteInfoCell.$('.note-cover img');
    
    const title = titleEl ? await page.evaluate((el: Element) => (el.textContent || '').trim(), titleEl) : '';
    const publishTime = timeEl ? await page.evaluate((el: Element) => (el.textContent || '').trim(), timeEl) : '';
    const coverImage = coverEl ? await page.evaluate((el: Element) => el.getAttribute('src') || '', coverEl) : '';
    
    let noteId = '';
    const rowData = await page.evaluate((el: Element) => {
      const dataImpression = el.getAttribute('data-impression');
      if (dataImpression) {
        try {
          const parsed = JSON.parse(dataImpression);
          return parsed.noteTarget?.value?.noteId || '';
        } catch {
          return '';
        }
      }
      return '';
    }, row);
    noteId = rowData;
    
    const getCellText = async (index: number) => {
      if (index >= cells.length) return '未提供';
      const cellDiv = await cells[index].$('.d-table__cell');
      if (!cellDiv) return '未提供';
      const text = await page.evaluate((el: Element) => (el.textContent || '').trim(), cellDiv);
      return text || '未提供';
    };
    
    const detailUrl = noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : undefined;
    
    data.push({
      title,
      publishTime,
      coverImage: coverImage || undefined,
      noteId: noteId || undefined,
      detailUrl,
      exposure: await getCellText(1),
      views: await getCellText(2),
      coverClickRate: await getCellText(3),
      likes: await getCellText(4),
      comments: await getCellText(5),
      favorites: await getCellText(6),
      fansIncrease: await getCellText(7),
      shares: await getCellText(8),
      avgViewTime: await getCellText(9),
      danmaku: await getCellText(10),
    });
  }
  
  return data;
}

// 笔记详情获取函数
async function getNoteDetailById(page: Page, noteId: string): Promise<NoteDetail | null> {
  const editUrl = `https://creator.xiaohongshu.com/publish/update?id=${noteId}`;
  
  await page.goto(editUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
    throw new Error('需要登录才能查看笔记详情');
  }
  
  try {
    await page.waitForSelector('input.d-text, .tiptap.ProseMirror', { timeout: 10000 });
  } catch (error) {
    console.warn('⚠️ 等待元素超时，继续尝试提取...');
  }
  
  const detail = await page.evaluate((): Partial<NoteDetail> => {
    const result: Partial<NoteDetail> = {
      url: window.location.href,
    };
    
    const titleInput = document.querySelector('input.d-text') as HTMLInputElement;
    if (titleInput && titleInput.value) {
      result.title = titleInput.value.trim();
    }
    
    const contentEl = document.querySelector('.tiptap.ProseMirror');
    if (contentEl) {
      result.content = (contentEl.textContent || '').trim();
      
      const imageEls = contentEl.querySelectorAll('img');
      if (imageEls.length > 0) {
        const images: string[] = [];
        imageEls.forEach((img: Element) => {
          const src = (img as HTMLImageElement).src;
          if (src && !img.classList.contains('ProseMirror-separator')) {
            images.push(src);
          }
        });
        if (images.length > 0) {
          result.images = images;
        }
      }
    }
    
    const topicEls = document.querySelectorAll('a.tiptap-topic');
    if (topicEls.length > 0) {
      const tags: string[] = [];
      const tagSet = new Set<string>();
      topicEls.forEach((topicEl: Element) => {
        let tagName = '';
        const dataTopic = topicEl.getAttribute('data-topic');
        if (dataTopic) {
          try {
            const topicData = JSON.parse(dataTopic);
            if (topicData.name) {
              tagName = topicData.name.trim();
            }
          } catch {
            const text = (topicEl.textContent || '').trim();
            tagName = text.replace(/#/g, '').replace(/\[话题\]/g, '').trim();
          }
        } else {
          const text = (topicEl.textContent || '').trim();
          tagName = text.replace(/#/g, '').replace(/\[话题\]/g, '').trim();
        }
        if (tagName && !tagSet.has(tagName)) {
          tagSet.add(tagName);
          tags.push(tagName);
        }
      });
      if (tags.length > 0) {
        result.tags = tags;
      }
    }
    
    const coverEl = document.querySelector('.cover img, .note-cover img, [class*="cover"] img, .preview img');
    if (coverEl) {
      result.coverImage = (coverEl as HTMLImageElement).src;
    }
    
    const timeEl = document.querySelector('.publish-time, .time, [class*="time"], [class*="date"]');
    if (timeEl) {
      result.publishTime = (timeEl.textContent || '').trim();
    }
    
    return result;
  });
  
  if (!detail.title && !detail.content) {
    const debugInfo = await page.evaluate((): any => {
      const titleInput = document.querySelector('input.d-text');
      const contentEl = document.querySelector('.tiptap.ProseMirror');
      return {
        hasTitleInput: !!titleInput,
        titleInputValue: titleInput ? (titleInput as HTMLInputElement).value : '',
        hasContentEl: !!contentEl,
        contentElText: contentEl ? (contentEl.textContent || '').substring(0, 100) : '',
        url: window.location.href,
      };
    });
    
    console.error('❌ 无法提取笔记详情，调试信息:', debugInfo);
    return null;
  }
  
  const publicUrl = `https://www.xiaohongshu.com/explore/${noteId}`;
  
  return {
    noteId,
    title: detail.title || '未知标题',
    content: detail.content,
    author: detail.author,
    publishTime: detail.publishTime,
    coverImage: detail.coverImage,
    images: detail.images,
    views: detail.views,
    likes: detail.likes,
    comments: detail.comments,
    favorites: detail.favorites,
    shares: detail.shares,
    tags: detail.tags,
    location: detail.location,
    url: publicUrl,
  };
}

// 发帖指导命令实现
async function readPostingGuidelinesCommandInternal(generatePlan: boolean): Promise<any> {
  const guidelinesPath = join(process.cwd(), 'POSTING_GUIDELINES.md');
  if (!existsSync(guidelinesPath)) {
    return {
      guidelines: '未找到POSTING_GUIDELINES.md文件',
      postingPlan: null,
      recentPerformance: null,
      formattedOutput: '❌ 未找到发帖指导文件',
    };
  }
  
  try {
    const guidelinesContent = readFileSync(guidelinesPath, 'utf-8');
    
    let recentPerformance = '';
    const statsPath = join(process.cwd(), 'cache', 'statistics', 'statistics-latest.json');
    if (existsSync(statsPath)) {
      const statsContent = readFileSync(statsPath, 'utf-8');
      const stats = JSON.parse(statsContent);
      const recentNotes = stats.data.slice(0, 5);
      
      const totalViews = recentNotes.reduce((sum: number, note: any) => sum + parseInt(note.views || '0'), 0);
      const avgViews = totalViews / recentNotes.length;
      const highPerformers = recentNotes.filter((note: any) => parseInt(note.views || '0') > avgViews);
      
      recentPerformance = `最近${recentNotes.length}篇笔记平均观看：${Math.round(avgViews)}次，高表现笔记：${highPerformers.length}篇`;
    }
    
    const postingPlan = generatePlan ? `
📅 下周发帖计划建议：
- 保持每周2-3篇的稳定频率
- 优先选择工作日晚上7-9点发布
- 每篇笔记结尾设置1-2个开放性问题
- 及时回复评论（24小时内）
- 关注高互动笔记的主题方向，继续深耕
    `.trim() : null;
    
    const formattedOutput = `
📝 发帖指导原则摘要：
${guidelinesContent.substring(0, 500)}...

📊 最近表现：${recentPerformance || '暂无数据'}

${postingPlan ? '📅 发帖计划：\n' + postingPlan : ''}
    `.trim();
    
    return {
      guidelines: guidelinesContent,
      postingPlan,
      recentPerformance,
      formattedOutput,
    };
  } catch (error) {
    return {
      guidelines: '读取文件失败',
      postingPlan: null,
      recentPerformance: null,
      formattedOutput: `错误: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// 辅助函数
async function hasValidCookies(): Promise<boolean> {
  try {
    return await checkLoginState();
  } catch (error) {
    return false;
  }
}

async function checkBrowserConnection(): Promise<boolean> {
  try {
    const browser = await launchBrowser(true);
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

async function getLastLoginTime(): Promise<string | null> {
  // 检查cookie文件最后修改时间
  const cookiePath = join(process.cwd(), 'auth', 'cookies.json'); // 假设cookie保存位置
  if (existsSync(cookiePath)) {
    const stats = require('fs').statSync(cookiePath);
    return stats.mtime.toISOString();
  }
  return null;
}

// 创建 MCP 服务器实例
const server = new Server(
  {
    name: 'xhs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// 注册工具列表 - 扩展现有工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // 现有工具
      {
        name: 'search_notes',
        description: '搜索小红书笔记',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: '搜索关键词',
            },
            page: {
              type: 'number',
              description: '页码，默认为1',
              default: 1,
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'get_note_detail',
        description: '获取小红书笔记详情',
        inputSchema: {
          type: 'object',
          properties: {
            noteId: {
              type: 'string',
              description: '笔记ID',
            },
          },
          required: ['noteId'],
        },
      },
      {
        name: 'get_user_info',
        description: '获取小红书用户信息',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: '用户ID',
            },
          },
          required: ['userId'],
        },
      },
      // 新增CLI命令对应的MCP工具
      {
        name: 'xhs_check_login',
        description: '检查小红书登录状态',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'xhs_get_overall_data',
        description: '获取小红书近期笔记运营数据（首页数据、账户统计、粉丝数据）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'xhs_get_note_statistics',
        description: '获取近期笔记统计数据（从笔记管理页面）',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '限制返回的笔记数量，默认为20',
              default: 20,
            },
          },
        },
      },
      {
        name: 'xhs_update_detailed_statistics',
        description: '更新缓存中的详细统计数据（从数据统计分析页面）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'xhs_get_note_detail_by_id',
        description: '根据笔记ID获取笔记详情（包括标题、内容、标签、图片等）',
        inputSchema: {
          type: 'object',
          properties: {
            noteId: {
              type: 'string',
              description: '笔记ID',
            },
          },
          required: ['noteId'],
        },
      },
      {
        name: 'xhs_get_all_notes_detail',
        description: '批量获取所有笔记的详情（基于缓存中的笔记列表）',
        inputSchema: {
          type: 'object',
          properties: {
            refresh: {
              type: 'boolean',
              description: '是否强制刷新缓存，默认为false',
              default: false,
            },
          },
        },
      },
      {
        name: 'xhs_read_posting_guidelines',
        description: '读取发帖指导原则并生成发帖计划建议',
        inputSchema: {
          type: 'object',
          properties: {
            generatePlan: {
              type: 'boolean',
              description: '是否生成下周发帖计划，默认为true',
              default: true,
            },
          },
        },
      },
      {
        name: 'xhs_login_status',
        description: '获取详细的登录状态信息（包括cookie状态、浏览器连接等）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'xhs_login',
        description: '登录小红书账号（会打开浏览器窗口进行登录）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// 处理工具调用 - 扩展现有处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // 现有工具处理
      case 'search_notes':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await searchNotes((args as any).keyword, (args as any).page || 1),
                null,
                2
              ),
            },
          ],
        };

      case 'get_note_detail':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await getNoteDetail((args as any).noteId),
                null,
                2
              ),
            },
          ],
        };

      case 'get_user_info':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                await getUserInfo((args as any).userId),
                null,
                2
              ),
            },
          ],
        };

      // 新增CLI命令对应的工具处理
      case 'xhs_check_login':
        {
          const isLoggedIn = await checkLoginState();
          return {
            content: [
              {
                type: 'text',
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

      case 'xhs_get_overall_data':
        {
          // 检查登录状态
          const isLoggedIn = await checkLoginState();
          if (!isLoggedIn) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 未登录状态。请先确保已登录小红书。',
                },
              ],
              isError: true,
            };
          }

          // 执行CLI命令的核心逻辑
          const result = await withLoggedInPage(async (page: Page) => {
            const homeData = await getHomeData(page);
            const accountData = await getAccountStatistics(page);
            const fanData = await getFanData(page);
            return { homeData, accountData, fanData };
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
              {
                type: 'text',
                text: formatDataForDisplay(result.homeData, result.accountData, result.fanData),
              },
            ],
          };
        }

      case 'xhs_get_note_statistics':
        {
          // 检查登录状态
          const isLoggedIn = await checkLoginState();
          if (!isLoggedIn) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 未登录状态。请先确保已登录小红书。',
                },
              ],
              isError: true,
            };
          }

          const data = await withLoggedInPage(async (page: Page) => {
            return await getRecentNotes(page);
          });

          // 限制返回数量
          const limit = (args as any).limit || 20;
          const limitedData = data.slice(0, limit);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  total: data.length,
                  limit,
                  notes: limitedData,
                }, null, 2),
              },
              {
                type: 'text',
                text: formatStatisticsForDisplay(limitedData),
              },
            ],
          };
        }

      case 'xhs_update_detailed_statistics':
        {
          // 检查登录状态
          const isLoggedIn = await checkLoginState();
          if (!isLoggedIn) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 未登录状态。请先确保已登录小红书。',
                },
              ],
              isError: true,
            };
          }

          // 执行更新逻辑
          const existingData = readLatestCache();
          if (!existingData || existingData.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: '警告: 未找到缓存数据。请先运行 xhs_get_note_statistics 获取近期笔记。',
                },
              ],
              isError: true,
            };
          }

          const detailedStats = await withLoggedInPage(async (page: Page) => {
            return await getDetailedStatistics(page);
          });

          const mergedData = mergeStatistics(existingData, detailedStats);
          saveStatisticsCache(mergedData);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `已更新缓存，合并了 ${detailedStats.length} 条详细统计数据`,
                  totalNotes: mergedData.length,
                  updatedNotes: detailedStats,
                }, null, 2),
              },
            ],
          };
        }

      case 'xhs_get_note_detail_by_id':
        {
          const noteId = (args as any).noteId;
          if (!noteId) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 必须提供 noteId 参数。',
                },
              ],
              isError: true,
            };
          }

          // 检查缓存
          const cachedDetail = readCache(noteId);
          if (cachedDetail) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(cachedDetail, null, 2),
                },
                {
                  type: 'text',
                  text: formatDetailForDisplay(cachedDetail),
                },
              ],
            };
          }

          // 检查登录状态
          const isLoggedIn = await checkLoginState();
          if (!isLoggedIn) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 未登录状态。请先确保已登录小红书。',
                },
              ],
              isError: true,
            };
          }

          const detail = await withLoggedInPage(async (page: Page) => {
            return await getNoteDetailById(page, noteId);
          });

          if (!detail) {
            return {
              content: [
                {
                  type: 'text',
                  text: `错误: 无法获取笔记 ${noteId} 的详情，可能笔记不存在或页面结构已变化。`,
                },
              ],
              isError: true,
            };
          }

          // 保存到缓存
          saveCache(noteId, detail);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(detail, null, 2),
              },
              {
                type: 'text',
                text: formatDetailForDisplay(detail),
              },
            ],
          };
        }

      case 'xhs_get_all_notes_detail':
        {
          // 检查登录状态（如果需要刷新）
          const refresh = (args as any).refresh || false;
          let isLoggedIn = true;
          
          if (refresh) {
            isLoggedIn = await checkLoginState();
            if (!isLoggedIn) {
              return {
                content: [
                  {
                    type: 'text',
                    text: '错误: 未登录状态。请先确保已登录小红书。',
                  },
                ],
                isError: true,
              };
            }
          }

          const statisticsFile = join(process.cwd(), 'cache', 'statistics', 'statistics-latest.json');
          if (!existsSync(statisticsFile)) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 未找到笔记统计数据。请先运行 xhs_get_note_statistics 获取近期笔记。',
                },
              ],
              isError: true,
            };
          }

          const fileContent = readFileSync(statisticsFile, 'utf-8');
          const statistics = JSON.parse(fileContent);
          const notes = statistics.data || [];

          if (notes.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: '错误: 笔记列表为空。',
                },
              ],
              isError: true,
            };
          }

          const noteIds = notes.map((note: any) => note.noteId).filter((id: string) => id);
          
          // 检查缓存状态
          const cachedNotes: NoteDetail[] = [];
          const uncachedIds: string[] = [];
          
          noteIds.forEach((noteId: string) => {
            const cached = readCache(noteId);
            if (cached) {
              cachedNotes.push(cached);
            } else {
              uncachedIds.push(noteId);
            }
          });

          let allNotes = [...cachedNotes];

          // 如果需要刷新或有未缓存的笔记，获取新数据
          if (refresh || uncachedIds.length > 0) {
            const newNotes: NoteDetail[] = [];
            
            for (const noteId of uncachedIds) {
              try {
                const detail = await withLoggedInPage(async (page: Page) => {
                  return await getNoteDetailById(page, noteId);
                });
                
                if (detail) {
                  saveCache(noteId, detail);
                  newNotes.push(detail);
                }
                
                // 避免请求过快
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
                type: 'text',
                text: JSON.stringify({
                  total: allNotes.length,
                  fromCache: cachedNotes.length,
                  newlyFetched: allNotes.length - cachedNotes.length,
                  refresh,
                  notes: allNotes,
                }, null, 2),
              },
              {
                type: 'text',
                text: `📊 批量获取结果:\n总计: ${allNotes.length} 篇笔记\n从缓存读取: ${cachedNotes.length} 篇\n新获取: ${allNotes.length - cachedNotes.length} 篇`,
              },
            ],
          };
        }

      case 'xhs_read_posting_guidelines':
        {
          const generatePlan = (args as any).generatePlan !== false;
          
          // 执行CLI命令的核心逻辑
          const result = await readPostingGuidelinesCommandInternal(generatePlan);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  generatePlan,
                  guidelines: result.guidelines,
                  postingPlan: result.postingPlan,
                  recentPerformance: result.recentPerformance,
                }, null, 2),
              },
              {
                type: 'text',
                text: result.formattedOutput,
              },
            ],
          };
        }

      case 'xhs_login_status':
        {
          const isLoggedIn = await checkLoginState();
          const statusInfo = {
            isLoggedIn,
            hasValidCookies: await hasValidCookies(),
            browserConnection: await checkBrowserConnection(),
            lastLoginTime: await getLastLoginTime(),
            capabilities: {
              canAccessCreatorCenter: isLoggedIn,
              canFetchStatistics: isLoggedIn,
              canGetNoteDetails: isLoggedIn,
            },
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(statusInfo, null, 2),
              },
            ],
          };
        }

      case 'xhs_login':
        {
          try {
            const loginResult = await login();
            return {
              content: [
                {
                  type: 'text',
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
            return {
              content: [
                {
                  type: 'text',
                  text: `登录过程中出错: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
              isError: true,
            };
          }
        }

      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 注册资源列表
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'xhs://notes',
        name: '小红书笔记',
        description: '小红书笔记资源',
        mimeType: 'application/json',
      },
    ],
  };
});

// 处理资源读取
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri.startsWith('xhs://notes/')) {
    const noteId = uri.replace('xhs://notes/', '');
    
    // 先检查缓存
    const cachedDetail = readCache(noteId);
    if (cachedDetail) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(cachedDetail, null, 2),
          },
        ],
      };
    }
    
    // 如果缓存中没有，检查登录状态并获取
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      throw new Error('未登录，无法获取笔记详情。请先使用 xhs_login 工具登录。');
    }
    
    const detail = await withLoggedInPage(async (page: Page) => {
      return await getNoteDetailById(page, noteId);
    });
    
    if (!detail) {
      throw new Error(`无法获取笔记 ${noteId} 的详情`);
    }
    
    // 保存到缓存
    saveCache(noteId, detail);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(detail, null, 2),
        },
      ],
    };
  }

  throw new Error(`未知的资源 URI: ${uri}`);
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('小红书 MCP 服务器已启动');
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

