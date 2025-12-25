import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://strudel.cc/';
const OUTPUT_DIR = path.join(__dirname, '../public/strudel');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 存储已下载的文件，避免重复下载
const downloadedFiles = new Set();
const resourceMap = new Map(); // 存储原始URL到本地路径的映射
const pendingJsFiles = new Set(); // 待处理的 JS 文件

// 下载文件的辅助函数
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    if (downloadedFiles.has(url)) {
      resolve();
      return;
    }

    const parsedUrl = parse(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        downloadedFiles.add(url);
        file.close();
        fs.unlinkSync(outputPath);
        return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        downloadedFiles.add(url);
        console.log(`✓ Downloaded: ${url} -> ${outputPath}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      console.error(`✗ Failed to download ${url}:`, err.message);
      reject(err);
    });
  });
}

// 从HTML中提取资源链接
function extractResources(html, baseUrl) {
  const resources = [];
  const baseUrlObj = parse(baseUrl);
  
  // 提取 script src (包括处理模板语法错误的情况)
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    // 清理可能的模板语法错误
    let src = match[1].replace(/\$\{[^}]+\}/g, '').replace(/`/g, '').trim();
    if (src && !src.includes('${') && !src.includes('baseNoTrailing')) {
      const url = new URL(src, baseUrl).href;
      resources.push({ type: 'script', url, original: src });
    }
  }
  
  // 也提取没有引号的 script src（处理模板语法错误的情况）
  const scriptRegex2 = /<script[^>]*src=([^\s>]+)[^>]*>/gi;
  while ((match = scriptRegex2.exec(html)) !== null) {
    let src = match[1].replace(/["'`]/g, '').replace(/\$\{[^}]+\}/g, '').trim();
    if (src && src.endsWith('.js') && !src.includes('${') && !src.includes('baseNoTrailing')) {
      const url = new URL(src, baseUrl).href;
      resources.push({ type: 'script', url, original: src });
    }
  }
  
  // 提取 astro-island 中的 component-url 和 renderer-url
  const astroIslandRegex = /<astro-island[^>]+>/gi;
  while ((match = astroIslandRegex.exec(html)) !== null) {
    const islandHtml = match[0];
    const componentUrlMatch = islandHtml.match(/component-url=["']([^"']+)["']/);
    const rendererUrlMatch = islandHtml.match(/renderer-url=["']([^"']+)["']/);
    if (componentUrlMatch) {
      const url = new URL(componentUrlMatch[1], baseUrl).href;
      resources.push({ type: 'script', url, original: componentUrlMatch[1] });
    }
    if (rendererUrlMatch) {
      const url = new URL(rendererUrlMatch[1], baseUrl).href;
      resources.push({ type: 'script', url, original: rendererUrlMatch[1] });
    }
  }
  
  // 提取 CSS 中的字体文件 (url(...))
  const fontUrlRegex = /url\(([^)]+)\)/gi;
  while ((match = fontUrlRegex.exec(html)) !== null) {
    const fontPath = match[1].replace(/['"]/g, '');
    if (fontPath.startsWith('/') || fontPath.startsWith('http')) {
      const url = new URL(fontPath, baseUrl).href;
      resources.push({ type: 'font', url, original: fontPath });
    }
  }
  
  // 提取 link href (CSS, 图标等)
  const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = new URL(match[1], baseUrl).href;
    resources.push({ type: 'link', url, original: match[1] });
  }
  
  // 提取 img src
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = new URL(match[1], baseUrl).href;
    resources.push({ type: 'img', url, original: match[1] });
  }
  
  // 提取 importmap 中的模块
  const importMapRegex = /"imports":\s*\{([^}]+)\}/s;
  const importMapMatch = html.match(importMapRegex);
  if (importMapMatch) {
    const importsContent = importMapMatch[1];
    const importRegex = /"([^"]+)":\s*"([^"]+)"/g;
    while ((match = importRegex.exec(importsContent)) !== null) {
      const url = new URL(match[2], baseUrl).href;
      resources.push({ type: 'import', url, original: match[2], key: match[1] });
    }
  }
  
  return resources;
}

