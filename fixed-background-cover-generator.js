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

/**
 * 美少女颜究社bot固定背景封面生成器
 * 使用完全一致的背景图，确保品牌统一性
 */
class FixedBackgroundCoverGenerator {
    constructor() {
        this.seedreamAI = seedreamAIService;
        this.fixedBackgroundPath = null; // 缓存固定背景路径
    }

    /**
     * 生成固定背景封面
     */
    async generateCover(title, subtitle, outputFilename) {
        console.log(`🎨 开始创建固定背景封面: ${outputFilename}`);
        
        try {
            // 1. 获取或生成固定背景
            console.log(`🤖 获取美少女颜究社bot固定背景...`);
            const backgroundPath = await this.getFixedBackground();
            
            if (!backgroundPath) {
                throw new Error('固定背景获取失败');
            }
            
            console.log(`✅ 固定背景获取成功: ${backgroundPath}`);
            
            // 2. 添加文字内容
            console.log(`🎨 添加文字内容...`);
            const finalCoverPath = await this.addTextToBackground(backgroundPath, title, subtitle, outputFilename);
            
            console.log(`✅ 固定背景封面创建完成: ${finalCoverPath}`);
            return finalCoverPath;
            
        } catch (error) {
            console.error(`❌ 固定背景封面生成失败:`, error.message);
            throw error;
        }
    }

    /**
     * 获取固定背景（生成一次，重复使用）
     */
    async getFixedBackground() {
        // 如果已有缓存的背景，直接使用
        if (this.fixedBackgroundPath) {
            return this.fixedBackgroundPath;
        }

        // 检查是否已存在固定背景文件
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

            // 下载AI生成的图片作为固定背景
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
     * 添加文字到背景图片
     */
    async addTextToBackground(backgroundPath, title, subtitle, outputFilename) {
        try {
            const outputPath = path.join(__dirname, outputFilename);
            
            // 创建SVG文字叠加 - 针对美少女颜究社bot风格优化
            const svgText = this.createMeishaonvSVGText(title, subtitle);
            
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

    /**
     * 创建美少女颜究社bot风格SVG文字
     */
    createMeishaonvSVGText(title, subtitle) {
        const svg = `
            <svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style>
                        .title {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: 72px;
                            font-weight: 700;
                            fill: #E53E3E;
                            text-anchor: middle;
                            dominant-baseline: middle;
                            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
                        }
                        .subtitle {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: 42px;
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
                <rect x="321" y="720" width="600" height="140" class="title-bg"/>
                
                <!-- 标题 -->
                <text x="621" y="790" class="title">${title}</text>
                
                <!-- 副标题背景 -->
                <rect x="371" y="890" width="500" height="100" class="subtitle-bg"/>
                
                <!-- 副标题 -->
                <text x="621" y="940" class="subtitle">${subtitle}</text>
            </svg>
        `;
        
        return svg;
    }
}

/**
 * 批量生成美少女颜究社bot风格封面
 */
async function batchGenerateMeishaonvCovers() {
    const generator = new FixedBackgroundCoverGenerator();
    
    // 定义要生成的封面列表
    const covers = [
        { title: '复古胶片滤镜合集', subtitle: '随手拍都是电影感', filename: 'meishaonv_retro_film.png' },
        { title: '光影诗意氛围感', subtitle: '捕捉生活中的诗意', filename: 'meishaonv_light_shadow.png' },
        { title: '春日限定滤镜', subtitle: '把春天装进镜头里', filename: 'meishaonv_spring.png' },
        { title: '夜景都市氛围', subtitle: '城市夜晚的电影感', filename: 'meishaonv_night_city.png' },
        { title: '秋日温暖滤镜', subtitle: '浓郁秋日的温暖感', filename: 'meishaonv_autumn.png' }
    ];

    console.log(`🚀 开始批量生成美少女颜究社bot风格封面...`);
    
    for (let i = 0; i < covers.length; i++) {
        const cover = covers[i];
        console.log(`\n🎨 生成第 ${i + 1} 个封面: "${cover.title}"`);
        
        try {
            await generator.generateCover(cover.title, cover.subtitle, cover.filename);
            console.log(`✅ 成功生成: ${cover.filename}`);
            
            // 添加间隔，避免API限制
            if (i < covers.length - 1) {
                console.log(`⏳ 等待2秒...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`❌ 生成失败: ${cover.filename} -`, error.message);
        }
    }
    
    console.log(`\n🎉 批量生成完成！`);
}

/**
 * 命令行接口
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('美少女颜究社bot固定背景封面生成器');
        console.log('');
        console.log('用法:');
        console.log('  单个生成: node fixed-background-cover-generator.js <标题> <副标题> <输出文件名>');
        console.log('  批量生成: node fixed-background-cover-generator.js --batch');
        console.log('');
        console.log('示例:');
        console.log('  node fixed-background-cover-generator.js "复古胶片滤镜" "随手拍都是电影感" "retro_film.png"');
        console.log('  node fixed-background-cover-generator.js --batch');
        process.exit(1);
    }
    
    if (args[0] === '--batch') {
        await batchGenerateMeishaonvCovers();
        return;
    }
    
    if (args.length < 3) {
        console.log('错误: 需要3个参数（标题、副标题、输出文件名）');
        process.exit(1);
    }
    
    const [title, subtitle, outputFilename] = args;
    
    console.log(`🚀 创建美少女颜究社bot固定背景封面...`);
    
    try {
        const generator = new FixedBackgroundCoverGenerator();
        const coverPath = await generator.generateCover(title, subtitle, outputFilename);
        
        console.log(`\n🎉 美少女颜究社bot固定背景封面生成成功！`);
        console.log(`📁 文件保存路径: ${coverPath}`);
        
    } catch (error) {
        console.error(`\n❌ 生成失败:`, error.message);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { FixedBackgroundCoverGenerator };