import fs from 'fs';
import path from 'path';
import { createError, sendStream, setHeader } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');

export default defineEventHandler((event) => {
  const params = event.context.params || {};
  const raw = params.path as string | string[] | undefined;

  // 处理路径：如果是数组则拼接，否则直接使用
  let relPath = Array.isArray(raw) ? raw.join('/') : raw || '';
  
  // 手动解码 URL 编码的路径（Nuxt 可能不会自动解码）
  try {
    relPath = decodeURIComponent(relPath);
  } catch (e) {
    // 如果解码失败，使用原始路径
  }
  
  // 确保路径使用正斜杠（统一处理）
  relPath = relPath.replace(/\\/g, '/');

  const normalizedRel = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const targetPath = path.join(ROOT_DIR, normalizedRel);
  
  // 调试日志（生产环境可以移除）
  console.log('Download request:', {
    raw,
    relPath,
    normalizedRel,
    targetPath,
    exists: fs.existsSync(targetPath)
  });

  const resolvedRoot = path.resolve(ROOT_DIR);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' });
  }

  if (!fs.existsSync(targetPath)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' });
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isFile()) {
    throw createError({ statusCode: 400, statusMessage: 'Not a file' });
  }

  const filename = path.basename(targetPath);
  
  // 设置响应头，确保文件可以正确下载
  // HTTP 头中不能直接包含中文字符，需要使用 RFC 5987 格式编码
  // 对于包含中文的文件名，只使用 filename* 参数
  const encodedFilename = encodeURIComponent(filename);
  // 使用 ASCII 安全的文件名作为备选，中文文件名只使用 filename*
  const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_'); // 将非 ASCII 字符替换为下划线
  setHeader(event, 'Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
  
  // 根据文件扩展名设置正确的 Content-Type
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.apk': 'application/vnd.android.package-archive',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  setHeader(event, 'Content-Type', contentType);
  
  // 添加 CORS 头，确保跨域访问正常
  setHeader(event, 'Access-Control-Allow-Origin', '*');
  setHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS');
  setHeader(event, 'Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  setHeader(event, 'Accept-Ranges', 'bytes'); // 支持断点续传
  
  // 获取文件大小并设置 Content-Length
  const fileSize = stat.size;
  setHeader(event, 'Content-Length', fileSize.toString());

  const stream = fs.createReadStream(targetPath);
  return sendStream(event, stream);
});


