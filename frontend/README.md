# 投资账本前端

## 项目结构

前端使用 Vue 3 + Vite 构建，主要依赖包括：

- Vue 3.5.30
- Vite 8.0.1
- @vitejs/plugin-vue 6.0.5
- jspdf 4.2.1（PDF 导出）
- jspdf-autotable 5.0.7（PDF 表格生成）

## 环境配置

### 安装依赖

在前端目录下执行：

```bash
npm install
```

## 开发环境启动

```bash
npm run dev
```

启动 Vite 开发服务器，使用 `--host` 参数允许网络访问，默认端口 `5173`。

开发时前端通过 Vite 代理将 `/api` 请求转发到后端 `http://localhost:8000`，确保后端已启动。

## 生产环境构建与部署

### 构建生产版本

```bash
npm run build
```

构建产物生成在 `dist` 目录中。

### 预览生产构建

```bash
npm run preview
```

### 部署

将 `dist` 目录中的文件部署到任何静态文件服务器，例如：

- Nginx（推荐，项目已提供 `nginx.conf`）
- Apache
- Netlify / Vercel / GitHub Pages

## 技术栈

- **框架**: Vue 3（`<script setup>` SFC）
- **构建工具**: Vite
- **PDF 导出**: jspdf + jspdf-autotable
- **数据交互**: 原生 fetch（封装在 `web/lib/api.js`）
- **导入导出**: JSON / CSV / PDF（封装在 `web/lib/io.js`）
- **样式**: 原生 CSS

## 开发指南

1. 确保后端服务已启动（默认 `http://localhost:8000`）
2. 执行 `npm run dev` 启动前端开发服务器
3. 在浏览器中访问 `http://localhost:5173`
4. 开始开发和调试

## 注意事项

- 前端开发服务器允许网络访问，方便远程调试
- 生产构建由 Nginx 统一处理，API 代理配置在 `nginx.conf` 中
- 确保后端 API 地址配置正确（开发环境通过 `vite.config.js` 代理，生产环境通过 Nginx 代理）
