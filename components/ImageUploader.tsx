import React, { useRef } from 'react';

interface ImageUploaderProps {
  title: string;
  description: string;
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles: number;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, description, files, setFiles, maxFiles, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = files.length < maxFiles;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const combined = [...files, ...selectedFiles].slice(0, maxFiles);
      setFiles(combined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const uploaderContent = (
    <div 
      className="mt-auto w-full p-4 border-2 border-dashed border-brand-subtle rounded-lg text-center transition-colors cursor-pointer hover:border-banana-yellow hover:bg-brand-surface/50"
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      aria-label={`Upload up to ${maxFiles} image(s)`}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        multiple={maxFiles > 1}
        accept="image/*" 
        className="hidden" 
        disabled={isLoading || !canUpload}
      />
      <p className="text-brand-subtle text-sm">Click to upload</p>
    </div>
  );

  return (
    <>
      <h4 className="font-semibold text-brand-text">{title}</h4>
      <p className="text-sm text-brand-subtle mb-2">{description}</p>
      
      {files.length > 0 && (
        <div className={`grid gap-2 my-2 ${maxFiles > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative group aspect-square bg-black/20 rounded-md overflow-hidden">
              <img 
                src={URL.createObjectURL(file)} 
                alt={`preview ${index}`}
                className="w-full h-full object-contain"
                onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
              />
              <button 
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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
    </>
  );
}

export default ImageUploader;