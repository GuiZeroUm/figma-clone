import React, { useEffect, useState, useRef } from "react";
import { fabric } from "fabric";

interface KVCanvasProps {
  editorCanvasRef: React.RefObject<HTMLCanvasElement>;
  onCanvasReady: (canvas: fabric.Canvas) => void;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const KVCanvas = ({ editorCanvasRef, onCanvasReady }: KVCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasInstanceRef = useRef<fabric.Canvas | null>(null);
  const [scale, setScale] = useState(1);

  // Inicializar o canvas apenas uma vez
  useEffect(() => {
    if (!editorCanvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(editorCanvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#1a1a1a",
    });

    canvasInstanceRef.current = canvas;
    onCanvasReady(canvas);

    return () => {
      canvas.dispose();
      canvasInstanceRef.current = null;
    };
  }, []);

  // Gerenciar o redimensionamento separadamente
  useEffect(() => {
    if (!containerRef.current || !canvasInstanceRef.current) return;

    const updateCanvasScale = () => {
      if (!containerRef.current || !canvasInstanceRef.current) return;

      const containerHeight = 600;
      const containerWidth = containerRef.current.clientWidth;

      const scaleY = containerHeight / CANVAS_HEIGHT;
      const scaleX = containerWidth / CANVAS_WIDTH;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);

      canvasInstanceRef.current.setZoom(newScale);
      canvasInstanceRef.current.setWidth(CANVAS_WIDTH * newScale);
      canvasInstanceRef.current.setHeight(CANVAS_HEIGHT * newScale);
      canvasInstanceRef.current.renderAll();
    };

    updateCanvasScale();

    const resizeHandler = () => {
      requestAnimationFrame(updateCanvasScale);
    };

    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  return (
    <div className='w-2/3'>
      <span className='text-sm text-primary-grey-300'>Editor</span>
      <div
        ref={containerRef}
        className='mt-2 flex h-[600px] items-center justify-center overflow-hidden rounded-md border border-primary-grey-200 bg-[#121212]'
      >
        <div
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
          }}
        >
          <canvas ref={editorCanvasRef} />
        </div>
      </div>
    </div>
  );
};

export default KVCanvas;
