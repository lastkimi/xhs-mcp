// 求助类文章模板生成器 - 固定内容版本
// 内容完全固定，每次生成都是一模一样的

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HelpArticleTemplate {
    constructor() {
        // 固定标题
        this.fixedTitle = "【求助】新手化妆怎么开始呀？求捞捞！🥹";
        
        // 固定正文内容
        this.fixedContent = `完全懵圈的新人想学化妆，对化妆品了解度为0……网上攻略看得眼花缭乱，想先问问姐妹们这几个问题：

1️⃣ 一套最基础的化妆品需要哪些呀？（求列个清单！）

2️⃣ 有没有适合新手的平价好用款推荐？性价比高高的那种～

3️⃣ 新手学化妆有啥一定要注意的雷区吗？

谢谢各位美少女！`;
        
        // 固定标签（包含必须的#美少女颜究社bot + 9个热门相关话题标签）
        this.fixedTags = [
            "#美少女颜究社bot",           // 必须标签
            "#新手化妆技巧",              // 热门话题
            "#平价好物",                  // 热门话题
            "#今日妆容",                  // 热门话题
            "#我的护肤日常",              // 热门话题
            "#化妆玄学",                  // 热门话题
            "#平替",                      // 热门话题
            "#精简护肤",                  // 热门话题
            "#懒人护肤",                  // 热门话题
            "#疗愈系"                     // 热门话题
        ];
        
        // 固定封面图片文件名
        this.fixedCoverImage = "help_article_cover.png";
    }
    
    /**
     * 生成固定内容的求助文章
     * 内容完全一模一样，不做任何修改
     */
    async generateHelpArticle() {
        const article = {
            title: this.fixedTitle,
            content: this.fixedContent,
            tags: this.fixedTags,
            coverImage: this.fixedCoverImage,
            timestamp: new Date().toISOString(),
            type: "help_article"
        };
        
        return article;
    }
    
    /**
     * 保存文章到文件
     */
    async saveArticle(article, filename = null) {
        const outputFilename = filename || `help_article_${Date.now()}.json`;
        const outputPath = join(__dirname, outputFilename);
        
        await fs.writeFile(outputPath, JSON.stringify(article, null, 2), 'utf-8');
        console.log(`✅ 求助文章已保存到: ${outputFilename}`);
        
        return outputPath;
    }
    
    /**
     * 生成格式化的小红书风格文章内容
     */
    getFormattedContent() {
        const tagsString = this.fixedTags.join(' ');
        
        return `${this.fixedTitle}

${this.fixedContent}

${tagsString}`;
    }
    
    /**
     * 获取文章摘要信息
     */
    getArticleSummary() {
        return {
            title: this.fixedTitle,
            tagCount: this.fixedTags.length,
            contentLength: this.fixedContent.length,
            coverImage: this.fixedCoverImage,
            tags: this.fixedTags
        };
    }
}

/**
 * 主函数 - 生成固定内容的求助文章
 */
async function main() {
    try {
        const template = new HelpArticleTemplate();
        
        // 生成固定内容的文章
        const article = await template.generateHelpArticle();
        
        // 保存文章
        await template.saveArticle(article);
        
        // 输出文章信息
        console.log('\n📄 求助文章模板已生成:');
        console.log('=====================================');
        console.log(`标题: ${article.title}`);
        console.log(`标签数量: ${article.tags.length}`);
        console.log(`内容长度: ${article.content.length} 字符`);
        console.log(`封面图片: ${article.coverImage}`);
        console.log('\n标签列表:');
        article.tags.forEach((tag, index) => {
            console.log(`${index + 1}. ${tag}`);
        });
        
        console.log('\n📱 小红书风格格式:');
        console.log('=====================================');
        console.log(template.getFormattedContent());
        
        console.log('\n✅ 文章生成完成！内容完全固定，每次生成都一模一样。');
        
    } catch (error) {
        console.error('❌ 生成文章时出错:', error);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { HelpArticleTemplate };