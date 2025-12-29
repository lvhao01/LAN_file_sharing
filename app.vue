<template>
  <div class="app-shell">
    <div class="app-card">
      <header class="app-header">
        <div class="app-title">
          局域网文件共享
          <span class="app-title-badge">SpecializedFolder</span>
        </div>
        <div class="search-bar">
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            placeholder="搜索当前目录下的文件或文件夹..."
          />
          <button
            class="btn btn-primary btn-create-dir"
            type="button"
            @click="createDirModalVisible = true"
          >
            新建文件夹
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="uploadModalVisible = true"
          >
            上传文件
          </button>
        </div>
      </header>

      <nav class="breadcrumb">
        <span
          class="breadcrumb-seg"
          :class="{ 'drop-target': dragOverBreadcrumb === -1 }"
          @click="goToLevel(-1)"
          @dragover.prevent="handleBreadcrumbDragOver(-1)"
          @dragleave="handleBreadcrumbDragLeave(-1)"
          @drop.prevent="handleBreadcrumbDrop(-1)"
        >
          根目录
        </span>
        <span v-for="(seg, idx) in pathSegments" :key="idx">
          /
          <span
            v-if="idx < pathSegments.length - 1"
            class="breadcrumb-seg"
            :class="{ 'drop-target': dragOverBreadcrumb === idx }"
            @click="goToLevel(idx)"
            @dragover.prevent="handleBreadcrumbDragOver(idx)"
            @dragleave="handleBreadcrumbDragLeave(idx)"
            @drop.prevent="handleBreadcrumbDrop(idx)"
          >
            {{ seg }}
          </span>
          <span
            v-else
            class="breadcrumb-current"
            :class="{ 'drop-target': dragOverBreadcrumb === idx }"
            @dragover.prevent="handleBreadcrumbDragOver(idx)"
            @dragleave="handleBreadcrumbDragLeave(idx)"
            @drop.prevent="handleBreadcrumbDrop(idx)"
          >
            {{ seg }}
          </span>
        </span>
      </nav>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">当前目录内容</div>
          <div class="badge">
            {{ filteredDirs.length + filteredFiles.length }} 条
          </div>
        </div>
        <div class="panel-body">
          <div class="row row-header">
            <div>名称</div>
            <div>保存日期</div>
            <div>大小 / 类型 / 操作</div>
          </div>
          <div
            v-if="filteredDirs.length + filteredFiles.length === 0"
            class="empty"
          >
            当前目录下没有文件或文件夹
          </div>
          <ul v-else class="list">
            <!-- 先显示文件夹 -->
            <li
              v-for="dir in filteredDirs"
              :key="`dir-${dir.path}`"
              class="row row-folder"
              :class="{ 'drop-target': dragOverDir === dir.path }"
              @click="openDir(dir)"
              @dragover.prevent="handleDragOver(dir)"
              @dragleave="handleDragLeave(dir)"
              @drop.prevent="handleDrop(dir)"
            >
              <div class="cell-name">
                <span>📁</span>
                <span class="cell-name-main">{{ dir.name }}</span>
              </div>
              <div>{{ formatDate(dir.modifiedTime) }}</div>
              <div class="actions">
                <span class="chip-folder">文件夹</span>
                <button
                  class="btn-ghost btn"
                  type="button"
                  @click.stop="deleteDir(dir)"
                >
                  删除
                </button>
              </div>
            </li>
            <!-- 再显示文件 -->
            <li
              v-for="file in filteredFiles"
              :key="`file-${file.path}`"
              class="row row-file-draggable"
              :class="{ dragging: draggedFile === file.path }"
              draggable="true"
              @dragstart="handleDragStart(file, $event)"
              @dragend="handleDragEnd"
              @touchstart="handleTouchStart(file, $event)"
              @touchend="handleTouchEnd"
              @touchmove="handleTouchMove"
            >
              <div class="cell-name">
                <span>📄</span>
                <span class="cell-name-main">{{ file.name }}</span>
              </div>
              <div>{{ formatDate(file.modifiedTime) }}</div>
              <div class="actions">
                <span class="chip-file">{{ formatSize(file.size) }}</span>
                <button
                  class="btn btn-primary"
                  type="button"
                  @click.stop="download(file)"
                >
                  下载
                </button>
                <button
                  class="btn-ghost btn"
                  type="button"
                  @click.stop="openQr(file)"
                >
                  二维码
                </button>
                <button
                  class="btn-ghost btn"
                  type="button"
                  @click.stop="deleteFile(file)"
                >
                  删除
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <footer class="footer">
        <div>点击文件夹可逐级进入子目录</div>
        <div class="footer-right">
          <span class="status-dot" />
          <span>局域网内其他设备可通过本机 IP 访问</span>
        </div>
      </footer>
    </div>

    <!-- QR Modal -->
    <Teleport to="body">
      <div
        v-if="qrVisible"
        class="modal-backdrop"
        @click.self="qrVisible = false"
      >
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">下载二维码</div>
            <button class="btn-icon" type="button" @click="qrVisible = false">
              ✕
            </button>
          </div>
          <div class="modal-subtitle">
            扫码在手机上直接下载：{{ qrFileName }}
          </div>
          <div class="qr-wrapper">
            <canvas ref="qrCanvas" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Dir Modal -->
    <Teleport to="body">
      <div
        v-if="createDirModalVisible"
        class="modal-backdrop"
        @click.self="closeCreateDirModal"
      >
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title-wrapper">
              <div class="modal-icon">📁</div>
              <div>
                <div class="modal-title">新建文件夹</div>
                <div class="modal-subtitle">
                  目标目录：{{ currentPath || "根目录" }}
                </div>
              </div>
            </div>
            <button class="btn-icon" type="button" @click="closeCreateDirModal">
              ✕
            </button>
          </div>
          <div class="create-dir-content">
            <input
              v-model="newFolderName"
              class="create-dir-input"
              type="text"
              placeholder="请输入文件夹名称"
              @keyup.enter="createFolder"
              @keyup.esc="closeCreateDirModal"
            />
            <div v-if="createDirError" class="create-dir-error">
              {{ createDirError }}
            </div>
            <div class="create-dir-actions">
              <button
                class="btn btn-ghost"
                type="button"
                @click="closeCreateDirModal"
              >
                取消
              </button>
              <button
                class="btn btn-primary"
                type="button"
                @click="createFolder"
                :disabled="!newFolderName.trim()"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div
        v-if="uploadModalVisible"
        class="modal-backdrop"
        @click.self="closeUploadModal"
      >
        <div class="modal upload-modal">
          <div class="modal-header">
            <div class="modal-title-wrapper">
              <div class="modal-icon">📤</div>
              <div>
                <div class="modal-title">上传文件</div>
                <div class="modal-subtitle">
                  目标目录：{{ currentPath || "根目录" }}
                </div>
              </div>
            </div>
            <button class="btn-icon" type="button" @click="closeUploadModal">
              ✕
            </button>
          </div>
          <div class="upload-content">
            <div v-if="!uploading" class="upload-dropzone">
              <input
                ref="uploadInput"
                type="file"
                multiple
                @change="handleFileSelect"
                class="upload-input-hidden"
                id="upload-input"
              />
              <label for="upload-input" class="upload-label">
                <div class="upload-icon">📎</div>
                <div class="upload-label-text">
                  <div class="upload-label-main">点击选择文件或拖拽到此处</div>
                  <div class="upload-label-sub">支持多文件上传</div>
                </div>
              </label>
            </div>
            <div
              v-if="selectedFiles.length && !uploading"
              class="upload-file-list"
            >
              <div class="upload-file-list-title">
                已选择 {{ selectedFiles.length }} 个文件
              </div>
              <div class="upload-file-items">
                <div
                  v-for="(file, idx) in selectedFiles"
                  :key="idx"
                  class="upload-file-item"
                >
                  <span class="upload-file-icon">📄</span>
                  <span class="upload-file-name">{{ file.name }}</span>
                  <span class="upload-file-size">{{
                    formatSize(file.size)
                  }}</span>
                </div>
              </div>
            </div>
            <div v-if="uploading" class="upload-progress-section">
              <div class="upload-progress-header">
                <div class="upload-progress-icon">⏳</div>
                <div class="upload-progress-info">
                  <div class="upload-progress-text">
                    {{ currentUploadFile }}
                  </div>
                  <div class="upload-progress-text-small">
                    第 {{ uploadFileIndex }} / {{ uploadTotalFiles }} 个文件
                  </div>
                </div>
              </div>
              <div class="upload-progress-bar-wrapper">
                <div
                  class="upload-progress-bar"
                  :style="{ width: uploadProgress + '%' }"
                >
                  <div class="upload-progress-bar-shine" />
                </div>
              </div>
              <div class="upload-progress-footer">
                <div class="upload-progress-percent">{{ uploadProgress }}%</div>
                <div class="upload-progress-status">上传中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import QRCode from "qrcode";
