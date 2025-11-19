// 求助文章完整生成器 - 一键生成固定内容文章和封面
// 包含文章模板和封面图片生成

import { HelpArticleTemplate } from './help-article-template.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HelpArticleCompleteGenerator {
    constructor() {
        this.articleTemplate = new HelpArticleTemplate();
    }
    
    /**
     * 一键生成完整的求助文章（文章+封面）
     * 内容完全固定，每次生成都是一模一样的
     */
    async generateCompleteHelpArticle() {
        try {
            console.log('🚀 开始生成完整求助文章...');
            
            // 1. 生成固定内容的文章
            console.log('📄 生成固定内容文章...');
            const article = await this.articleTemplate.generateHelpArticle();
            
            // 2. 生成封面图片
            console.log('🎨 生成封面图片...');
            const coverFilename = `help_article_cover_${Date.now()}.png`;
            
            // 使用子进程调用标题专用封面生成器（只传文件名，不传完整路径）
            await this.generateCoverWithChildProcess(article.title, coverFilename);
            
            // 3. 更新文章中的封面图片文件名
            article.coverImage = coverFilename;
            
            // 4. 保存完整文章信息
            const articleFilename = `complete_help_article_${Date.now()}.json`;
            const articlePath = join(__dirname, articleFilename);
            
            await fs.writeFile(articlePath, JSON.stringify(article, null, 2), 'utf-8');
            
            console.log('\n✅ 完整求助文章生成成功！');
            console.log('=====================================');
            console.log(`📄 文章文件: ${articleFilename}`);
            console.log(`🎨 封面图片: ${coverFilename}`);
            console.log(`📋 标题: ${article.title}`);
            console.log(`🏷️ 标签数量: ${article.tags.length}`);
            console.log(`⏰ 生成时间: ${new Date().toLocaleString()}`);
            
            return {
                article,
                articlePath,
                coverPath: join(__dirname, coverFilename),
                articleFilename,
                coverFilename
            };
            
        } catch (error) {
            console.error('❌ 生成完整求助文章时出错:', error);
            throw error;
        }
    }
    
    /**
     * 使用子进程生成封面图片
     */
    async generateCoverWithChildProcess(title, outputPath) {
        return new Promise((resolve, reject) => {
            const process = spawn('node', ['title-only-cover-generator.js', title, outputPath], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`封面生成失败，退出码: ${code}`));
                }
            });
            
            process.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    /**
     * 获取小红书风格的完整内容
     */
    getXiaohongshuFormat(article) {
        const tagsString = article.tags.join(' ');
        
        return `${article.title}

${article.content}

${tagsString}`;
    }
    
    /**
     * 批量生成多个相同的求助文章（用于测试或批量发布）
     * @param {number} count - 要生成的文章数量
     */
    async batchGenerateArticles(count = 1) {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            console.log(`\n📦 生成第 ${i + 1}/${count} 篇文章...`);
            const result = await this.generateCompleteHelpArticle();
            results.push(result);
        }
        
        console.log(`\n✅ 批量生成完成！共生成 ${results.length} 篇完全相同的求助文章。`);
        return results;
    }
    
    /**
     * 验证生成的文章是否完全一致
     */
    async validateArticlesConsistency(articlePaths) {
        const articles = [];
        
        // 读取所有文章
        for (const path of articlePaths) {
            const content = await fs.readFile(path, 'utf-8');
            articles.push(JSON.parse(content));
        }
        
        // 验证标题一致性
        const titles = articles.map(article => article.title);
        const allTitlesSame = titles.every(title => title === titles[0]);
        
        // 验证内容一致性
        const contents = articles.map(article => article.content);
        const allContentsSame = contents.every(content => content === contents[0]);
        
        // 验证标签一致性
        const tags = articles.map(article => JSON.stringify(article.tags));
        const allTagsSame = tags.every(tag => tag === tags[0]);
        
        console.log('\n🔍 文章一致性验证结果:');
        console.log('=====================================');
        console.log(`标题一致性: ${allTitlesSame ? '✅' : '❌'}`);
        console.log(`内容一致性: ${allContentsSame ? '✅' : '❌'}`);
        console.log(`标签一致性: ${allTagsSame ? '✅' : '❌'}`);
        
        return {
            allTitlesSame,
            allContentsSame,
            allTagsSame,
            allConsistent: allTitlesSame && allContentsSame && allTagsSame
        };
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        const generator = new HelpArticleCompleteGenerator();
        
        // 生成一篇完整的求助文章
        const result = await generator.generateCompleteHelpArticle();
        
        // 输出生成的小红书风格内容
        console.log('\n📱 小红书风格内容:');
        console.log('=====================================');
        console.log(generator.getXiaohongshuFormat(result.article));
        
        console.log('\n💡 使用说明:');
        console.log('=====================================');
        console.log('1. 文章内容完全固定，每次生成都一模一样');
        console.log('2. 封面图片使用标题专用生成器创建');
        console.log('3. 所有标签都是固定的，包含必须的 #美少女颜究社bot');
        console.log('4. 可以批量生成多篇文章用于测试或发布');
        console.log('5. 支持一致性验证功能');
        
    } catch (error) {
        console.error('❌ 执行出错:', error);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { HelpArticleCompleteGenerator };