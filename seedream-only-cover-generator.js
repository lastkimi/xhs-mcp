import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { seedreamAIService } from './src/services/seedreamAI.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 统一像素风格背景提示词
const UNIFIED_BACKGROUND_PROMPT = `Pixel art style, dimensions: 1242×1660 pixels, soft pastel colors with gentle gradients, minimalist aesthetic, clean and simple design, subtle geometric patterns, warm lighting, cozy atmosphere, Instagram-worthy aesthetic, high quality, detailed pixel art`;

// 即梦AI配置
const SEEDREAM_CONFIG = {
    model: "seedream-v1",
    size: "1242x1660",
    quality: "high",
    style: "pixel_art",
    n: 1
};

/**
 * 纯即梦AI封面生成器
 * 只使用即梦AI生成背景，确保一致性
 */
class SeedreamOnlyCoverGenerator {
    constructor() {
        this.seedreamAI = seedreamAIService;
    }

    /**
     * 生成纯即梦AI封面
     */
    async generateCover(title, subtitle, outputFilename) {
        console.log(`🎨 开始创建纯即梦AI封面: ${outputFilename}`);
        
        try {
            // 1. 使用即梦AI生成背景
            console.log(`🤖 调用即梦AI生成统一像素背景...`);
            const aiBackgroundPath = await this.generateAIBackground(title, subtitle);
            
            if (!aiBackgroundPath) {
                throw new Error('即梦AI背景生成失败');
            }
            
            console.log(`✅ 即梦AI背景生成成功: ${aiBackgroundPath}`);
            
            // 2. 添加文字内容
            console.log(`🎨 添加文字内容...`);
            const finalCoverPath = await this.addTextToBackground(aiBackgroundPath, title, subtitle, outputFilename);
            
            console.log(`✅ 纯即梦AI封面创建完成: ${finalCoverPath}`);
            return finalCoverPath;
            
        } catch (error) {
            console.error(`❌ 纯即梦AI封面生成失败:`, error.message);
            throw error;
        }
    }

    /**
     * 使用即梦AI生成背景
     */
    async generateAIBackground(title, subtitle) {
        try {
            const options = {
                ...SEEDREAM_CONFIG,
                prompt: UNIFIED_BACKGROUND_PROMPT,
                title: title,
                subtitle: subtitle
            };

            const imageUrls = await this.seedreamAI.generateCover(options);
            
            if (!imageUrls || imageUrls.length === 0) {
                throw new Error('即梦AI未返回图片URL');
            }

            // 下载AI生成的图片
            const backgroundPath = path.join(__dirname, 'temp_ai_background.png');
            await this.downloadImage(imageUrls[0], backgroundPath);
            
            return backgroundPath;
            
        } catch (error) {
            console.error(`即梦AI背景生成失败:`, error.message);
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
            
            // 创建SVG文字叠加
            const svgText = this.createSVGTExt(title, subtitle);
            
            // 使用Sharp合成图片
            await sharp(backgroundPath)
                .composite([{
                    input: Buffer.from(svgText),
                    blend: 'over'
                }])
                .toFile(outputPath);
            
            // 清理临时文件
            await fs.unlink(backgroundPath).catch(() => {});
            
            return outputPath;
            
        } catch (error) {
            console.error(`文字叠加失败:`, error.message);
            throw error;
        }
    }

    /**
     * 创建SVG文字
     */
    createSVGTExt(title, subtitle) {
        const svg = `
            <svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <style>
                        .title {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: 80px;
                            font-weight: 700;
                            fill: #2D3748;
                            text-anchor: middle;
                            dominant-baseline: middle;
                        }
                        .subtitle {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                            font-size: 48px;
                            font-weight: 500;
                            fill: #4A5568;
                            text-anchor: middle;
                            dominant-baseline: middle;
                        }
                        .title-bg {
                            fill: rgba(255, 255, 255, 0.95);
                            rx: 20;
                            ry: 20;
                        }
                        .subtitle-bg {
                            fill: rgba(255, 255, 255, 0.9);
                            rx: 15;
                            ry: 15;
                        }
                    </style>
                </defs>
                
                <!-- 标题背景 -->
                <rect x="371" y="700" width="500" height="120" class="title-bg"/>
                
                <!-- 标题 -->
                <text x="621" y="760" class="title">${title}</text>
                
                <!-- 副标题背景 -->
                <rect x="421" y="850" width="400" height="80" class="subtitle-bg"/>
                
                <!-- 副标题 -->
                <text x="621" y="890" class="subtitle">${subtitle}</text>
            </svg>
        `;
        
        return svg;
    }
}

/**
 * 命令行接口
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('用法: node seedream-only-cover-generator.js <标题> <副标题> <输出文件名>');
        console.log('示例: node seedream-only-cover-generator.js "复古胶片滤镜" "随手拍都是电影感" "retro_film_cover.png"');
        process.exit(1);
    }
    
    const [title, subtitle, outputFilename] = args;
    
    console.log(`🚀 创建纯即梦AI封面...`);
    
    try {
        const generator = new SeedreamOnlyCoverGenerator();
        const coverPath = await generator.generateCover(title, subtitle, outputFilename);
        
        console.log(`\n🎉 纯即梦AI封面生成成功！`);
        console.log(`📁 文件保存路径: ${coverPath}`);
        
    } catch (error) {
        console.error(`\n❌ 纯即梦AI封面生成失败:`, error.message);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { SeedreamOnlyCoverGenerator };