// 将URL转换为本地文件路径
function urlToLocalPath(url, baseUrl) {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    
    // 如果是同域名的资源
    if (urlObj.origin === baseUrlObj.origin) {
      let filePath = urlObj.pathname;
      if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
      }
      
      // 移除开头的斜杠
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      // 如果没有扩展名，根据内容类型添加
      if (!path.extname(filePath)) {
        if (url.includes('.js') || url.includes('javascript')) {
          filePath += '.js';
        } else if (url.includes('.css')) {
          filePath += '.css';
        }
      }
      
      return filePath;
    } else {
      // 外部资源，保存到 external 目录
      const hostname = urlObj.hostname.replace(/\./g, '_');
      const pathname = urlObj.pathname.replace(/^\//, '').replace(/\//g, '_') || 'index';
      const ext = path.extname(urlObj.pathname) || (url.includes('.js') ? '.js' : url.includes('.css') ? '.css' : '');
      return `external/${hostname}${pathname}${ext}`;
    }
  } catch (e) {
    console.error('Error converting URL:', url, e);
    return 'unknown';
  }
}

// 替换HTML中的资源路径
function replaceResourcePaths(html, resourceMap) {
  let newHtml = html;
  
  // 替换 script src
  newHtml = newHtml.replace(/<script([^>]+)src=["']([^"']+)["']([^>]*)>/gi, (match, before, url, after) => {
    const fullUrl = new URL(url, TARGET_URL).href;
    const localPath = resourceMap.get(fullUrl);
    if (localPath) {
      return `<script${before}src="${localPath}"${after}>`;
    }
    return match;
  });
  
  // 替换 link href
  newHtml = newHtml.replace(/<link([^>]+)href=["']([^"']+)["']([^>]*)>/gi, (match, before, url, after) => {
    const fullUrl = new URL(url, TARGET_URL).href;
    const localPath = resourceMap.get(fullUrl);
    if (localPath) {
      return `<link${before}href="${localPath}"${after}>`;
    }
    return match;
  });
  
  // 替换 img src
  newHtml = newHtml.replace(/<img([^>]+)src=["']([^"']+)["']([^>]*)>/gi, (match, before, url, after) => {
    const fullUrl = new URL(url, TARGET_URL).href;
    const localPath = resourceMap.get(fullUrl);
    if (localPath) {
      return `<img${before}src="${localPath}"${after}>`;
    }
    return match;
  });
  
  // 替换 importmap
  newHtml = newHtml.replace(/"imports":\s*\{([^}]+)\}/s, (match, importsContent) => {
    const newImports = importsContent.replace(/"([^"]+)":\s*"([^"]+)"/g, (importMatch, key, url) => {
      const fullUrl = new URL(url, TARGET_URL).href;
      const localPath = resourceMap.get(fullUrl);
      if (localPath) {
        return `"${key}": "${localPath}"`;
      }
      return importMatch;
    });
    return `"imports": {${newImports}}`;
  });
  
  return newHtml;
}

// 从 JavaScript 文件中提取 import 依赖
function extractJsImports(jsContent, jsFileUrl) {
  const imports = [];
  const baseDir = path.dirname(new URL(jsFileUrl).pathname);
  
  // 匹配 import 语句（包括压缩格式）：
  // - import ... from "./file.js"
  // - import "./file.js"
  // - import{...}from"./file.js" (压缩格式)
  const importRegex = /import\s*(?:\{[^}]*\}|\w+\s+as\s+\w+|\*\s+as\s+\w+)?\s*from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
  let match;
  
  while ((match = importRegex.exec(jsContent)) !== null) {
    const importPath = match[1] || match[2]; // 匹配两种格式
    
    if (!importPath) continue;
    
    // 只处理相对路径的导入
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      try {
        const fullUrl = new URL(importPath, jsFileUrl).href;
        imports.push(fullUrl);
      } catch (e) {
        // 忽略无效的 URL
      }
    }
  }
  
  return imports;
}

// 递归下载 JavaScript 文件的依赖
async function downloadJsDependencies(jsFileUrl, jsFilePath) {
  if (pendingJsFiles.has(jsFileUrl)) {
    return; // 正在处理中，避免循环
  }
  
  pendingJsFiles.add(jsFileUrl);
  
  try {
    // 读取已下载的 JS 文件
    if (!fs.existsSync(jsFilePath)) {
      return;
    }
    
    const jsContent = fs.readFileSync(jsFilePath, 'utf-8');
    const imports = extractJsImports(jsContent, jsFileUrl);
    
    if (imports.length === 0) {
      return;
    }
    
    console.log(`  发现 ${imports.length} 个依赖: ${path.basename(jsFilePath)}`);
    
    // 下载所有依赖
    for (const importUrl of imports) {
      if (downloadedFiles.has(importUrl)) {
        continue;
      }
      
      const localPath = urlToLocalPath(importUrl, TARGET_URL);
      const fullLocalPath = path.join(OUTPUT_DIR, localPath);
      const dir = path.dirname(fullLocalPath);
      
      // 创建目录
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      try {
        await downloadFile(importUrl, fullLocalPath);
        resourceMap.set(importUrl, localPath);
        
        // 递归处理依赖的依赖（如果是 JS 文件）
        if (importUrl.endsWith('.js')) {
          await downloadJsDependencies(importUrl, fullLocalPath);
        }
      } catch (err) {
        console.error(`  跳过依赖: ${importUrl} (${err.message})`);
      }
    }
  } catch (err) {
    console.error(`  解析依赖失败: ${jsFilePath} (${err.message})`);
  } finally {
    pendingJsFiles.delete(jsFileUrl);
  }
}

