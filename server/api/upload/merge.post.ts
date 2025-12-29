import fs from 'fs';
import path from 'path';
import { createError, readBody } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');
const TMP_DIR = path.join(ROOT_DIR, '.upload_tmp');

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    uploadId?: string;
    dir?: string;
    fileName?: string;
  }>(event);

  if (!body || !body.uploadId || !body.fileName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing uploadId or fileName' });
  }

  const uploadDir = path.join(TMP_DIR, body.uploadId);
  if (!fs.existsSync(uploadDir)) {
    throw createError({ statusCode: 400, statusMessage: 'Upload temp not found' });
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

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const partFiles = fs
    .readdirSync(uploadDir)
    .filter((name) => /^\d+\.part$/.test(name))
    .sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));

  const finalPath = path.join(targetDir, body.fileName);
  const writeStream = fs.createWriteStream(finalPath);

  for (const part of partFiles) {
    const partPath = path.join(uploadDir, part);
    const data = fs.readFileSync(partPath);
    writeStream.write(data);
  }

  writeStream.end();

  // 清理临时目录
  partFiles.forEach((part) => {
    fs.unlinkSync(path.join(uploadDir, part));
  });
  fs.rmdirSync(uploadDir);

  return { success: true };
});