// @ts-ignore
import { pinyin } from "pinyin-pro";

type DirItem = {
  name: string;
  path: string;
  modifiedTime: string | number | Date;
};

type FileItem = {
  name: string;
  path: string;
  modifiedTime: string | number | Date;
  size: number;
};

const currentPath = ref<string>("");
const dirs = ref<DirItem[]>([]);
const files = ref<FileItem[]>([]);
const keyword = ref("");

const qrVisible = ref(false);
const qrFileName = ref("");
const qrCanvas = ref<HTMLCanvasElement | null>(null);
const uploadModalVisible = ref(false);
const uploadInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const currentUploadFile = ref<string>("");
const uploadFileIndex = ref(0);
const uploadTotalFiles = ref(0);
const createDirModalVisible = ref(false);
const newFolderName = ref("");
const createDirError = ref("");
const draggedFile = ref<string | null>(null);
const dragOverDir = ref<string | null>(null);
const dragOverBreadcrumb = ref<number | null>(null);
const longPressTimer = ref<number | null>(null);
const isLongPressing = ref(false);

const pathSegments = computed(() =>
  currentPath.value ? currentPath.value.split("/").filter(Boolean) : []
);

// 拼音搜索辅助函数
function matchSearch(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // 1. 直接匹配（包含中文、英文、数字）
  if (lowerText.includes(lowerKeyword)) {
    return true;
  }

  // 2. 拼音搜索逻辑说明：
  // - 如果关键词包含中文：已经在第1步直接匹配了，不需要拼音搜索
  // - 如果关键词包含数字/特殊字符：不是拼音，不需要拼音搜索
  // - 如果关键词是纯英文字母：可能是拼音，需要进行拼音搜索
  // 例如：输入 "北京" → 第1步直接匹配；输入 "beijing" 或 "bj" → 需要拼音搜索
  const isPureEnglish = /^[a-z]+$/i.test(keyword);
  if (!isPureEnglish) {
    return false; // 不是纯英文，不进行拼音搜索（中文已在第1步匹配）
  }

  try {
    // 2. 拼音全拼匹配
    const textPinyin = String(
      pinyin(text, { toneType: "none", type: "all" }) || ""
    ).toLowerCase();
    if (textPinyin.includes(lowerKeyword)) {
      return true;
    }

    // 3. 拼音首字母匹配（只匹配文件名开头的连续首字母）
    const textInitials = String(
      pinyin(text, { pattern: "first", toneType: "none" }) || ""
    ).toLowerCase();
    const textInitialsCompact = textInitials.replace(/\s+/g, "");

    // 只匹配文件名开头的拼音首字母，避免误匹配
    // 例如搜索 "bj" 只匹配 "北京" (bj) 开头的文件名
    if (textInitialsCompact.startsWith(lowerKeyword)) {
      return true;
    }

    // 也支持匹配拼音首字母中的完整单词边界
    // 例如搜索 "bj" 可以匹配 "beijing" 或 "beijing96156" 中的 "bj"
    // 但不能匹配 "dabj" 中的 "bj"（因为 "bj" 不是独立的单词）
    // 使用正则匹配：关键词前后必须是数字、非字母字符或字符串边界
    const regex = new RegExp(`(^|[^a-z])${lowerKeyword}([^a-z]|$)`, "i");
    if (regex.test(textInitialsCompact)) {
      return true;
    }
  } catch (e) {
    // 如果拼音转换失败，只使用直接匹配
    console.warn("拼音转换失败:", e);
  }

  return false;
}

