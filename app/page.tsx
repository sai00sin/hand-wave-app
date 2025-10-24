// app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  FilesetResolver,
  GestureRecognizer,
  GestureRecognizerResult,
  NormalizedLandmark,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js';

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; emoji: string;
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(true);

  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const lastWaveTimeRef = useRef<number>(0);
  const predictingRef = useRef<boolean>(false);
  const particlesRef = useRef<Particle[]>([]);
  const emojis = ['✨', '⭐', '💖', '🎉', '🌟'];

  const PARTICLE_COUNT = 10;
  const PARTICLE_LIFE_SPAN = 100;
  const PARTICLE_GRAVITY = 0.5;

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const visionModule = await import(
          /* webpackIgnore: true */
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js'
        );

        if (canceled) return;

        // 型は d.ts から取得される
        const vision = await visionModule.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const recognizer = await visionModule.GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        if (canceled) {
          recognizer.close();
          return;
        }

        recognizerRef.current = recognizer;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;

        video.addEventListener(
          'loadeddata',
          () => {
            const canvas = canvasRef.current!;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            setLoading(false);

            if (!predictingRef.current) {
              predictingRef.current = true;
              predictLoop();
            }
          },
          { once: true }
        );
      } catch (e) {
        console.error('[DEBUG] setup error:', e);
        setLoading(false);
      }
    })();

    const predictLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const recognizer = recognizerRef.current;

      if (!video || !canvas || !recognizer) return;

      try {
        const ctx = canvas.getContext('2d')!;
        const nowInMs = Date.now();

        const results: GestureRecognizerResult =
          recognizer.recognizeForVideo(video, nowInMs);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateParticles(ctx);

        if (results.gestures.length > 0) {
          const topGesture = results.gestures[0][0];
          if (topGesture?.categoryName === 'Open_Palm' && topGesture.score > 0.7) {
            const current = Date.now();
            if (current - lastWaveTimeRef.current > 500) {
              lastWaveTimeRef.current = current;
              const lm: NormalizedLandmark | undefined = results.landmarks?.[0]?.[9];
              if (lm) {
                spawnParticles(lm.x * canvas.width, lm.y * canvas.height);
              }
            }
          }
        }
      } catch {
        // 認識中の一時的な失敗は握りつぶして継続
      }

      rafRef.current = requestAnimationFrame(predictLoop);
    };

    const spawnParticles = (x: number, y: number) => {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 1) * 8,
          size: Math.random() * (40 - 20) + 20,
          life: PARTICLE_LIFE_SPAN,
          maxLife: PARTICLE_LIFE_SPAN,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
        });
      }
    };

    const updateParticles = (ctx: CanvasRenderingContext2D) => {
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += PARTICLE_GRAVITY;
        p.life--;

        const opacity = p.life / p.maxLife;

        if (p.life > 0) {
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.font = `${p.size}px Arial`;
          ctx.fillText(p.emoji, p.x, p.y);
          ctx.restore();
        } else {
          particles.splice(i, 1);
          i--;
        }
      }
    };

    return () => {
      canceled = true;
      predictingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try { recognizerRef.current?.close(); } catch {}
      recognizerRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl md:text-2xl text-zinc-800 dark:text-zinc-100 text-center">
          Webカメラに向かって手を開くと（パー）✨が降ります
        </h1>

        {loading && (
          <div className="text-zinc-600 dark:text-zinc-300">モデルを読み込み中...</div>
        )}

        <div
          className={`relative w-[640px] h-[480px] border-2 border-zinc-800 rounded-xl overflow-hidden bg-black ${
            loading ? 'hidden' : 'block'
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full scale-x-[-1]"
          />
        </div>
      </div>
    </div>
  );
}
