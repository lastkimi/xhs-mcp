import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { seedreamAIService } from './src/services/seedreamAI.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 美少女颜究社bot固定背景提示词 - 用于全部封面的统一背景
const FIXED_BACKGROUND_PROMPT = `Pixel art style, dimensions: 1242×1660 pixels, aspect ratio: 3:4. Features a soft pink gradient background with a medium-sized pixel-style speech bubble positioned centrally, proportionally sized to create balanced white space around it. The main title "美少女颜究社bot" in a retro pixel font is placed prominently at the top. A cute pixel art cat sits at the bottom corner of the dialog box. The scene is surrounded by scattered decorative pixel art elements: small flowers, hearts, and stars. The dialog box is smaller and more proportionate to the overall composition, creating a harmonious layout with adequate breathing room. Kawaii aesthetic, retro video game style, clean and visually balanced arrangement.`;

// 即梦AI配置
const SEEDREAM_CONFIG = {
    model: "seedream-v1",
    size: "1242x1660",
    quality: "high",
    style: "pixel_art",
    n: 1
};

// 字体配置常量
const FONT_CONFIG = {
    title: {
        maxFontSize: 72,
        minFontSize: 36,
        maxWidth: 600,
        maxLines: 2,
        lineHeight: 1.2
    },
    subtitle: {
        maxFontSize: 42,
        minFontSize: 24,
        maxWidth: 500,
        maxLines: 3,
        lineHeight: 1.3
    }
};

/**
 * 美少女颜究社bot固定背景封面生成器（改进版）
 * 支持长文本自动缩放、换行和多行显示
 */
class ImprovedFixedBackgroundCoverGenerator {
    constructor() {
        this.seedreamAI = seedreamAIService;
        this.fixedBackgroundPath = null;
    }

    /**
     * 生成固定背景封面（支持长文本）
     */
    async generateCover(title, subtitle, outputFilename) {
        console.log(`🎨 开始创建改进版固定背景封面: ${outputFilename}`);
        
        try {
            // 获取或生成固定背景
            console.log(`🤖 获取美少女颜究社bot固定背景...`);
            const backgroundPath = await this.getFixedBackground();
            
            if (!backgroundPath) {
                throw new Error('固定背景获取失败');
            }
            
            console.log(`✅ 固定背景获取成功: ${backgroundPath}`);
            
            // 添加文字内容（支持长文本）
            console.log(`🎨 添加文字内容（支持长文本）...`);
            const finalPath = await this.addTextToBackgroundWithWrapping(backgroundPath, title, subtitle, outputFilename);
            
            console.log(`✅ 改进版固定背景封面创建完成: ${finalPath}`);
            return finalPath;
            
        } catch (error) {
            console.error(`封面生成失败:`, error.message);
            throw error;
        }
    }

    /**
     * 获取固定背景（带缓存）
     */
    async getFixedBackground() {
        const fixedBgPath = path.join(__dirname, 'fixed_background_meishaonv.png');
        
        try {
            await fs.access(fixedBgPath);
            console.log(`📁 使用已存在的固定背景: ${fixedBgPath}`);
            this.fixedBackgroundPath = fixedBgPath;
            return fixedBgPath;
        } catch {
            // 文件不存在，需要生成
            console.log(`🎨 生成新的美少女颜究社bot固定背景...`);
            return await this.generateFixedBackground(fixedBgPath);
        }
    }

    /**
     * 生成固定背景（只生成一次）
     */
    async generateFixedBackground(outputPath) {
        try {
            const options = {
                ...SEEDREAM_CONFIG,
                prompt: FIXED_BACKGROUND_PROMPT,
                title: "美少女颜究社bot",
                subtitle: "固定背景模板"
            };

            const imageUrls = await this.seedreamAI.generateCover(options);
            
            if (!imageUrls || imageUrls.length === 0) {
                throw new Error('即梦AI未返回图片URL');
            }

            await this.downloadImage(imageUrls[0], outputPath);
            
            console.log(`✅ 美少女颜究社bot固定背景生成成功: ${outputPath}`);
            this.fixedBackgroundPath = outputPath;
            return outputPath;
            
        } catch (error) {
            console.error(`固定背景生成失败:`, error.message);
            throw error;
        }
    }

