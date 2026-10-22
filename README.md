# Globex · 我的电商选购 Agent 项目

我是 [SuperSgdk](https://github.com/SuperSgdk)，Globex 是我设计与开发的个人项目。我围绕电商选购流程，将需求理解、商品检索、方案比较、人工确认和本地订单处理串联为一个全栈 Agent 应用。

**本仓库用于展示我的项目实现、工程设计与验证记录。** 商品来自版本化样例目录，订单和库存写入本地账本；目前没有接入真实支付、物流或电商供给。真实模型、embedding 和精排属于外部依赖，基础测试不代表模型效果或生产质量达标。

## 我实现的核心能力

- 主 Agent 可直接调用工具，也可按需派发 SearchAgent、TradeAgent。
- 商品检索结合目录硬约束、Qdrant 向量、BM25 与可选 HTTP 精排。
- AG-UI/SSE 展示流式回答、商品卡和结构化交易确认。
- 个人 Markdown Skill、长期偏好和记忆变更审批。
- SQLite 保存会话、运行事件、订单与库存，支持断线恢复、事务和幂等。
- 长对话裁剪、摘要与完整工具证据回查；附回归测试和独立评测工具。

## 工程设计

Python 3.11–3.13、AgentScope 2.0.8、FastAPI、SQLite、Qdrant；React 18、TypeScript、Vite。Redis 和 Langfuse 为可选基础设施。

一次请求：React → FastAPI 身份与会话校验 → AGUIRuntime → 主 Agent → 业务工具或子 Agent → 商品/订单/持久化 → AG-UI 事件 → 页面。

`app/domain` 保存业务规则和接口；`application` 实现 Agent、工具和用例；`infrastructure` 对接模型、检索和存储；`presentation` 暴露 API；`composition.py` 装配依赖。

## 作者维护与运行记录

以下记录项目维护所需的环境和命令，不构成向访客授予使用权。维护环境为 Python 3.11–3.13、uv、Node.js 22 和 npm；依赖安装命令为：

```sh
uv sync --frozen
npm --prefix frontend ci
```

作者本机首次初始化配置时，将 `.env.example` 复制为 `.env`，已有配置保留。PowerShell：

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Linux/macOS：

```sh
test -f .env || cp .env.example .env
```

运行配置包括 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 和 `EMBEDDING_MODEL`。聊天服务须支持 OpenAI 兼容协议、工具调用和流式输出；embedding 默认复用聊天网关与密钥，也支持独立的 `EMBEDDING_BASE_URL` 和 `EMBEDDING_API_KEY`。

公开文件只保留配置项名称、不可用本机地址与通用模型占位值；实际接口、密钥和模型配置仅存于本机环境。公开评测清单不输出服务地址。

首次索引初始化可能调用 embedding 并产生费用。密钥不提交到 Git。默认本机使用 SQLite 与本地 Qdrant；本地 Qdrant 目录只允许一个后端进程使用。

终端一：

```sh
uv run python -m uvicorn app.presentation.server:app --host 127.0.0.1 --port 8000 --workers 1
```

终端二：

```sh
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

本地启动后访问 `http://127.0.0.1:5173`；该地址仅在本机有效，不是在线演示入口。后端健康检查地址为 `http://127.0.0.1:8000/health`，同样仅在本机有效。健康检查与模型、检索验收分别进行；各终端通过 Ctrl+C 停止服务。

Docker 部署配置位于 `docker/docker-compose.yaml`，维护命令为：

```sh
docker compose --env-file .env -f docker/docker-compose.yaml up -d --build
```

Docker 路径在本次发布中未执行完整部署验收。

## 项目验证

```sh
uv run python -X utf8 -m pytest -q
npm --prefix frontend test
npm --prefix frontend run build
```

基础 CI 不调用真实模型。`scripts/eval/` 保存模型评测工具，真实评测依赖外部服务配置；离线测试、旧评测或 HTTP 200 不作为真实 Agent 业务验收结论。

## 项目归属与展示范围

项目设计与开发者：[SuperSgdk](https://github.com/SuperSgdk)。AgentScope 等框架及第三方协议文件按各自来源和许可证说明保留。

本仓库展示当前项目实现。个人运行数据、会话原文、真实接口配置和原始运行日志不在公开范围内；未完成验收的能力不作为效果承诺。

- [项目状态与运行限制](docs/项目状态.md)
- [改动记录](docs/改动记录/README.md)

## 版权与使用范围

Copyright © 2026 SuperSgdk. All rights reserved.

本项目原创代码保留所有权利。本仓库允许公众浏览，以了解我的个人项目；未经我书面许可，不授权运行、使用、修改、再分发项目原创代码，或将其用于其他项目及商业用途。GitHub 平台条款规定的权利不受本声明限制。第三方依赖及契约文件遵循各自许可证。
