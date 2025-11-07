// src/core/writePost.ts
// 核心功能：添加 post 到队列

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, extname } from 'path';
import { homedir } from 'os';
import { POST_QUEUE_DIR } from '../config.js';
import { generateCover } from '../Illustrate/generateCover.js';




// 为指定的 post 生成封面图片
export async function generateCoverForPost(queueFilename: string): Promise<boolean> {
    const filename = queueFilename.endsWith('.json') ? queueFilename : `${queueFilename}.json`;
    const queueFilePath = join(POST_QUEUE_DIR, filename);
    if (!existsSync(queueFilePath)) {
        throw new Error(`发帖队列文件不存在: ${filename}`);
    }
    // 读取 post 信息
    const content = readFileSync(queueFilePath, 'utf-8');
    const params = JSON.parse(content) as { title?: string; content: string };
    if (!params.title) {
        throw new Error(`Post ${filename} 没有标题，无法生成封面`);
    }
    // 获取 post 名称和图片目录
    const postName = getPostNameFromFilename(filename);
    const postImageDir = getPostImageDir(postName);
    // 生成封面图片
    try {
        console.error(`🎨 正在为 post "${postName}" 生成封面图片...`);
        const coverPaths = await generateCover(params.title, postImageDir, '1', true);
        if (coverPaths && coverPaths.length > 0) {
            // 重命名为 0.png
            const targetPath = join(postImageDir, `0.png`);
            copyFileSync(coverPaths[0], targetPath);
            console.error(`✅ 封面图片已生成: ${targetPath}`);
            return true;
        }
        throw new Error('封面图片生成失败：未返回图片路径');
    } catch (error) {
        console.error('❌ 封面图片生成失败:', error instanceof Error ? error.message : error);
        throw error;
    }
}


// 获取post对应的图片目录
function getPostImageDir(postName: string): string {
    const postImagesDir = join(homedir(), '.xhs-cli', 'post', 'images', postName);
    if (!existsSync(postImagesDir)) {
        mkdirSync(postImagesDir, { recursive: true });
    }
    return postImagesDir;
}


// 从文件名中提取post名称（去掉.json后缀）
function getPostNameFromFilename(filename: string): string {
    return filename.replace(/\.json$/, '');
}