import { useRef, useState, useCallback, useEffect } from 'react';
export function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const getPos = useCallback((e: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);
  const startDrawing = useCallback((e: React.PointerEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setLastPoint(pos);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [getPos]);
  const draw = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !lastPoint) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const pos = getPos(e);
    // Use pressure if available for more forensic feel
    const pressure = (e.nativeEvent as PointerEvent).pressure || 0.5;
    ctx.lineWidth = 2 * (pressure * 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPoint(pos);
    setHasSignature(true);
  }, [isDrawing, lastPoint, getPos]);
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  }, []);
  const getSignatureDataUrl = useCallback((): string | null => {
    if (!hasSignature || !canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, [hasSignature]);
  return {
    canvasRef,
    isDrawing,
    hasSignature,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    getSignatureDataUrl
  };
}