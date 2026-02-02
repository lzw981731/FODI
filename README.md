## FODI

Fast OneDrive Index / FODI，无需服务器的 OneDrive 快速列表程序。

## 预览

- [DEMO](https://logi.im/fodi.html)

## 功能

- 指定展示路径
- 特定文件夹加密
- 无需服务器免费部署
- 基本文本、图片、音视频和 Office 三件套预览
- **支持 WebDAV** (列表, 上传, 下载, 复制, 移动)

## 部署方案

### 1. 一键部署 (推荐个人版用户)

> [!CAUTION]
> 仅支持个人版账号。建议自行创建应用以获得更稳定的体验。

1. 点击按钮一键部署到 Cloudflare Workers:
   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lzw981731/FODI)
2. 部署完成后，访问 `https://your-worker.workers.dev/deployfodi` 进行 OneDrive 授权。
3. 授权成功后即可访问主页。

### 2. 命令行部署 (适用于开发与进阶用户)

```sh
git clone https://github.com/lzw981731/FODI.git
cd FODI

# 1. 安装依赖
npm install

# 2. 配置 KV (可选但建议)
# 在控制台创建一个 KV Namespace 并将 ID 填入 wrangler.jsonc 的 kv_namespaces 部分

# 3. 部署
npm run deploy

# 4. 初始化
# 访问 https://your-worker.workers.dev/deployfodi 进行授权
```

### 3. EdgeOne 加速

如果您希望在腾讯云 EdgeOne 上部署前端部分以获得国内更好的访问速度：

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Flzw981731%2FFODI%2Ftree%2Fmaster%2Ffront-end)

## 配置说明

### 环境参数 (`wrangler.jsonc` 中的 `vars`)

您可以直接修改 `wrangler.jsonc` 或在 Cloudflare 控制台设置变量。

| 变量名 | 描述 | 默认值/示例 |
| :--- | :--- | :--- |
| `INDEX_FILENAME` | 前端主页的文件名（逻辑映射）。 | `"c.html"` |
| `EXPOSE_PATH` | 展示的起始目录。留空表示全盘展示。 | `"/Media"` |
| `REQUIRE_AUTH` | 是否开启全站强制登录。 | `false` |
| `PASSWD_FILENAME` | 存放文件夹密码的文件名（sha256 格式）。 | `".password"` |
| `PROXY_KEYWORD` | 代理下载的 URL 或关键词。**Secret 优先级最高**。 | `"https://proxy.example.com/"` |

### 安全性与 Secret 设置

对于敏感信息，建议通过 `wrangler secret` 命令设置：

```sh
# 设置 WebDAV 凭据
npx wrangler secret put USERNAME
npx wrangler secret put PASSWORD

# 设置全局代理下载地址（覆盖配置文件）
npx wrangler secret put PROXY_KEYWORD
```

## WebDAV 使用说明

FODI 支持基本的 WebDAV 协议。
- **地址**: `https://your-worker.workers.dev/`
- **账号/密码**: 通过上述 `wrangler secret` 设置的 `USERNAME` 和 `PASSWORD`。

## 更新日志

- **2025.02.12**: 实现部分 WebDAV 功能。
- **2024.09.15**: 支持上传功能（需在目录创建 `.upload` 文件）。
