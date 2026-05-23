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
        video_url?: {
            url: string;
        };
        image_url?: {
            url: string;
        };
        text?: string;
    }>;
    error?: {
        message: string;
    };
    progress?: number;
}
export declare class SeedanceClient {
    private apiKey;
    private model;
    constructor(apiKey: string, model?: string);
    submitTask(params: SubmitParams): Promise<TaskResult>;
    queryTask(taskId: string): Promise<TaskResult>;
    pollTask(taskId: string, interval?: number, timeout?: number): Promise<TaskResult>;
    extractUrls(task: TaskResult): string[];
}
