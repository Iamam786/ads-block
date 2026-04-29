import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Extend Window interface for FaceDetector
declare global {
  interface Window {
    FaceDetector: any;
  }
}

const BLUR_RADIUS = 30;
const DETECTION_INTERVAL = 100; // Face detection can be faster

export function useFaceBlur(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceDetectorRef = useRef<any>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      setIsSupported(true);
    } else {
      console.warn('FaceDetector API is not supported in this browser.');
      setIsSupported(false);
    }
  }, []);

  const initDetector = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      if (!faceDetectorRef.current) {
        // @ts-ignore - FaceDetector is experimental
        faceDetectorRef.current = new window.FaceDetector({
          maxDetectedFaces: 10,
          fastMode: true
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize FaceDetector:', error);
      return false;
    }
  }, [isSupported]);

  const applyBlurToFaces = useCallback(
    (ctx: CanvasRenderingContext2D, faces: any[]) => {
      const canvas = ctx.canvas;
      
      faces.forEach((face) => {
        const { x, y, width, height } = face.boundingBox;
        
        // Save current context state
        ctx.save();
        
        // Create a path for the face (optional: use landmarks for better shape)
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        
        // Apply blur - Simple approach: Draw a blurred version of the canvas onto itself
        // Or use filter if supported
        ctx.filter = `blur(${BLUR_RADIUS}px)`;
        ctx.drawImage(canvas, 0, 0);
        
        ctx.restore();
      });
    },
    []
  );

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isEnabled || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Match canvas size to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Run detection
    if (!detectionIntervalRef.current && faceDetectorRef.current) {
      try {
        const faces = await faceDetectorRef.current.detect(canvas);
        if (faces && faces.length > 0) {
          applyBlurToFaces(ctx, faces);
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }

      // Limit detection frequency for performance
      detectionIntervalRef.current = setTimeout(() => {
        detectionIntervalRef.current = null;
      }, DETECTION_INTERVAL);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, isEnabled, applyBlurToFaces]);

  const enableBlur = useCallback(async () => {
    if (!isSupported) {
      alert('FaceDetector API is not supported in your browser. Please use a modern browser like Chrome or Edge.');
      return;
    }

    setIsLoading(true);
    const initialized = await initDetector();
    setIsLoading(false);
    
    if (initialized) {
      setIsEnabled(true);
    }
  }, [isSupported, initDetector]);

  const disableBlur = useCallback(() => {
    setIsEnabled(false);
    if (detectionIntervalRef.current) {
      clearTimeout(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

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
    isSupported,
    isLoading,
    enableBlur,
    disableBlur,
    canvasRef,
  };
}
