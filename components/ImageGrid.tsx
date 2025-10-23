
import React from 'react';

interface ImageGridProps {
  images: string[];
  onImageClick: (src: string) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
  const handleDownload = (e: React.MouseEvent, src: string, index: number) => {
    e.stopPropagation(); // Prevent modal from opening
    const link = document.createElement('a');
    link.href = src;
    
    // Extract extension from mime type, default to png
    const mimeType = src.match(/data:([^;]+);/)?.[1] ?? 'image/png';
    const extension = mimeType.split('/')[1] ?? 'png';
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    let hours = now.getHours();
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for 12-hour format
    const hours12 = String(hours).padStart(2, '0');

    const fileName = `${year}-${month}-${day}_${hours12}-${minutes}`;
    link.download = `${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {images.map((src, index) => (
        <div 
          key={index} 
          className="relative group aspect-square bg-brand-bg rounded-lg overflow-hidden border border-white/10 cursor-pointer"
          onClick={() => onImageClick(src)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick(src); }}
          aria-label={`View larger image ${index + 1}`}
        >
          <img
            src={src}
            alt={`Generated image ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            onClick={(e) => handleDownload(e, src, index)}
            className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-black/80"
            aria-label={`Download image ${index + 1}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
