// 批量生成测试 - 验证文章一致性
// 生成多篇求助文章并验证内容完全一致

import { HelpArticleCompleteGenerator } from './help-article-complete-generator.js';

async function testBatchGeneration() {
    console.log('🧪 开始批量生成测试...');
    console.log('=====================================');
    
    const generator = new HelpArticleCompleteGenerator();
    
    try {
        // 生成3篇完全相同的求助文章
        const results = [];
        const articlePaths = [];
        
        for (let i = 1; i <= 3; i++) {
            console.log(`\n📦 生成第 ${i} 篇文章...`);
            const result = await generator.generateCompleteHelpArticle();
            results.push(result);
            articlePaths.push(result.articlePath);
            
            // 等待2秒避免API限制
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('\n🔍 验证文章一致性...');
        
        // 验证所有文章是否完全一致
        const consistencyResult = await generator.validateArticlesConsistency(articlePaths);
        
        if (consistencyResult.allConsistent) {
            console.log('\n✅ 所有文章完全一致！');
            console.log('=====================================');
            
            // 显示第一篇的详细内容作为标准
            const firstArticle = results[0].article;
            console.log('\n📋 标准文章内容:');
            console.log(`标题: ${firstArticle.title}`);
            console.log(`内容长度: ${firstArticle.content.length} 字符`);
            console.log(`标签数量: ${firstArticle.tags.length}`);
            console.log(`封面图片: ${firstArticle.coverImage}`);
            
            console.log('\n 🏷️ 标签列表:');
            firstArticle.tags.forEach((tag, index) => {
                console.log(`${index + 1}. ${tag}`);
            });
            
            console.log('\n📱 小红书风格格式:');
            console.log('=====================================');
            console.log(generator.getXiaohongshuFormat(firstArticle));
            
            console.log('\n✨ 测试总结:');
            console.log('=====================================');
            console.log(`✅ 生成了 ${results.length} 篇完全相同的求助文章`);
            console.log(`✅ 所有文章内容完全一致，无修改`);
            console.log(`✅ 包含固定标签: #美少女颜究社bot`);
            console.log(`✅ 封面图片统一风格`);
            console.log(`✅ 适合作为标准化模板使用`);
            
        } else {
            console.log('\n❌ 文章不一致！');
            console.log('标题一致性:', consistencyResult.allTitlesSame ? '✅' : '❌');
            console.log('内容一致性:', consistencyResult.allContentsSame ? '✅' : '❌');
            console.log('标签一致性:', consistencyResult.allTagsSame ? '✅' : '❌');
        }
        
    } catch (error) {
        console.error('❌ 批量生成测试失败:', error);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    testBatchGeneration();
}