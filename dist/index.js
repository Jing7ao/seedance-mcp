import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SeedanceClient } from "./seedance-client.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
const API_KEY = process.env.ARK_API_KEY || "";
const MODEL = process.env.SEEDANCE_MODEL || "doubao-seedance-2-0-260128";
if (!API_KEY) {
    console.error("错误: 请设置 ARK_API_KEY 环境变量");
    process.exit(1);
}
const client = new SeedanceClient(API_KEY, MODEL);
// ============================================
// Usage tracking (for pay-per-use billing)
// ============================================
const USAGE_FILE = join(homedir(), ".seedance_usage.json");
function loadUsage() {
    if (existsSync(USAGE_FILE)) {
        try {
            return JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
        }
        catch { /* corrupted, reset */ }
    }
    return { totalVideos: 0, totalDuration: 0, thisMonth: 0, month: new Date().getMonth(), history: [] };
}
function trackUsage(taskId, duration, resolution) {
    const now = new Date();
    const usage = loadUsage();
    if (usage.month !== now.getMonth()) {
        usage.thisMonth = 0;
        usage.month = now.getMonth();
    }
    usage.totalVideos++;
    usage.totalDuration += duration;
    usage.thisMonth++;
    usage.history.push({
        date: now.toISOString(),
        taskId,
        duration,
        resolution,
    });
    mkdirSync(dirname(USAGE_FILE), { recursive: true });
    writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
    console.error(`[Usage] 本月: ${usage.thisMonth} | 累计: ${usage.totalVideos} 条`);
}
const server = new McpServer({
    name: "seedance-mcp",
    version: "1.0.0",
});
// ============================================
// 工具 1: 文生视频
// ============================================
server.tool("text_to_video", "用文字描述生成 AI 视频（文生视频）。支持 5-15 秒，多种分辨率和画面比例。", {
    prompt: z.string().describe("视频描述（中文或英文），越详细效果越好"),
    duration: z.number().min(5).max(15).default(5).describe("视频时长（秒）"),
    resolution: z.enum(["720p", "1080p"]).default("720p").describe("分辨率"),
    ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9").describe("画面比例"),
}, async ({ prompt, duration, resolution, ratio }) => {
    const task = await client.submitTask({
        prompt,
        duration,
        resolution,
        ratio,
    });
    trackUsage(task.id, duration, resolution);
    return {
        content: [
            {
                type: "text",
                text: [
                    `视频任务已提交`,
                    `任务ID: ${task.id}`,
                    `提示词: ${prompt}`,
                    `时长: ${duration}s | 分辨率: ${resolution} | 比例: ${ratio}`,
                    ``,
                    `使用 poll_result 工具查询进度：`,
                    `  poll_result --task-id ${task.id}`,
                    `或手动到方舟控制台查看。`,
                ].join("\n"),
            },
        ],
    };
});
// ============================================
// 工具 2: 图生视频
// ============================================
server.tool("image_to_video", "用一张图片作为首帧或参考图，生成 AI 视频（图生视频）。", {
    prompt: z.string().describe("描述图片要如何动起来"),
    imageUrl: z.string().describe("图片 URL（需公网可访问）"),
    role: z
        .enum(["first_frame", "reference_image"])
        .default("first_frame")
        .describe("图片角色: first_frame=视频首帧, reference_image=风格参考"),
    duration: z.number().min(5).max(15).default(5).describe("视频时长（秒）"),
    resolution: z.enum(["720p", "1080p"]).default("720p").describe("分辨率"),
    ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9").describe("画面比例"),
}, async ({ prompt, imageUrl, role, duration, resolution, ratio }) => {
    const task = await client.submitTask({
        prompt,
        imageUrl,
        imageRole: role,
        duration,
        resolution,
        ratio,
    });
    trackUsage(task.id, duration, resolution);
    return {
        content: [
            {
                type: "text",
                text: [
                    `图生视频任务已提交`,
                    `任务ID: ${task.id}`,
                    `图片角色: ${role === "first_frame" ? "首帧" : "参考图"}`,
                    `提示词: ${prompt}`,
                    ``,
                    `使用 poll_result --task-id ${task.id} 查询进度。`,
                ].join("\n"),
            },
        ],
    };
});
// ============================================
// 工具 3: 查询任务进度
// ============================================
server.tool("poll_result", "查询视频生成任务的状态和结果。完成后会返回视频下载 URL。", {
    taskId: z.string().describe("任务 ID（由 text_to_video 或 image_to_video 返回）"),
    wait: z.boolean().default(true).describe("是否等待任务完成（true=自动轮询直到完成）"),
    interval: z.number().min(5).max(60).default(10).describe("轮询间隔（秒）"),
}, async ({ taskId, wait, interval }) => {
    let task;
    if (wait) {
        task = await client.pollTask(taskId, interval, 3600);
    }
    else {
        task = await client.queryTask(taskId);
    }
    const statusEmoji = {
        queued: "⏳",
        running: "🔄",
        succeeded: "✅",
        failed: "❌",
        cancelled: "🚫",
    };
    const status = task.status;
    const emoji = statusEmoji[status] || "❓";
    if (status === "succeeded") {
        const urls = client.extractUrls(task);
        return {
            content: [
                {
                    type: "text",
                    text: [
                        `${emoji} 任务完成！`,
                        `任务ID: ${taskId}`,
                        ``,
                        `产物 URL（24小时内有效，请及时下载）：`,
                        ...urls.map((u) => `  ${u}`),
                        ``,
                        `下载命令: python seedance/poll.py --task-id ${taskId} --download`,
                    ].join("\n"),
                },
            ],
        };
    }
    if (status === "failed") {
        return {
            content: [
                {
                    type: "text",
                    text: `${emoji} 任务失败: ${task.error?.message || "未知错误"}`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: [
                    `${emoji} 状态: ${status}`,
                    `任务ID: ${taskId}`,
                    task.progress ? `进度: ${task.progress}%` : "",
                    `使用 poll_result --task-id ${taskId} 继续查询。`,
                ].join("\n"),
            },
        ],
    };
});
// ============================================
// 工具 4: 查询用量统计
// ============================================
server.tool("get_usage_stats", "查询当前账号的 Seedance 视频生成用量统计（本月/累计）。用于用量监控和计费。", {}, async () => {
    const usage = loadUsage();
    return {
        content: [
            {
                type: "text",
                text: [
                    `Seedance 用量统计`,
                    `本月生成: ${usage.thisMonth} 条`,
                    `累计生成: ${usage.totalVideos} 条`,
                    `累计时长: ${usage.totalDuration}s`,
                    ``,
                    usage.history.length > 0 ? `最近 5 条:` : "",
                    ...usage.history.slice(-5).reverse().map((h) => `  ${h.date.slice(0, 10)} | ${h.taskId} | ${h.duration}s ${h.resolution}`),
                ].join("\n"),
            },
        ],
    };
});
// ============================================
// 启动服务器
// ============================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Seedance MCP Server v1.0.0 已启动`);
    console.error(`模型: ${MODEL}`);
}
main().catch((err) => {
    console.error("启动失败:", err);
    process.exit(1);
});