const filteredDirs = computed(() => {
  if (!keyword.value.trim()) return dirs.value;
  return dirs.value.filter((d) => matchSearch(d.name, keyword.value));
});

const filteredFiles = computed(() => {
  if (!keyword.value.trim()) return files.value;
  return files.value.filter((f) => matchSearch(f.name, keyword.value));
});

async function loadListing() {
  const pathParam = currentPath.value;
  const data = await $fetch<{
    currentPath: string;
    dirs: DirItem[];
    files: FileItem[];
  }>("/api/list", {
    params: { path: pathParam },
  });
  currentPath.value = data.currentPath || "";
  dirs.value = data.dirs || [];
  files.value = data.files || [];
}

watch(currentPath, () => {
  loadListing();
});

onMounted(() => {
  loadListing();
});

function goToLevel(idx: number) {
  if (idx < 0) {
    currentPath.value = "";
    return;
  }
  const segs = pathSegments.value.slice(0, idx + 1);
  currentPath.value = segs.join("/");
}

function openDir(dir: DirItem) {
  currentPath.value = dir.path;
}

function formatDate(value: string | number | Date) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(2)} ${units[i]}`;
}

function buildDownloadUrl(file: FileItem) {
  // 将路径分割成数组，每个部分单独编码，以支持特殊字符和中文
  const pathParts = file.path
    .split("/")
    .map((part) => encodeURIComponent(part));
  return `/api/download/${pathParts.join("/")}`;
}

function download(file: FileItem) {
  // 使用浏览器原生下载方法，支持流式下载和断点续传
  const url = buildDownloadUrl(file);

  // 直接使用 <a> 标签下载，避免 window.open 打开新标签页
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

async function openQr(file: FileItem) {
  qrVisible.value = true;
  qrFileName.value = file.name;
  await nextTick();

  if (!qrCanvas.value) return;

  const url = new URL(buildDownloadUrl(file), window.location.origin).href;
  try {
    await QRCode.toCanvas(qrCanvas.value, url, {
      width: 240,
      margin: 1,
    });
  } catch {
    const ctx = qrCanvas.value.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, qrCanvas.value.width, qrCanvas.value.height);
      ctx.font = "12px sans-serif";
      ctx.fillText("二维码生成失败", 10, 20);
    }
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  selectedFiles.value = Array.from(input.files);
  // 选择后立即开始上传
  startUpload();
}

async function startUpload() {
  if (!selectedFiles.value.length || uploading.value) return;
  uploading.value = true;
  uploadProgress.value = 0;
  uploadFileIndex.value = 0;
  uploadTotalFiles.value = selectedFiles.value.length;

  try {
    const filesToUpload = [...selectedFiles.value];
    const total = filesToUpload.length;

    for (let i = 0; i < total; i++) {
      const file = filesToUpload[i];
      currentUploadFile.value = file.name;
      uploadFileIndex.value = i + 1;

      await uploadSingleFile(file, i, total);

      // 更新整体进度
      uploadProgress.value = Math.round(((i + 1) / total) * 100);
    }

    selectedFiles.value = [];
    if (uploadInput.value) {
      uploadInput.value.value = "";
    }
    await loadListing();
    uploadModalVisible.value = false;
  } finally {
    uploading.value = false;
    currentUploadFile.value = "";
    uploadProgress.value = 0;
  }
}

async function uploadSingleFile(
  file: File,
  fileIndex: number,
  totalFiles: number
) {
  const chunkSize = 2 * 1024 * 1024; // 2MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadId = `${file.name}-${file.size}`;

  // 查询已上传的分片（断点续传）
  const status = await $fetch<{ uploaded: number[] }>("/api/upload/status", {
    method: "POST",
    body: {
      uploadId,
      dir: currentPath.value,
      fileName: file.name,
    },
  });

  const uploadedSet = new Set(status.uploaded || []);
  const chunksToUpload = totalChunks - uploadedSet.size;
  let uploadedChunks = uploadedSet.size;

  for (let index = 0; index < totalChunks; index++) {
    if (uploadedSet.has(index)) continue;

    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    const form = new FormData();
    form.append("uploadId", uploadId);
    form.append("index", String(index));
    form.append("total", String(totalChunks));
    form.append("dir", currentPath.value);
    form.append("fileName", file.name);
    form.append("chunk", blob, `chunk-${index}`);

    const res = await fetch("/api/upload/chunk", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload chunk failed: ${res.status} ${text}`);
    }

    // 更新单个文件的进度
    uploadedChunks++;
    if (chunksToUpload > 0) {
      const fileProgress = Math.round((uploadedChunks / totalChunks) * 100);
      // 计算整体进度：已完成文件 + 当前文件进度
      const overallProgress = Math.round(
        (fileIndex / totalFiles) * 100 + fileProgress / totalFiles
      );
      uploadProgress.value = overallProgress;
    }
  }

  // 合并分片
  await $fetch("/api/upload/merge", {
    method: "POST",
    body: {
      uploadId,
      dir: currentPath.value,
      fileName: file.name,
    },
  });
}