    /**
     * 下载图片
     */
    async downloadImage(url, outputPath) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`下载图片失败: ${response.status} ${response.statusText}`);
            }
            
            const buffer = await response.arrayBuffer();
            await fs.writeFile(outputPath, Buffer.from(buffer));
            
            console.log(`✅ 图片下载成功: ${outputPath}`);
            
        } catch (error) {
            console.error(`图片下载失败:`, error.message);
            throw error;
        }
    }

    /**
     * 计算文本宽度（近似值）
     */
    calculateTextWidth(text, fontSize) {
        // 中文字符宽度约为字体大小的1.1倍，英文字符约为0.6倍
        let width = 0;
        for (let char of text) {
            if (char.match(/[\u4e00-\u9fa5]/)) {
                width += fontSize * 1.1;
            } else {
                width += fontSize * 0.6;
            }
        }
        return width;
    }

    /**
     * 智能分割文本为多行
     */
    splitTextIntoLines(text, maxWidth, fontSize, maxLines) {
        const words = text.split('');
        const lines = [];
        let currentLine = '';
        
        for (let word of words) {
            const testLine = currentLine + word;
            const testWidth = this.calculateTextWidth(testLine, fontSize);
            
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    if (lines.length >= maxLines) break;
                }
                currentLine = word;
            }
        }
        
        if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * 计算最佳字体大小
     */
    calculateOptimalFontSize(text, maxWidth, maxLines, config) {
        let fontSize = config.maxFontSize;
        
        while (fontSize >= config.minFontSize) {
            const lines = this.splitTextIntoLines(text, maxWidth, fontSize, maxLines);
            
            // 检查是否所有行都能适应
            let allLinesFit = true;
            for (let line of lines) {
                if (this.calculateTextWidth(line, fontSize) > maxWidth) {
                    allLinesFit = false;
                    break;
                }
            }
            
            if (allLinesFit && lines.length <= maxLines) {
                return { fontSize, lines };
            }
            
            fontSize -= 2;
        }
        
        // 如果还是不行，强制分割并返回最小字体
        const lines = this.splitTextIntoLines(text, maxWidth, config.minFontSize, maxLines);
        return { fontSize: config.minFontSize, lines };
    }

    /**
     * 创建支持多行和自动缩放的SVG文字
     */
    createResponsiveSVGText(title, subtitle) {
        // 计算标题
        const titleResult = this.calculateOptimalFontSize(
            title, 
            FONT_CONFIG.title.maxWidth, 
            FONT_CONFIG.title.maxLines, 
            FONT_CONFIG.title
        );
        
        // 计算副标题
        const subtitleResult = this.calculateOptimalFontSize(
            subtitle, 
            FONT_CONFIG.subtitle.maxWidth, 
            FONT_CONFIG.subtitle.maxLines, 
            FONT_CONFIG.subtitle
        );
        
        // 计算总行数和位置
        const totalLines = titleResult.lines.length + subtitleResult.lines.length;
        const lineHeight = Math.max(titleResult.fontSize, subtitleResult.fontSize) * 1.2;
        const totalHeight = totalLines * lineHeight + (titleResult.lines.length > 0 && subtitleResult.lines.length > 0 ? lineHeight * 0.5 : 0);
        const startY = (1660 - totalHeight) / 2;
        
        let yPosition = startY;
        let titleTspans = '';
        let subtitleTspans = '';
        
        // 生成标题tspan元素
        for (let i = 0; i < titleResult.lines.length; i++) {
            const lineY = yPosition + (i * lineHeight) + (titleResult.fontSize * 0.35);
            titleTspans += `<tspan x="621" y="${lineY}" text-anchor="middle">${titleResult.lines[i]}</tspan>`;
            if (i < titleResult.lines.length - 1) titleTspans += '\n';
        }
        
        yPosition += titleResult.lines.length * lineHeight;
        if (titleResult.lines.length > 0 && subtitleResult.lines.length > 0) {
            yPosition += lineHeight * 0.5; // 标题和副标题之间的间距
        }
        
        // 生成副标题tspan元素
        for (let i = 0; i < subtitleResult.lines.length; i++) {
            const lineY = yPosition + (i * lineHeight * 0.8) + (subtitleResult.fontSize * 0.35);
            subtitleTspans += `<tspan x="621" y="${lineY}" text-anchor="middle">${subtitleResult.lines[i]}</tspan>`;
            if (i < subtitleResult.lines.length - 1) subtitleTspans += '\n';
        }
        
        // 计算背景框尺寸
        const titleBgHeight = titleResult.lines.length * lineHeight + 40;
        const subtitleBgHeight = subtitleResult.lines.length * lineHeight * 0.8 + 30;
        
        const svg = `
            <svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style>
                        .title-text {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: ${titleResult.fontSize}px;
                            font-weight: 700;
                            fill: #E53E3E;
                            text-anchor: middle;
                            dominant-baseline: middle;
                            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
                        }
                        .subtitle-text {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: ${subtitleResult.fontSize}px;
                            font-weight: 600;
                            fill: #2D3748;
                            text-anchor: middle;
                            dominant-baseline: middle;
                            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.2));
                        }
                        .title-bg {
                            fill: rgba(255, 255, 255, 0.98);
                            rx: 25;
                            ry: 25;
                            filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.15));
                        }
                        .subtitle-bg {
                            fill: rgba(255, 255, 255, 0.95);
                            rx: 20;
                            ry: 20;
                            filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1));
                        }
                    </style>
                </defs>
                
                <!-- 标题背景 -->
                <rect x="321" y="${startY - 20}" width="600" height="${titleBgHeight}" class="title-bg"/>
                
                <!-- 标题文字（多行） -->
                <text class="title-text">
                    ${titleTspans}
                </text>
                
                <!-- 副标题背景 -->
                ${subtitleResult.lines.length > 0 ? `
                <rect x="371" y="${yPosition - 15}" width="500" height="${subtitleBgHeight}" class="subtitle-bg"/>
                ` : ''}
                
                <!-- 副标题文字（多行） -->
                ${subtitleResult.lines.length > 0 ? `
                <text class="subtitle-text">
                    ${subtitleTspans}
                </text>
                ` : ''}
            </svg>
        `;
        
        return svg;
    }

    /**
     * 添加文字到背景图片（支持长文本换行）
     */
    async addTextToBackgroundWithWrapping(backgroundPath, title, subtitle, outputFilename) {
        try {
            const outputPath = path.join(__dirname, outputFilename);
            
            // 创建响应式SVG文字
            const svgText = this.createResponsiveSVGText(title, subtitle);
            
            // 使用Sharp合成图片
            await sharp(backgroundPath)
                .composite([{
                    input: Buffer.from(svgText),
                    blend: 'over'
                }])
                .toFile(outputPath);
            
            return outputPath;
            
        } catch (error) {
            console.error(`文字叠加失败:`, error.message);
            throw error;
        }
    }
}

