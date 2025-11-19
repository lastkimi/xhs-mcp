import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 固定的统一背景提示词
const UNIFIED_BACKGROUND_PROMPT = `Pixel art style, dimensions: 1242×1660 pixels, aspect ratio: 3:4. Features a soft pink gradient background with a medium-sized pixel-style speech bubble positioned centrally, proportionally sized to create balanced white space around it. The main title "美少女颜究社bot" in a retro pixel font is placed prominently at the top. A cute pixel art cat sits at the bottom corner of the dialog box. The scene is surrounded by scattered decorative pixel art elements: small flowers, hearts, and stars. The dialog box is smaller and more proportionate to the overall composition, creating a harmonious layout with adequate breathing room. Kawaii aesthetic, retro video game style, clean and visually balanced arrangement.`;

/**
 * 生成统一像素风格封面
 * @param {string} titleText - 标题文字
 * @param {string} subtitleText - 副标题文字（可选）
 * @param {string} outputFilename - 输出文件名
 */
async function createUnifiedPixelCover(titleText, subtitleText = '', outputFilename) {
    try {
        console.log(`🎨 开始创建统一像素风格封面: ${outputFilename}`);
        
        // 首先尝试调用即梦AI生成背景
        let backgroundBuffer;
        try {
            console.log('🤖 调用即梦AI生成统一像素背景...');
            
            const response = await fetch('https://api.seedream.xyz/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-00yF8A4p3DdHkE7YEE2047b4d15d11d0b840a283d74b66a6'
                },
                body: JSON.stringify({
                    model: 'sd-xl',
                    prompt: UNIFIED_BACKGROUND_PROMPT,
                    size: '1242x1660',
                    n: 1,
                    style: 'pixel-art',
                    quality: 'high'
                })
            });

            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status}`);
            }

            const data = await response.json();
            const imageUrl = data.data[0].url;
            
            console.log('📥 下载生成的统一像素背景图...');
            
            // 下载图片
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            backgroundBuffer = Buffer.from(imageBuffer);
            
        } catch (error) {
            console.log('⚠️ 即梦AI生成失败，创建备用纯色背景...');
            backgroundBuffer = await createFallbackBackground();
        }
        
        console.log('🎨 添加文字内容...');
        
        // 生成SVG文字叠加
        const svgOverlay = createSvgOverlay(titleText, subtitleText);
        const svgBuffer = Buffer.from(svgOverlay);
        
        // 合成最终图片
        const finalImage = await sharp(backgroundBuffer)
            .composite([
                {
                    input: svgBuffer,
                    top: 0,
                    left: 0
                }
            ])
            .png()
            .toBuffer();
        
        // 保存最终图片
        const outputPath = join(__dirname, outputFilename);
        fs.writeFileSync(outputPath, finalImage);
        
        console.log(`✅ 统一像素风格封面创建完成: ${outputFilename}`);
        console.log(`📁 保存路径: ${outputPath}`);
        
        return outputPath;
        
    } catch (error) {
        console.error('❌ 创建统一像素封面失败:', error.message);
        throw error;
    }
}

/**
 * 创建备用纯色背景
 */
async function createFallbackBackground() {
    return await sharp({
        create: {
            width: 1242,
            height: 1660,
            channels: 4,
            background: { r: 255, g: 182, b: 203, alpha: 1 }
        }
    })
    .png()
    .toBuffer();
}

/**
 * 创建SVG文字叠加
 */
function createSvgOverlay(titleText, subtitleText) {
    // 分割标题为多行（每行最多6个字）
    const titleLines = splitTextIntoLines(titleText, 6);
    
    let titleY = 580;
    let titleElements = '';
    
    titleLines.forEach((line, index) => {
        titleElements += `
            <text x="621" y="${titleY + (index * 120)}" font-family="monospace" font-size="100" fill="#FF1493" text-anchor="middle" font-weight="bold" letter-spacing="2">
                ${line}
            </text>
        `;
    });
    
    // 如果有副标题，添加在底部
    let subtitleElement = '';
    if (subtitleText) {
        const subtitleLines = splitTextIntoLines(subtitleText, 8);
        subtitleLines.forEach((line, index) => {
            subtitleElement += `
                <text x="621" y="${1200 + (index * 80)}" font-family="monospace" font-size="80" fill="#FF69B4" text-anchor="middle" font-weight="bold" letter-spacing="2">
                    ${line}
                </text>
            `;
        });
    }
    
    return `
        <svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">
            <!-- 美少女颜究社bot 标题在上方 -->
            <text x="621" y="150" font-family="monospace" font-size="80" fill="#FF1493" text-anchor="middle" font-weight="bold" letter-spacing="2">
                美少女颜究社bot
            </text>
            
            <!-- 对话框背景 -->
            <rect x="200" y="400" width="842" height="600" fill="white" stroke="#FF69B4" stroke-width="4" rx="40"/>
            
            <!-- 对话框尖角 -->
            <polygon points="621,1000 581,1050 661,1000" fill="white"/>
            
            <!-- 标题文字 -->
            ${titleElements}
            
            <!-- 副标题文字 -->
            ${subtitleElement}
            
            <!-- 装饰元素 -->
            <text x="300" y="1300" font-family="monospace" font-size="60" fill="#FF69B4" text-anchor="middle">🌸</text>
            <text x="942" y="1300" font-family="monospace" font-size="60" fill="#FF69B4" text-anchor="middle">✨</text>
            <text x="621" y="1400" font-family="monospace" font-size="40" fill="#FF69B4" text-anchor="middle">💫 💖 💫</text>
        </svg>
    `;
}

/**
 * 将文字分割为多行
 */
function splitTextIntoLines(text, maxCharsPerLine) {
    const lines = [];
    let currentLine = '';
    
    const words = text.split('');
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        if ((currentLine + word).length <= maxCharsPerLine) {
            currentLine += word;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// 导出函数
export { createUnifiedPixelCover, UNIFIED_BACKGROUND_PROMPT };

// 如果直接运行此文件，创建测试封面
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 创建测试封面...');
    await createUnifiedPixelCover('求分享可爱毛衣内搭', '姐妹们救救我', 'test_unified_cover.png');
}