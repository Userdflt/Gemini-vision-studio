import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image view"
    >
      <div 
        className="relative w-auto h-auto max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
      >
        <img 
          src={imageUrl} 
          alt="Enlarged view" 
          className="block max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-brand-surface text-white rounded-full p-1.5 hover:bg-white/20 transition-opacity focus:outline-none focus:ring-2 focus:ring-banana-yellow"
          aria-label="Close enlarged image view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImageModal;