async function deleteDir(dir: DirItem) {
  if (!confirm(`确定要删除文件夹及其子内容吗？\n${dir.name}`)) return;
  await $fetch("/api/delete", {
    method: "POST",
    body: {
      path: dir.path,
      type: "dir",
    },
  });
  await loadListing();
}

async function deleteFile(file: FileItem) {
  if (!confirm(`确定要删除这个文件吗？\n${file.name}`)) return;
  await $fetch("/api/delete", {
    method: "POST",
    body: {
      path: file.path,
      type: "file",
    },
  });
  await loadListing();
}

function closeUploadModal() {
  if (uploading.value) return;
  uploadModalVisible.value = false;
  selectedFiles.value = [];
  if (uploadInput.value) {
    uploadInput.value.value = "";
  }
}

async function createFolder() {
  const folderName = newFolderName.value.trim();
  if (!folderName) {
    createDirError.value = "请输入文件夹名称";
    return;
  }

  // 验证文件夹名称
  if (/[<>:"/\\|?*]/.test(folderName)) {
    createDirError.value = '文件夹名称不能包含以下字符：< > : " / \\ | ? *';
    return;
  }

  createDirError.value = "";

  try {
    await $fetch("/api/create-dir", {
      method: "POST",
      body: {
        dir: currentPath.value,
        folderName: folderName,
      },
    });

    newFolderName.value = "";
    createDirModalVisible.value = false;
    await loadListing();
  } catch (error: any) {
    if (error.statusCode === 409) {
      createDirError.value = "文件夹已存在";
    } else if (error.statusCode === 400) {
      createDirError.value = error.statusMessage || "文件夹名称无效";
    } else {
      createDirError.value = "创建失败，请重试";
    }
  }
}

function closeCreateDirModal() {
  createDirModalVisible.value = false;
  newFolderName.value = "";
  createDirError.value = "";
}

function handleDragStart(file: FileItem, event: DragEvent) {
  draggedFile.value = file.path;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", file.path);
  }
}

