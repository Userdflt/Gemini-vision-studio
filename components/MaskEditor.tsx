import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MaskEditorProps {
  imageFile: File;
  editBrief: string;
  setEditBrief: (brief: string) => void;
  onImageRemove: () => void;
  onMaskUpdate: (maskFile: File | null) => void;
  isLoading: boolean;
}

const MaskEditor: React.FC<MaskEditorProps> = ({ imageFile, editBrief, setEditBrief, onImageRemove, onMaskUpdate, isLoading }) => {
  const [brushSize, setBrushSize] = useState(40);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCursorOverCanvas, setIsCursorOverCanvas] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const exportMask = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas || !imageRef.current) {
      onMaskUpdate(null);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageRef.current.naturalWidth;
    tempCanvas.height = imageRef.current.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      onMaskUpdate(null);
      return;
    }
    
    // Fill with black
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the scaled mask in white
    tempCtx.drawImage(
      drawingCanvas,
      0, 0, drawingCanvas.width, drawingCanvas.height,
      0, 0, tempCanvas.width, tempCanvas.height
    );
    
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const maskFile = new File([blob], 'mask.png', { type: 'image/png' });
        onMaskUpdate(maskFile);
      } else {
        onMaskUpdate(null);
      }
    }, 'image/png');
  }, [onMaskUpdate]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
        x: 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left,
        y: 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'white'; // Draw in white for easy conversion
    ctx.globalCompositeOperation = 'source-over';

    if (lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
    }
    lastPoint.current = currentPoint;
  }, [brushSize]);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    isDrawing.current = true;
    lastPoint.current = null;
    draw(e);
  }, [draw]);
  
  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
    exportMask();
  }, [exportMask]);
  
  const clearMask = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onMaskUpdate(null);
  }, [onMaskUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    const imageCanvas = imageCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;

    if (!container || !imageCanvas || !drawingCanvas || !imageFile) return;

    const img = new Image();
    imageRef.current = img;
    img.src = URL.createObjectURL(imageFile);
    img.onload = () => {
      const containerWidth = container.clientWidth;
      const scale = containerWidth / img.naturalWidth;
      const width = containerWidth;
      const height = img.naturalHeight * scale;

      imageCanvas.width = width;
      imageCanvas.height = height;
      drawingCanvas.width = width;
      drawingCanvas.height = height;

      const imageCtx = imageCanvas.getContext('2d');
      if (imageCtx) {
        imageCtx.drawImage(img, 0, 0, width, height);
      }
      URL.revokeObjectURL(img.src);
    };

    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseleave', stopDrawing);
    
    drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    drawingCanvas.addEventListener('touchmove', draw, { passive: false });
    drawingCanvas.addEventListener('touchend', stopDrawing);

    return () => {
      drawingCanvas.removeEventListener('mousedown', startDrawing);
      drawingCanvas.removeEventListener('mousemove', draw);
      drawingCanvas.removeEventListener('mouseup', stopDrawing);
      drawingCanvas.removeEventListener('mouseleave', stopDrawing);

      drawingCanvas.removeEventListener('touchstart', startDrawing);
      drawingCanvas.removeEventListener('touchmove', draw);
      drawingCanvas.removeEventListener('touchend', stopDrawing);
    };
  }, [imageFile, startDrawing, draw, stopDrawing]);


  return (
    <div className="flex flex-col h-full">
      <h4 className="font-semibold text-brand-text">Image to Edit & Mask</h4>
      <p className="text-sm text-brand-subtle mb-4">Provide a specific brief and then draw on the image to select the area you want to change.</p>
      
      <div className="mb-4">
        <label htmlFor="edit-brief-input" className="block text-md font-semibold mb-2 text-banana-yellow">
            Brief for Masked Area
        </label>
        <textarea
            id="edit-brief-input"
            value={editBrief}
            onChange={(e) => setEditBrief(e.target.value)}
            placeholder="Describe what you want to change in the selected area. e.g., 'add a modern, curved glass roof'."
            className="w-full h-20 p-3 bg-brand-surface border border-white/20 rounded-lg focus:ring-2 focus:ring-banana-yellow focus:border-banana-yellow transition-colors placeholder:text-brand-subtle"
            disabled={isLoading}
        />
      </div>
      
      <div ref={containerRef} className="relative w-full my-2 aspect-auto">
        <canvas ref={imageCanvasRef} className="absolute top-0 left-0 w-full h-auto rounded-md" />
        <canvas 
          ref={drawingCanvasRef} 
          className="relative top-0 left-0 w-full h-auto opacity-50 bg-red-500/50 rounded-md cursor-crosshair"
          onMouseEnter={() => setIsCursorOverCanvas(true)}
          onMouseLeave={() => setIsCursorOverCanvas(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
        />
        {isCursorOverCanvas && !isLoading && (
            <div
                className="absolute rounded-full border-2 border-white bg-white/20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                    left: cursorPosition.x,
                    top: cursorPosition.y,
                    width: brushSize,
                    height: brushSize,
                }}
                aria-hidden="true"
            />
        )}
      </div>

      <div className="mt-auto pt-2">
        <div className="flex items-center gap-3 mb-3">
          <label htmlFor="brush-size" className="text-sm text-brand-subtle whitespace-nowrap">Brush Size</label>
          <input
            id="brush-size"
            type="range"
            min="10"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={isLoading}
            className="w-full h-2 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-banana-yellow"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={clearMask} 
            disabled={isLoading}
            className="w-full text-sm py-1.5 px-3 rounded-md bg-brand-surface hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Clear Mask
          </button>
          <button 
            onClick={onImageRemove}
            disabled={isLoading}
            className="w-full text-sm py-1.5 px-3 rounded-md bg-red-900/50 hover:bg-red-900/80 transition-colors disabled:opacity-50"
          >
            Remove Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaskEditor;