import fs from 'fs';
import path from 'path';
import { createError, readMultipartFormData } from 'h3';

const ROOT_DIR = path.join(process.cwd(), 'SpecializedFolder');
const TMP_DIR = path.join(ROOT_DIR, '.upload_tmp');

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event);
  if (!form || !Array.isArray(form)) {
    throw createError({ statusCode: 400, statusMessage: 'No form data' });
  }

  let uploadId = '';
  let index = -1;
  let dirRel = '';
  let fileName = '';
  let chunkBuffer: Buffer | null = null;

  // 调试：打印所有收到的字段
  console.log('Received form fields:', form.map((item: any) => ({
    name: item.name,
    type: item.type,
    filename: item.filename,
    hasData: !!item.data
  })));

  for (const item of form) {
    if (!item.name) continue;
    
    // 处理文件字段（chunk）
    if (item.name === 'chunk') {
      if (item.data) {
        chunkBuffer = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data);
      }
    } 
    // 处理文本字段
    else {
      const value = Buffer.isBuffer(item.data) ? item.data.toString('utf8') : (item.data?.toString() || '');
      if (item.name === 'uploadId') uploadId = value;
      else if (item.name === 'index') index = parseInt(value, 10);
      else if (item.name === 'dir') dirRel = value;
      else if (item.name === 'fileName') fileName = value;
    }
  }

  if (!uploadId || isNaN(index) || index < 0 || !chunkBuffer || !fileName) {
    console.error('Missing fields:', { uploadId, index, hasChunk: !!chunkBuffer, fileName, formLength: form.length });
    throw createError({ statusCode: 400, statusMessage: 'Missing fields' });
  }

  // dirRel 只是用于后续 merge 时确定目标目录，这里只在 temp 内保存
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  const uploadDir = path.join(TMP_DIR, uploadId);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const partPath = path.join(uploadDir, `${index}.part`);
  fs.writeFileSync(partPath, chunkBuffer);

  return { success: true };
});


