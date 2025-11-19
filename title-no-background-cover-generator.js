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

// 字体配置常量（仅标题，无背景）
const FONT_CONFIG = {
    title: {
        maxFontSize: 80,
        minFontSize: 36,
        maxWidth: 900,
        maxLines: 3,
        lineHeight: 1.2
    }
};

/**
 * 美少女颜究社bot固定背景封面生成器（标题无背景版）
 * 只显示主标题，标题底部无背景框，背景图片永不修改
 */
class TitleNoBackgroundCoverGenerator {
    constructor() {
        this.seedreamAI = seedreamAIService;
        this.fixedBackgroundPath = null;
    }

    /**
     * 生成固定背景封面（标题无背景）
     */
    async generateCover(title, outputFilename) {
        console.log(`🎨 开始创建标题无背景封面: ${outputFilename}`);
        
        try {
            // 获取或生成固定背景（只生成一次）
            console.log(`🤖 获取美少女颜究社bot固定背景...`);
            const backgroundPath = await this.getFixedBackground();
            
            if (!backgroundPath) {
                throw new Error('固定背景获取失败');
            }
            
            console.log(`✅ 固定背景获取成功: ${backgroundPath}`);
            console.log(`📋 背景图片将永不修改，仅添加标题文字（无背景框）`);
            
            // 添加标题文字（无背景框）
            console.log(`🎨 添加标题文字（无背景框）...`);
            const finalPath = await this.addTitleNoBackgroundToBackground(backgroundPath, title, outputFilename);
            
            console.log(`✅ 标题无背景封面创建完成: ${finalPath}`);
            return finalPath;
            
        } catch (error) {
            console.error(`封面生成失败:`, error.message);
            throw error;
        }
    }

    /**
     * 获取固定背景（带缓存，永不重新生成）
     */
    async getFixedBackground() {
        const fixedBgPath = path.join(__dirname, 'fixed_background_meishaonv.png');
        
        try {
            await fs.access(fixedBgPath);
            console.log(`📁 使用已存在的固定背景: ${fixedBgPath}`);
            console.log(`🔒 背景图片已锁定，不会重新生成或修改`);
            this.fixedBackgroundPath = fixedBgPath;
            return fixedBgPath;
        } catch {
            // 如果背景不存在，生成一次后永久使用
            console.log(`🎨 首次生成美少女颜究社bot固定背景...`);
            console.log(`⚠️  这是唯一一次生成，之后将永久使用此背景`);
            return await this.generateFixedBackground(fixedBgPath);
        }
    }

