import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MaskEditorProps {
  imageFile: File;
  editBrief: string;
  setEditBrief: (brief: string) => void;
  onImageRemove: () => void;
  onMaskUpdate: (maskFile: File | null) => void;
  isLoading: boolean;
}

type DrawMode = 'brush' | 'eraser';

const MaskEditor: React.FC<MaskEditorProps> = ({ imageFile, editBrief, setEditBrief, onImageRemove, onMaskUpdate, isLoading }) => {
  const [drawMode, setDrawMode] = useState<DrawMode>('brush');
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

    if (drawMode === 'brush') {
      ctx.strokeStyle = 'white';
      ctx.globalCompositeOperation = 'source-over';
    } else { // Eraser mode
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    }

    if (lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
    }
    lastPoint.current = currentPoint;
  }, [brushSize, drawMode]);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); // Prevents page scrolling on touch devices
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

  // Effect for setting up canvas and drawing the initial image.
  // This runs only when the imageFile changes.
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
      // Guard against container not being rendered yet
      if (containerWidth === 0) return; 

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
  }, [imageFile]);

  // Effect for setting up and tearing down event listeners.
  // This re-runs when draw handlers change (e.g., due to brushSize changing),
  // but it does not clear the canvas.
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const handleStart = (e: MouseEvent | TouchEvent) => startDrawing(e);
    const handleMove = (e: MouseEvent | TouchEvent) => draw(e);
    const handleEnd = () => stopDrawing();

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);

      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [startDrawing, draw, stopDrawing]);


  return (
    <div className="flex flex-col h-full">
      <h4 className="font-semibold text-foreground">Image to Edit & Mask</h4>
      <p className="text-sm text-muted-foreground mb-4">Provide a specific brief and then draw on the image to select the area you want to change.</p>
      
      <div className="mb-4">
        <label htmlFor="edit-brief-input" className="block text-sm font-semibold mb-2 text-foreground">
            Brief for Masked Area
        </label>
        <textarea
            id="edit-brief-input"
            value={editBrief}
            onChange={(e) => setEditBrief(e.target.value)}
            placeholder="e.g., 'replace the selected facade with weathered red bricks' or 'add a large oak tree in the selected grassy field'. Please use keywords like 'Selected' for improved results."
            className="w-full h-20 p-3 bg-muted border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors placeholder:text-muted-foreground"
            disabled={isLoading}
        />
      </div>
      
      <div ref={containerRef} className="relative w-full my-2 aspect-auto">
        <canvas ref={imageCanvasRef} className="absolute top-0 left-0 w-full h-auto rounded-md" />
        <canvas 
          ref={drawingCanvasRef} 
          className="relative top-0 left-0 w-full h-auto opacity-50 bg-red-500/50 rounded-md cursor-none"
          onMouseEnter={() => setIsCursorOverCanvas(true)}
          onMouseLeave={() => setIsCursorOverCanvas(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
        />
        {isCursorOverCanvas && !isLoading && (
            <div
                className="absolute rounded-full border border-white/80 bg-white/30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
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
        <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <button
                    onClick={() => setDrawMode('brush')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50 ${
                        drawMode === 'brush'
                        ? 'bg-background text-foreground font-semibold shadow-sm border border-border'
                        : 'bg-transparent text-muted-foreground hover:bg-background/50'
                    }`}
                    aria-pressed={drawMode === 'brush'}
                >
                    Brush
                </button>
                <button
                    onClick={() => setDrawMode('eraser')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50 ${
                        drawMode === 'eraser'
                        ? 'bg-background text-foreground font-semibold shadow-sm border border-border'
                        : 'bg-transparent text-muted-foreground hover:bg-background/50'
                    }`}
                    aria-pressed={drawMode === 'eraser'}
                >
                    Eraser
                </button>
            </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label htmlFor="brush-size" className="text-sm text-muted-foreground whitespace-nowrap capitalize">{drawMode} Size</label>
          <input
            id="brush-size"
            type="range"
            min="10"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={isLoading}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="font-semibold text-foreground w-8 text-center">{brushSize}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={clearMask} 
            disabled={isLoading}
            className="w-full text-sm font-medium py-1.5 px-3 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Clear Mask
          </button>
          <button 
            onClick={onImageRemove}
            disabled={isLoading}
            className="w-full text-sm font-medium py-1.5 px-3 rounded-md bg-secondary text-destructive hover:bg-muted transition-colors disabled:opacity-50"
          >
            Remove Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaskEditor;