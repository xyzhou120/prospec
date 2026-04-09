# ProSpec Linux 部署文档

本文基于当前仓库实际代码和配置编写，适用于 Ubuntu、Debian、CentOS、Rocky Linux 等常见 Linux 发行版。

## 1. 项目说明

ProSpec 是一个基于 Next.js 16 的单体应用，包含前端页面和后端 API，主要能力包括：

- 上传原型文件或静态页面包
- 按版本管理上传内容
- 在线预览 HTML、图片、PDF、代码文件
- 生成只读分享链接
- 打包下载某个版本的 ZIP

当前项目的数据存储分两部分：

- 元数据：SQLite 数据库
- 文件内容：默认保存到本地磁盘

注意：

- 当前代码默认启用本地文件存储，即使配置了 MinIO 参数，也不会自动切换到 MinIO
- 只有显式设置 `USE_LOCAL_STORAGE=false` 时，应用才会使用 MinIO
- SQLite 不适合多实例同时写入，因此当前项目更适合单机部署

## 2. 部署方式建议

推荐优先级如下：

1. Docker Compose 部署
2. Node.js + PM2 + Nginx 手动部署

如果只是快速上线一个内网版本，建议直接使用 Docker Compose。

## 3. 环境要求

### 3.1 基础要求

- Linux x86_64 服务器
- Node.js 20 或更高版本
- npm 10 或更高版本
- Git
- 反向代理建议使用 Nginx

### 3.2 手动部署时的编译依赖

由于项目依赖 `better-sqlite3`，某些 Linux 环境可能需要本地编译依赖。

Ubuntu / Debian:

```bash
sudo apt update
sudo apt install -y git curl build-essential python3 pkg-config nginx
```

CentOS / Rocky:

```bash
sudo dnf install -y git curl gcc-c++ make python3 pkgconf-pkg-config nginx
```

## 4. 目录规划建议

建议将项目部署到如下目录：

```bash
/opt/prospec
```

其中建议保留以下结构：

```text
/opt/prospec
├── app                # 项目代码
├── data               # SQLite 和上传文件
└── logs               # 运行日志
```

## 5. 方式一：Docker Compose 部署

### 5.1 拉取代码

```bash
cd /opt
git clone https://github.com/xyzhou120/prospec.git
cd prospec
```

如果仓库是私有仓库，请使用有权限的账号、PAT 或 SSH key。

### 5.2 准备环境变量

新建 `.env` 文件：

```bash
cat > .env <<'EOF'
NEXT_PUBLIC_BASE_URL=http://your-domain-or-ip
DATABASE_PATH=/data/prospec.db

# 当前项目默认仍使用本地存储
USE_LOCAL_STORAGE=true

# 以下 MinIO 参数即使配置了，在 USE_LOCAL_STORAGE=true 时也不会生效
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=prospec
EOF
```

说明：

- `NEXT_PUBLIC_BASE_URL` 需要改成你的实际访问地址
- 如果你只想用本地文件存储，保留 `USE_LOCAL_STORAGE=true`
- 如果你希望真正启用 MinIO，必须改成 `USE_LOCAL_STORAGE=false`

### 5.3 本地存储模式启动

当前仓库自带的 `docker-compose.yml` 会同时启动 `app` 和 `minio`，但应用默认仍走本地文件存储。

直接启动：

```bash
docker compose up -d --build
```

启动后访问：

```text
http://服务器IP:3000
```

### 5.4 数据持久化

当前 `docker-compose.yml` 中：

- 应用数据目录挂载为 `./data:/data`
- MinIO 数据目录使用 Docker volume `minio-data`

如果当前使用本地存储，则重要数据都在：

```text
./data/prospec.db
./data/files/
```

建议定期备份整个 `data` 目录。

### 5.5 如果你要真的启用 MinIO

当前代码中只有在设置以下变量时才会走 MinIO：

```bash
USE_LOCAL_STORAGE=false
```

因此需要确保应用容器中存在这个环境变量。最简单做法是修改 `docker-compose.yml` 中 `app.environment`，加入：

```yaml
      - USE_LOCAL_STORAGE=false
```

然后重新启动：

```bash
docker compose up -d --build
```

说明：

- 启用 MinIO 后，SQLite 仍然保留
- 只是文件内容从本地磁盘切换到对象存储