    /**
     * 生成固定背景（只生成一次，永久使用）
     */
    async generateFixedBackground(outputPath) {
        try {
            const options = {
                ...SEEDREAM_CONFIG,
                prompt: FIXED_BACKGROUND_PROMPT,
                title: "美少女颜究社bot",
                subtitle: "固定背景模板" // 背景生成时的副标题，实际使用时不会显示
            };

            const imageUrls = await this.seedreamAI.generateCover(options);
            
            if (!imageUrls || imageUrls.length === 0) {
                throw new Error('即梦AI未返回图片URL');
            }

            await this.downloadImage(imageUrls[0], outputPath);
            
            console.log(`✅ 固定背景生成成功: ${outputPath}`);
            console.log(`🔒 此背景将永久使用，不会再次生成`);
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
     * 创建标题无背景的SVG文字
     */
    createTitleNoBackgroundSVGText(title) {
        // 计算标题
        const titleResult = this.calculateOptimalFontSize(
            title, 
            FONT_CONFIG.title.maxWidth, 
            FONT_CONFIG.title.maxLines, 
            FONT_CONFIG.title
        );
        
        // 计算垂直居中位置
        const totalHeight = titleResult.lines.length * FONT_CONFIG.title.lineHeight * titleResult.fontSize;
        const startY = (1660 - totalHeight) / 2 + (titleResult.fontSize * 0.5);
        
        let titleTspans = '';
        
        // 生成标题tspan元素
        for (let i = 0; i < titleResult.lines.length; i++) {
            const lineY = startY + (i * FONT_CONFIG.title.lineHeight * titleResult.fontSize);
            titleTspans += `<tspan x="621" y="${lineY}" text-anchor="middle">${titleResult.lines[i]}</tspan>`;
            if (i < titleResult.lines.length - 1) titleTspans += '\n';
        }
        
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
                    </style>
                </defs>
                
                <!-- 标题文字（无背景框） -->
                <text class="title-text">
                    ${titleTspans}
                </text>
            </svg>
        `;
        
        return svg;
    }

    /**
     * 添加标题文字到背景图片（无背景框）
     */
    async addTitleNoBackgroundToBackground(backgroundPath, title, outputFilename) {
        try {
            const outputPath = path.join(__dirname, outputFilename);
            
            // 创建标题无背景SVG文字
            const svgText = this.createTitleNoBackgroundSVGText(title);
            
            // 使用Sharp合成图片（仅添加文字，不修改背景，无背景框）
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
 * 批量生成标题无背景封面（测试不同长度标题）
 */
async function batchGenerateTitleNoBackgroundCovers() {
    const generator = new TitleNoBackgroundCoverGenerator();
    
    const testCases = [
        {
            title: "春日限定",
            filename: "title_no_bg_spring.png"
        },
        {
            title: "复古胶片滤镜合集",
            filename: "title_no_bg_retro_film.png"
        },
        {
            title: "这是一个超级长的标题需要测试换行功能和字体缩放效果",
            filename: "title_no_bg_long_text.png"
        },
        {
            title: "夜景都市氛围感调色",
            filename: "title_no_bg_night_city.png"
        },
        {
            title: "冷色调高级感赛博朋克风格夜景调色教程分享",
            filename: "title_no_bg_cyberpunk.png"
        }
    ];
    
    console.log(`🚀 开始测试标题无背景封面生成...`);
    console.log(`🔒 所有封面将使用完全相同的背景图片`);
    console.log(`🎨 标题文字底部无背景框，直接显示在背景上`);
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n📝 测试案例 ${i + 1}:`);
        console.log(`   标题: ${testCase.title}`);
        console.log(`   长度: ${testCase.title.length} 个字符`);
        
        try {
            await generator.generateCover(testCase.title, testCase.filename);
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
    
    console.log(`\n🎉 标题无背景封面测试完成！`);
    console.log(`🔒 所有封面使用相同背景: fixed_background_meishaonv.png`);
    console.log(`🎨 所有标题文字无背景框，直接显示在背景上`);
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('美少女颜究社bot标题无背景封面生成器');
        console.log('只显示主标题，标题底部无背景框，背景图片永不修改');
        console.log('');
        console.log('用法:');
        console.log('  单个生成: node title-no-background-cover-generator.js <标题> <输出文件名>');
        console.log('  批量测试: node title-no-background-cover-generator.js --test-title-no-bg');
        console.log('');
        console.log('示例:');
        console.log('  node title-no-background-cover-generator.js "春日限定" "spring_title_no_bg.png"');
        console.log('  node title-no-background-cover-generator.js --test-title-no-bg');
        return;
    }
    
    if (args[0] === '--test-title-no-bg') {
        await batchGenerateTitleNoBackgroundCovers();
        return;
    }
    
    if (args.length < 2) {
        console.error('错误: 需要2个参数（标题、输出文件名）');
        process.exit(1);
    }
    
    const [title, outputFilename] = args;
    const generator = new TitleNoBackgroundCoverGenerator();
    
    try {
        console.log(`🚀 创建美少女颜究社bot标题无背景封面...`);
        console.log(`🔒 背景图片将保持不变，标题文字无背景框`);
        await generator.generateCover(title, outputFilename);
        console.log(`\n🎉 标题无背景封面生成成功！`);
        console.log(`📁 文件保存路径: ${path.join(__dirname, outputFilename)}`);
        console.log(`🔒 背景图片: fixed_background_meishaonv.png（未修改）`);
        console.log(`🎨 标题文字: 无背景框，直接显示`);
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