/**
 * 批量生成美少女颜究社bot风格封面（测试长文本）
 */
async function batchGenerateLongTextCovers() {
    const generator = new ImprovedFixedBackgroundCoverGenerator();
    
    const testCases = [
        {
            title: "这是一个超级长的标题需要测试换行功能",
            subtitle: "副标题也很长需要看看怎么处理换行显示效果",
            filename: "long_text_test_1.png"
        },
        {
            title: "短标题",
            subtitle: "这是一个非常长的副标题，包含了很多文字，需要测试多行显示的效果和字体缩放功能",
            filename: "long_text_test_2.png"
        },
        {
            title: "春日限定胶片滤镜合集分享",
            subtitle: "复古感 · 氛围感 · 电影感",
            filename: "long_text_test_3.png"
        },
        {
            title: "夜景都市氛围感调色教程",
            subtitle: "冷色调 · 高级感 · 赛博朋克",
            filename: "long_text_test_4.png"
        }
    ];
    
    console.log(`🚀 开始测试长文本封面生成...`);
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n📝 测试案例 ${i + 1}:`);
        console.log(`   标题: ${testCase.title}`);
        console.log(`   副标题: ${testCase.subtitle}`);
        
        try {
            await generator.generateCover(testCase.title, testCase.subtitle, testCase.filename);
            console.log(`✅ 成功生成: ${testCase.filename}`);
        } catch (error) {
            console.error(`❌ 生成失败:`, error.message);
        }
        
        // 等待2秒避免API限制
        if (i < testCases.length - 1) {
            console.log(`⏳ 等待2秒...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`\n🎉 长文本测试完成！`);
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('美少女颜究社bot改进版固定背景封面生成器');
        console.log('支持长文本自动缩放、换行和多行显示');
        console.log('');
        console.log('用法:');
        console.log('  单个生成: node fixed-background-cover-generator-improved.js <标题> <副标题> <输出文件名>');
        console.log('  批量测试: node fixed-background-cover-generator-improved.js --test-long-text');
        console.log('');
        console.log('示例:');
        console.log('  node fixed-background-cover-generator-improved.js "春日限定" "胶片滤镜合集" "spring_filters.png"');
        console.log('  node fixed-background-cover-generator-improved.js --test-long-text');
        return;
    }
    
    if (args[0] === '--test-long-text') {
        await batchGenerateLongTextCovers();
        return;
    }
    
    if (args.length < 3) {
        console.error('错误: 需要3个参数（标题、副标题、输出文件名）');
        process.exit(1);
    }
    
    const [title, subtitle, outputFilename] = args;
    const generator = new ImprovedFixedBackgroundCoverGenerator();
    
    try {
        console.log(`🚀 创建美少女颜究社bot改进版固定背景封面...`);
        await generator.generateCover(title, subtitle, outputFilename);
        console.log(`\n🎉 改进版封面生成成功！`);
        console.log(`📁 文件保存路径: ${path.join(__dirname, outputFilename)}`);
    } catch (error) {
        console.error(`生成失败:`, error.message);
        process.exit(1);
    }
}

// 运行主函数
main().catch(error => {
    console.error('程序运行错误:', error);
    process.exit(1);
});