### 5.6 查看运行状态

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f minio
```

### 5.7 停止和重启

```bash
docker compose stop
docker compose start
docker compose restart
```

## 6. 方式二：手动部署

这种方式适合你已经有标准 Linux 主机、PM2 和 Nginx 体系，不希望依赖 Docker。

### 6.1 安装 Node.js 20

如果系统里没有 Node.js 20，建议使用 `nvm` 或官方 NodeSource 源安装。

示例：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 6.2 拉取项目

```bash
mkdir -p /opt/prospec
cd /opt/prospec
git clone https://github.com/xyzhou120/prospec.git app
cd app
```

### 6.3 安装依赖

```bash
npm ci
```

### 6.4 配置环境变量

创建 `.env.local`：

```bash
cat > .env.local <<'EOF'
NEXT_PUBLIC_BASE_URL=https://your-domain.com
DATABASE_PATH=./data/prospec.db

# 推荐单机先用本地存储
USE_LOCAL_STORAGE=true

MINIO_ENDPOINT=localhost:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=prospec
EOF
```

然后创建数据目录：

```bash
mkdir -p data/files
```

### 6.5 构建项目

```bash
npm run build
```

### 6.6 启动项目

先直接启动验证：

```bash
npm run start
```

默认监听：

```text
http://127.0.0.1:3000
```

如果可以正常访问，再交给 PM2 托管。

### 6.7 使用 PM2 托管

安装 PM2：

```bash
sudo npm install -g pm2
```

启动：

```bash
cd /opt/prospec/app
pm2 start npm --name prospec -- start
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
pm2 logs prospec
```

## 7. Nginx 反向代理配置

建议用 Nginx 对外暴露 80/443 端口，Node 应用只监听本机 `3000`。

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置后：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

如果要上 HTTPS，建议配合 Let's Encrypt：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 8. 生产环境运维建议

### 8.1 备份

至少备份以下内容：

- `data/prospec.db`
- `data/files/`

如果启用了 MinIO，还要额外备份 MinIO 的 bucket 数据。

### 8.2 日志

Docker 部署：

```bash
docker compose logs -f app
```

PM2 部署：

```bash
pm2 logs prospec
```

### 8.3 升级流程

```bash
cd /opt/prospec/app
git pull
npm ci
npm run build
pm2 restart prospec
```

Docker 方式：

```bash
cd /opt/prospec
git pull
docker compose up -d --build
```

升级前建议先备份 `data` 目录。

## 9. 常见问题

### 9.1 为什么配置了 MinIO 但文件仍然保存在本地

因为当前代码默认值是：

```text
USE_LOCAL_STORAGE !== "false"
```

也就是说，只有你显式设置：

```bash
USE_LOCAL_STORAGE=false
```

应用才会真正使用 MinIO。

### 9.2 为什么这个项目不建议多实例部署

因为当前元数据使用 SQLite，天然更适合单机部署。多实例共享写入会带来锁竞争和一致性问题。

### 9.3 上传文件较大时需要注意什么

当前 `next.config.ts` 中设置了：

```text
serverActions.bodySizeLimit = 10mb
```

虽然这里主要影响 Server Actions，不直接等同于上传接口限制，但生产环境仍建议：

- 在 Nginx 中配置合理的 `client_max_body_size`
- 控制单次上传包体大小
- 对大文件上传做额外验证

### 9.4 分享链接是否有鉴权

当前实现中，分享页是按版本 ID 直接访问的，没有额外的登录校验、签名校验或过期机制。

因此建议：

- 先部署在内网
- 或放到受控网络环境
- 如果后续需要公网开放，建议补鉴权和分享令牌机制

## 10. 推荐部署结论

如果你当前的目标是快速上线一个稳定可用版本，建议直接采用下面这套：

1. Linux 单机
2. Docker Compose 部署
3. `USE_LOCAL_STORAGE=true`
4. Nginx 做反向代理
5. 定期备份 `data/`

这套方案和当前项目的代码结构最匹配，复杂度最低，后续迁移到 MinIO 或更完整的生产架构也比较平滑。



cd /data/prospec                                                                                                                                                        
mkdir -p data/files                                                                                                                                                     
chown -R 1001:1001 data                                                                                                                                                 
chmod -R u+rwX data                                                                                                                                                     
docker-compose down                                                                                                                                                     
docker-compose up -d 