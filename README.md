# Seedance MCP Server

让 Claude Code 直接调用火山引擎 Seedance API 生成 AI 视频。

## 安装

```bash
cd seedance-mcp
npm install
npm run build
```

## 配置

在 Claude Code 的 MCP 配置中添加（`~/.claude/mcp.json` 或项目 `.claude/mcp.json`）：

```json
{
  "mcpServers": {
    "seedance": {
      "command": "node",
      "args": ["C:/Users/高景涛/Desktop/高景涛/seedance-mcp/dist/index.js"],
      "env": {
        "ARK_API_KEY": "ark-a57fbfe5-00b5-446f-ac64-df35f3fc6d89-ad51c",
        "SEEDANCE_MODEL": "doubao-seedance-2-0-260128"
      }
    }
  }
}
```

## 工具列表

| 工具 | 说明 |
|------|------|
| `text_to_video` | 文生视频 — 用文字描述生成 AI 视频 |
| `image_to_video` | 图生视频 — 用图片 + 文字生成 AI 视频 |
| `poll_result` | 查询任务进度 — 轮询直到完成，返回视频 URL |

## 使用示例

在 Claude Code 对话中直接说：

- 「帮我生成一个 5 秒的猫咪晒太阳视频，1080p」
- 「这张图片做成视频，让里面的人物走起来」
- 「查询任务 cgt-xxx 的进度」

## 文件结构

```
seedance-mcp/
  src/
    index.ts            # MCP Server 入口，注册 3 个工具
    seedance-client.ts  # Seedance REST API 封装
  dist/                 # 编译输出
  package.json
  tsconfig.json
```
