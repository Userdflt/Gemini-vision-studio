import React, { useRef, useState } from 'react';
import { SUPPORTED_MIME_TYPES } from '../types';

interface ImageUploaderProps {
  title: string;
  description: string;
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles: number;
  isLoading: boolean;
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, description, files, setFiles, maxFiles, isLoading, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const isComponentDisabled = isLoading || disabled;
  const canUpload = files.length < maxFiles && !isComponentDisabled;

  const processFiles = (selectedFiles: File[]) => {
    if (!canUpload) return;
    const imageFiles = selectedFiles.filter(file => SUPPORTED_MIME_TYPES.includes(file.type));
    if(imageFiles.length === 0) return;

    const combined = [...files, ...imageFiles].slice(0, maxFiles);
    setFiles(combined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      if(canUpload) setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if(canUpload) {
        e.dataTransfer.dropEffect = 'copy';
    } else {
        e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (canUpload && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const uploaderContent = (
    <div 
      className={`flex-grow flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
        isComponentDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${
        isDragging ? 'border-ring bg-muted' : 'border-border hover:border-ring'
      }`}
      onClick={() => !isComponentDisabled && fileInputRef.current?.click()}
      role="button"
      tabIndex={isComponentDisabled ? -1 : 0}
      onKeyDown={(e) => { if (!isComponentDisabled && (e.key === 'Enter' || e.key === ' ')) fileInputRef.current?.click(); }}
      aria-label={`Upload up to ${maxFiles} image(s)`}
      aria-disabled={isComponentDisabled}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        multiple={maxFiles > 1}
        accept={SUPPORTED_MIME_TYPES.join(',')}
        className="hidden" 
        disabled={!canUpload}
      />
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p className="text-muted-foreground text-sm pointer-events-none">
        {isDragging 
          ? 'Drop files to upload' 
          : <><span className="font-medium text-foreground">Click to upload</span> or drag and drop</>
        }
      </p>
    </div>
  );

  return (
    <div 
      className="h-full flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      
      {files.length > 0 && (
        <div className={`grid gap-2 my-2 ${maxFiles > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative group aspect-square bg-muted rounded-md overflow-hidden border border-border">
              <img 
                src={URL.createObjectURL(file)} 
                alt={`preview ${index}`}
                className="w-full h-full object-contain"
                onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
              />
              <button 
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-background/60 text-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove image"
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {canUpload && uploaderContent}
    </div>
  );
};

export default ImageUploader;