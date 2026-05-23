# Seedance MCP Server

让 Claude Code 直接生成 AI 视频，底层调用火山引擎 Seedance 2.0 模型。

[![npm](https://img.shields.io/npm/v/seedance-mcp)](https://www.npmjs.com/package/seedance-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)

## 安装

```bash
npm install -g seedance-mcp
```

## 快速开始

### Pro 用户（推荐 · 零配置）

使用托管网关，无需自备 API Key：

```json
{
  "mcpServers": {
    "seedance": {
      "command": "node",
      "args": ["seedance-mcp"],
      "env": {
        "LICENSE_KEY": "SLIC-你的Pro License Key"
      }
    }
  }
}
```

### Free 用户（需自备 API Key）

去 [火山引擎 ARK 控制台](https://console.volcengine.com/ark) 注册获取 API Key（新用户有免费额度）：

```json
{
  "mcpServers": {
    "seedance": {
      "command": "node",
      "args": ["seedance-mcp"],
      "env": {
        "ARK_API_KEY": "你的火山引擎API Key",
        "SEEDANCE_MODEL": "doubao-seedance-2-0-260128"
      }
    }
  }
}
```

### 开始生成

在 Claude Code 对话中直接说：
- 「生成一个 5 秒的治愈系森林视频，1080p」
- 「这张图片做成视频」

---

## 定价

| 等级 | 价格 | 视频生成 | API Key |
|------|------|----------|---------|
| **Free** | 免费 | 5 次/天 | 需自备 |
| **Pro** | ￥105/年 | 无限生成 | 已内置，无需自备 |

> Pro 用户 API 调用费用已包含在订阅中，无需额外付费。

[升级 Pro →](https://paypal.me/Jing7ao)

---

## 工具

| 工具 | 说明 |
|------|------|
| `text_to_video` | 文生视频，支持 5-15s、720p/1080p、16:9/9:16/1:1 |
| `image_to_video` | 图生视频，图片作为首帧或风格参考 |
| `poll_result` | 查询任务进度，自动轮询直到完成 |
| `get_usage_stats` | 查看本月/累计生成统计 |
| `verify_license` | 查看 License 激活状态 |

## License

v1.1.0 起引入 License 系统。Free tier 每天 5 次视频生成。购买 Pro 后获得 License Key，配置到 `LICENSE_KEY` 环境变量即可无限使用。