function handleDragEnd() {
  draggedFile.value = null;
  dragOverDir.value = null;
  dragOverBreadcrumb.value = null;
}

function handleDragOver(dir: DirItem) {
  dragOverDir.value = dir.path;
}

function handleDragLeave(dir: DirItem) {
  // 延迟清除，避免快速移动时闪烁
  setTimeout(() => {
    if (dragOverDir.value === dir.path) {
      dragOverDir.value = null;
    }
  }, 50);
}

async function handleDrop(dir: DirItem) {
  if (!draggedFile.value) return;

  const sourcePath = draggedFile.value;

  // 提取文件的目录路径（去掉文件名）
  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/")) || "";

  // 检查是否拖到同一个目录
  if (dir.path === sourceDir) {
    dragOverDir.value = null;
    draggedFile.value = null;
    return;
  }

  try {
    await $fetch("/api/move", {
      method: "POST",
      body: {
        sourcePath: sourcePath,
        targetDir: dir.path,
      },
    });

    await loadListing();
  } catch (error: any) {
    if (error.statusCode === 409) {
      alert("目标文件夹中已存在同名文件");
    } else {
      alert("移动文件失败：" + (error.statusMessage || "未知错误"));
    }
  } finally {
    dragOverDir.value = null;
    draggedFile.value = null;
  }
}

