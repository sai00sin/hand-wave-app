// src/types/mediapipe-vision-cdn.d.ts
declare module 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js' {
  // === 基本型 ===
  export type RunningMode = 'IMAGE' | 'VIDEO' | 'LIVE_STREAM';
  export type Delegate = 'CPU' | 'GPU';

  export interface BaseOptions {
    modelAssetPath: string;
    delegate?: Delegate;
  }

  export interface GestureRecognizerOptions {
    baseOptions: BaseOptions;
    runningMode?: RunningMode;
    numHands?: number;
  }

  export interface Category {
    categoryName: string;
    score: number;
    index?: number;
    displayName?: string;
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  }

  export interface GestureRecognizerResult {
    // 複数手・各手に対して候補が配列で返る構造
    gestures: Category[][];
    // [handIndex][landmarkIndex]
    landmarks: NormalizedLandmark[][];
    // 使わないなら省略可だが将来のために残す
    handedness?: Category[][];
  }

  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<unknown>;
  }

  export class GestureRecognizer {
    static createFromOptions(
      vision: unknown,
      options: GestureRecognizerOptions
    ): Promise<GestureRecognizer>;

    recognizeForVideo(
      video: HTMLVideoElement,
      timestampMs: number
    ): GestureRecognizerResult;

    close(): void;
  }

  export class DrawingUtils {
    constructor(ctx: CanvasRenderingContext2D);
    // ここでは使っていないが、必要ならメソッドを追加
  }
}
