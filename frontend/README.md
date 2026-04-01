# 投资账本前端

## 项目结构

前端使用 Vue 3 + Vite 构建，主要依赖包括：
- Vue 3.5.30
- Vite 8.0.1
- jspdf 4.2.1 (用于导出PDF功能)
- jspdf-autotable 5.0.7 (用于PDF表格生成)

## 环境配置

### 安装依赖

在前端目录下执行：

```bash
npm install
```

## 开发环境启动

开发环境使用 Vite 开发服务器，支持热更新和网络访问：

```bash
npm run dev
```

此命令会启动 Vite 开发服务器，并使用 `--host` 参数允许网络访问，默认端口为 5173。

## 生产环境构建与部署

### 构建生产版本

在前端目录下执行：

```bash
npm run build
```

构建产物会生成在 `dist` 目录中，包含优化后的静态文件。

### 预览生产构建

在部署前，可以预览生产构建的效果：

```bash
npm run preview
```

### 部署

将 `dist` 目录中的文件部署到任何静态文件服务器即可，例如：
- Nginx
- Apache
- Netlify
- Vercel
- GitHub Pages

## 技术栈

- **框架**: Vue 3
- **构建工具**: Vite
- **PDF 导出**: jspdf + jspdf-autotable
- **样式**: 原生 CSS

## 开发指南

1. 确保后端服务已启动（默认运行在 http://localhost:8000）
2. 执行 `npm run dev` 启动前端开发服务器
3. 在浏览器中访问 http://localhost:5173
4. 开始开发和调试

## 注意事项

- 前端开发服务器默认允许网络访问，方便团队协作和远程测试
- 生产构建会自动优化代码，减小文件体积
- 确保后端 API 地址配置正确，以便前端能够正常调用后端接口