# Auth Center - 统一身份认证中心

基于NestJS构建的企业级统一身份认证和授权管理系统，支持OAuth 2.0、JWT认证、权限管理和审计日志等功能。

## 🚀 功能特性

- **用户管理**: 用户注册、登录、信息管理
- **OAuth 2.0客户端管理**: 支持多客户端应用接入
- **JWT认证**: 安全的访问令牌和刷新令牌机制
- **权限控制**: 基于角色的权限管理系统
- **审计日志**: 完整的操作审计记录
- **Redis缓存**: 高性能的会话和令牌缓存
- **MySQL数据库**: 可靠的数据存储
- **OpenID Connect**: 支持标准身份认证协议

## 📋 技术栈

- **后端框架**: NestJS 11.x
- **数据库**: MySQL + TypeORM
- **缓存**: Redis + ioredis
- **认证**: JWT + Passport
- **验证**: class-validator + class-transformer
- **日志**: Winston
- **测试**: Jest + Supertest

## 🛠️ 安装和运行

### 环境要求

- Node.js >= 18.x
- MySQL >= 8.0
- Redis >= 6.0
- pnpm >= 8.x

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境配置

复制 `.env` 文件并根据需要修改配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5455
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=unified_auth

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=7

# JWT配置
JWT_SECRET=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# 应用配置
PORT=3000
NODE_ENV=development
IDP_DOMAIN=http://localhost:3000
```

### 3. 数据库初始化

确保MySQL数据库已创建，TypeORM会自动创建表结构。

### 4. 运行应用

```bash
# 开发模式（热重载）
pnpm run start:dev

# 生产模式
pnpm run start:prod

# 调试模式
pnpm run start:debug
```

## 📁 项目结构

```
auth-center/
├── src/
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middlewares/
│   │   ├── strategies/
│   │   ├── utils/
│   ├── common/
│   ├── config/
│   ├── database/
│   ├── logger/
│   ├── main.ts
├── test/
├── .env
├── .env.test
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
├── tsconfig.build.json
```


## 🔐 API接口

### 认证接口

- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `POST /auth/refresh` - 刷新令牌
- `POST /auth/logout` - 用户登出

### 用户管理接口

- `GET /users` - 获取用户列表
- `GET /users/:id` - 获取用户详情
- `PUT /users/:id` - 更新用户信息
- `DELETE /users/:id` - 删除用户

### 客户端管理接口

- `GET /clients` - 获取客户端列表
- `POST /clients` - 创建客户端
- `PUT /clients/:id` - 更新客户端
- `DELETE /clients/:id` - 删除客户端

### 权限管理接口

- `GET /permissions` - 获取权限列表
- `POST /permissions` - 创建权限
- `PUT /permissions/:id` - 更新权限

## 🔧 开发指南

### 代码规范

```bash
# 代码格式化
pnpm run format

# 代码检查
pnpm run lint
```

### 测试

```bash
# 单元测试
pnpm run test

# 测试覆盖率
pnpm run test:cov

# E2E测试
pnpm run test:e2e

# 监听模式测试
pnpm run test:watch
```

### 构建

```bash
# 构建项目
pnpm run build
```

## 🚢 部署

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install --production

COPY dist/ ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 环境变量配置

生产环境需要配置以下环境变量：

```bash
NODE_ENV=production
DB_HOST=your_production_db_host
REDIS_HOST=your_production_redis_host
JWT_SECRET=your_production_jwt_secret
```

## 📊 监控和日志

项目使用Winston进行日志管理，支持：

- 结构化日志输出
- 多级别日志（error, warn, info, debug）
- 日志文件轮转
- 审计日志记录

## 🔒 安全特性

- 密码加密存储（bcryptjs）
- JWT令牌安全验证
- SQL注入防护（TypeORM参数化查询）
- XSS防护
- CSRF防护
- 请求频率限制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**Auth Center** - 为企业提供安全可靠的身份认证解决方案。