// 长按检测（移动端）
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let currentDraggedFile: FileItem | null = null;

function handleTouchStart(file: FileItem, event: TouchEvent) {
  touchStartTime = Date.now();
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  currentDraggedFile = file;

  longPressTimer.value = window.setTimeout(() => {
    if (currentDraggedFile) {
      isLongPressing.value = true;
      draggedFile.value = currentDraggedFile.path;
      // 创建虚拟拖拽事件
      const dragEvent = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.effectAllowed = "move";
        dragEvent.dataTransfer.setData("text/plain", currentDraggedFile.path);
      }
      event.target?.dispatchEvent(dragEvent);
    }
  }, 500); // 500ms 长按
}

function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  touchStartTime = 0;
  currentDraggedFile = null;
  isLongPressing.value = false;
}

function handleTouchMove(event: TouchEvent) {
  // 如果移动距离太大，取消长按
  if (touchStartTime > 0) {
    const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - touchStartY);
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer.value) {
        clearTimeout(longPressTimer.value);
        longPressTimer.value = null;
      }
    }
  }
}

function getBreadcrumbPath(idx: number): string {
  if (idx < 0) {
    return ""; // 根目录
  }
  const segs = pathSegments.value.slice(0, idx + 1);
  return segs.join("/");
}

function handleBreadcrumbDragOver(idx: number) {
  dragOverBreadcrumb.value = idx;
}

function handleBreadcrumbDragLeave(idx: number) {
  // 延迟清除，避免快速移动时闪烁
  setTimeout(() => {
    if (dragOverBreadcrumb.value === idx) {
      dragOverBreadcrumb.value = null;
    }
  }, 50);
}

async function handleBreadcrumbDrop(idx: number) {
  if (!draggedFile.value) return;

  const sourcePath = draggedFile.value;
  const targetDir = getBreadcrumbPath(idx);

  // 提取文件的目录路径（去掉文件名）
  const sourceDir = sourcePath.substring(0, sourcePath.lastIndexOf("/")) || "";

  // 检查是否拖到同一个目录
  if (targetDir === sourceDir) {
    dragOverBreadcrumb.value = null;
    draggedFile.value = null;
    return;
  }

  try {
    await $fetch("/api/move", {
      method: "POST",
      body: {
        sourcePath: sourcePath,
        targetDir: targetDir,
      },
    });

    await loadListing();
  } catch (error: any) {
    if (error.statusCode === 409) {
      alert("目标文件夹中已存在同名文件");
    } else {
      alert("移动文件失败：" + (error.statusMessage || "未知错误"));
    }
  } finally {
    dragOverBreadcrumb.value = null;
    draggedFile.value = null;
  }
}
</script>
