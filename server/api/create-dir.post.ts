import fs from 'fs';
import path from 'path';
import { createError, readBody } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    dir?: string;
    folderName?: string;
  }>(event);

  if (!body || !body.folderName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing folderName' });
  }

  const normalizedRel = path
    .normalize(body.dir || '')
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[\\/]+/, '');

  const targetDir = path.join(ROOT_DIR, normalizedRel);
  const resolvedRoot = path.resolve(ROOT_DIR);
  const resolvedTargetDir = path.resolve(targetDir);

  if (!resolvedTargetDir.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid dir' });
  }

  // 验证文件夹名称，不允许包含特殊字符
  const folderName = body.folderName.trim();
  if (!folderName || /[<>:"/\\|?*]/.test(folderName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid folder name' });
  }

  const newFolderPath = path.join(targetDir, folderName);
  const resolvedNewFolder = path.resolve(newFolderPath);

  if (!resolvedNewFolder.startsWith(resolvedRoot)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid folder path' });
  }

  if (fs.existsSync(newFolderPath)) {
    throw createError({ statusCode: 409, statusMessage: 'Folder already exists' });
  }

  fs.mkdirSync(newFolderPath, { recursive: true });

  return { success: true };
});

