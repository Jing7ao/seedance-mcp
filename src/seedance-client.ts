const ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

export interface SubmitParams {
  prompt: string;
  duration?: number;
  ratio?: string;
  resolution?: string;
  imageUrl?: string;
  imageRole?: "first_frame" | "reference_image";
  videoUrl?: string;
  audioUrl?: string;
  model?: string;
  generateAudio?: boolean;
  watermark?: boolean;
}

export interface TaskResult {
  id: string;
  status: string;
  content?: Array<{
    type: string;
    video_url?: { url: string };
    image_url?: { url: string };
    text?: string;
  }>;
  error?: { message: string };
  progress?: number;
}

export class SeedanceClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "doubao-seedance-2-0-260128") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async submitTask(params: SubmitParams): Promise<TaskResult> {
    const content: Array<Record<string, unknown>> = [
      { type: "text", text: params.prompt },
    ];

    if (params.imageUrl) {
      content.push({
        type: "image_url",
        image_url: { url: params.imageUrl },
        role: params.imageRole || "reference_image",
      });
    }

    if (params.videoUrl) {
      content.push({
        type: "video_url",
        video_url: { url: params.videoUrl },
        role: "reference_video",
      });
    }

    if (params.audioUrl) {
      content.push({
        type: "audio_url",
        audio_url: { url: params.audioUrl },
        role: "reference_audio",
      });
    }

    const body = {
      model: params.model || this.model,
      content,
      generate_audio: params.generateAudio ?? true,
      ratio: params.ratio || "16:9",
      duration: params.duration || 5,
      resolution: params.resolution || "720p",
      watermark: params.watermark ?? false,
    };

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(
        `Seedance API error (${resp.status}): ${JSON.stringify(err)}`
      );
    }

    const data = (await resp.json()) as TaskResult;
    return data;
  }

  async queryTask(taskId: string): Promise<TaskResult> {
    const resp = await fetch(`${ENDPOINT}/${taskId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(
        `Seedance API error (${resp.status}): ${JSON.stringify(err)}`
      );
    }

    return (await resp.json()) as TaskResult;
  }

  async pollTask(
    taskId: string,
    interval = 10,
    timeout = 3600
  ): Promise<TaskResult> {
    const start = Date.now();

    while (Date.now() - start < timeout * 1000) {
      const task = await this.queryTask(taskId);
      const status = task.status;

      if (status === "succeeded" || status === "failed" || status === "cancelled") {
        return task;
      }

      await new Promise((r) => setTimeout(r, interval * 1000));
    }

    throw new Error(`Task ${taskId} polling timeout after ${timeout}s`);
  }

  extractUrls(task: TaskResult): string[] {
    const urls: string[] = [];
    for (const item of task.content || []) {
      if (item.video_url?.url) urls.push(item.video_url.url);
      if (item.image_url?.url) urls.push(item.image_url.url);
    }
    return urls;
  }
}
