import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BLUR_RADIUS = 20;
const DETECTION_INTERVAL = 250; // ms
const MIN_CONFIDENCE = 0.5;

export function useHumanBlur(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const backendRef = useRef<Promise<string> | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const ensureBackend = useCallback(async () => {
    if (!backendRef.current) {
      backendRef.current = (async () => {
        for (const backend of ['webgl', 'cpu'] as const) {
          try {
            const initialized = await tf.setBackend(backend);
            if (initialized) {
              await tf.ready();
              return backend;
            }
          } catch (error) {
            console.warn(`TensorFlow backend "${backend}" unavailable`, error);
          }
        }

        throw new Error('No TensorFlow backend available');
      })();
    }

    return backendRef.current;
  }, []);

  // Load COCO-SSD model
  const loadModel = useCallback(async () => {
    if (modelRef.current) {
      return true;
    }

    try {
      setIsLoading(true);
      await ensureBackend();
      const model = await cocoSsd.load();
      modelRef.current = model;
      return true;
    } catch (error) {
      console.error('Failed to load model:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ensureBackend]);

  // Detect persons in video frame
  const detectPersons = useCallback(
    async (video: HTMLVideoElement): Promise<BoundingBox[]> => {
      if (!modelRef.current || video.paused) return [];

      try {
        const predictions = await modelRef.current.estimateObjects(video);

        const personBoxes: BoundingBox[] = predictions
          .filter(
            (pred: any) =>
              pred.class === 'person' && pred.score >= MIN_CONFIDENCE
          )
          .map((pred: any) => ({
            x: pred.bbox[0],
            y: pred.bbox[1],
            width: pred.bbox[2],
            height: pred.bbox[3],
          }));

        return personBoxes;
      } catch (error) {
        console.error('Detection error:', error);
        return [];
      }
    },
    []
  );

  // Apply blur to specific regions
  const applyBlurToRegions = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      imageData: ImageData,
      boxes: BoundingBox[]
    ) => {
      const pixelData = imageData.data;
      const width = imageData.width;
      const height = imageData.height;

      boxes.forEach((box) => {
        const x1 = Math.max(0, Math.floor(box.x));
        const y1 = Math.max(0, Math.floor(box.y));
        const x2 = Math.min(width, Math.floor(box.x + box.width));
        const y2 = Math.min(height, Math.floor(box.y + box.height));

        // Simple pixelation blur
        for (let y = y1; y < y2; y += BLUR_RADIUS) {
          for (let x = x1; x < x2; x += BLUR_RADIUS) {
            let r = 0,
              g = 0,
              b = 0,
              a = 0;
            let count = 0;

            // Sample pixels in blur region
            for (
              let dy = 0;
              dy < BLUR_RADIUS && y + dy < y2;
              dy++
            ) {
              for (
                let dx = 0;
                dx < BLUR_RADIUS && x + dx < x2;
                dx++
              ) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                r += pixelData[idx];
                g += pixelData[idx + 1];
                b += pixelData[idx + 2];
                a += pixelData[idx + 3];
                count++;
              }
            }

            // Average and apply
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            a = Math.floor(a / count);

            for (
              let dy = 0;
              dy < BLUR_RADIUS && y + dy < y2;
              dy++
            ) {
              for (
                let dx = 0;
                dx < BLUR_RADIUS && x + dx < x2;
                dx++
              ) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                pixelData[idx] = r;
                pixelData[idx + 1] = g;
                pixelData[idx + 2] = b;
                pixelData[idx + 3] = a;
              }
            }
          }
        }
      });

      ctx.putImageData(imageData, 0, 0);
    },
    []
  );

  // Main blur processing loop
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isEnabled || video.paused) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Run detection every DETECTION_INTERVAL
    if (!detectionIntervalRef.current) {
      const boxes = await detectPersons(video);
      if (boxes.length > 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyBlurToRegions(ctx, imageData, boxes);
      }

      // Reset interval timer
      detectionIntervalRef.current = setTimeout(() => {
        detectionIntervalRef.current = null;
      }, DETECTION_INTERVAL);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, isEnabled, detectPersons, applyBlurToRegions]);

  // Enable blur effect
  const enableBlur = useCallback(async () => {
    if (modelRef.current) {
      setIsEnabled(true);
      return;
    }

    const loaded = await loadModel();
    if (loaded) {
      setIsEnabled(true);
    }
  }, [loadModel]);

  // Disable blur effect
  const disableBlur = useCallback(() => {
    setIsEnabled(false);
    if (detectionIntervalRef.current) {
      clearTimeout(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Setup and cleanup
  useEffect(() => {
    if (isEnabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (detectionIntervalRef.current) {
        clearTimeout(detectionIntervalRef.current);
      }
    };
  }, [isEnabled, processFrame]);

  return {
    isEnabled,
    isLoading,
    enableBlur,
    disableBlur,
    canvasRef,
  };
}