// 主函数
async function main() {
  console.log('开始下载 strudel.cc...\n');
  
  try {
    // 1. 下载主HTML文件
    console.log('1. 下载主页面...');
    const htmlContent = await new Promise((resolve, reject) => {
      https.get(TARGET_URL, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
    
    // 保存原始HTML
    const htmlPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`✓ 保存HTML到: ${htmlPath}\n`);
    
    // 2. 提取所有资源
    console.log('2. 提取资源链接...');
    const resources = extractResources(htmlContent, TARGET_URL);
    console.log(`找到 ${resources.length} 个资源文件\n`);
    
    // 3. 下载所有资源
    console.log('3. 下载资源文件...\n');
    const downloadPromises = [];
    
    for (const resource of resources) {
      const localPath = urlToLocalPath(resource.url, TARGET_URL);
      const fullLocalPath = path.join(OUTPUT_DIR, localPath);
      const dir = path.dirname(fullLocalPath);
      
      // 创建目录
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 存储映射关系
      resourceMap.set(resource.url, localPath);
      
      // 下载文件
      downloadPromises.push(
        downloadFile(resource.url, fullLocalPath).catch(err => {
          console.error(`  跳过: ${resource.url} (${err.message})`);
        })
      );
    }
    
    await Promise.all(downloadPromises);
    
    // 3.5. 下载 JavaScript 文件的依赖
    console.log('\n3.5. 下载 JavaScript 依赖文件...\n');
    const jsFiles = [];
    for (const resource of resources) {
      if (resource.type === 'script' && resource.url.endsWith('.js')) {
        const localPath = urlToLocalPath(resource.url, TARGET_URL);
        const fullLocalPath = path.join(OUTPUT_DIR, localPath);
        if (fs.existsSync(fullLocalPath)) {
          jsFiles.push({ url: resource.url, path: fullLocalPath });
        }
      }
    }
    
    for (const jsFile of jsFiles) {
      await downloadJsDependencies(jsFile.url, jsFile.path);
    }
    
    // 4. 更新HTML中的路径
    console.log('\n4. 更新HTML中的资源路径...');
    const updatedHtml = replaceResourcePaths(htmlContent, resourceMap);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log(`✓ HTML路径已更新\n`);
    
    // 5. 修复错误的 script 标签和更新路径
    let finalHtml = updatedHtml;
    
    // 修复错误的 script 标签
    finalHtml = finalHtml.replace(
      /<script[^>]*`\$\{baseNoTrailing\}[^`]*`[^>]*>/gi,
      '<script src="make-scrollable-code-focusable.js"></script>'
    );
    
    // 更新 base 标签
    finalHtml = finalHtml.replace(/<base href="\/">/gi, '<base href="./">');
    
    // 更新字体路径（从 /fonts/ 改为 fonts/）
    finalHtml = finalHtml.replace(/url\(\/fonts\//g, 'url(fonts/');
    
    // 更新 astro-island 路径（从 /_astro/ 改为 _astro/）
    finalHtml = finalHtml.replace(/component-url="\/_astro\//g, 'component-url="_astro/');
    finalHtml = finalHtml.replace(/renderer-url="\/_astro\//g, 'renderer-url="_astro/');
    
    // 更新 CSP 策略
    finalHtml = finalHtml.replace(
      /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
      '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob: ws: wss:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob:; style-src \'self\' \'unsafe-inline\' https: data: blob:; img-src \'self\' data: blob: https:; font-src \'self\' data: https:; connect-src \'self\' https: ws: wss:; media-src \'self\' blob: data: https:; worker-src \'self\' blob:; frame-src \'self\' https:;">'
    );
    
    fs.writeFileSync(htmlPath, finalHtml);
    
    console.log('✅ 下载完成！');
    console.log(`\n文件保存在: ${OUTPUT_DIR}`);
    console.log(`\n访问地址: /strudel/index.html`);
    
  } catch (error) {
    console.error('❌ 下载失败:', error);
    process.exit(1);
  }
}

main();

