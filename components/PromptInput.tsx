import React, { useRef } from 'react';
import { GenerationMode } from '../types';

interface PromptInputProps {
  brief: string;
  setBrief: (brief: string) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  onGenerate: () => void;
  isLoading: boolean;
  images: File[];
  setImages: (images: File[]) => void;
  imageCount: number;
  setImageCount: (count: number) => void;
}

const RadioOption: React.FC<{
  id: string;
  value: GenerationMode;
  currentValue: GenerationMode;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  description: string;
  disabled: boolean;
}> = ({ id, value, currentValue, onChange, label, description, disabled }) => (
  <label htmlFor={id} className={`flex p-3 rounded-lg border border-brand-surface bg-brand-surface/50 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'has-[:checked]:bg-banana-yellow/10 has-[:checked]:border-banana-yellow/50 cursor-pointer'}`}>
    <input
      type="radio"
      id={id}
      name="generationMode"
      value={value}
      checked={currentValue === value}
      onChange={onChange}
      className="shrink-0 mt-0.5 border-gray-200 rounded-full text-banana-yellow focus:ring-banana-yellow disabled:opacity-50 disabled:pointer-events-none bg-brand-bg checked:bg-banana-yellow"
      disabled={disabled}
    />
    <span className="ms-3">
      <span className="block text-sm font-semibold text-brand-text">{label}</span>
      <span className="block text-sm text-brand-subtle">{description}</span>
    </span>
  </label>
);


const PromptInput: React.FC<PromptInputProps> = ({
  brief,
  setBrief,
  generationMode,
  setGenerationMode,
  onGenerate,
  isLoading,
  images,
  setImages,
  imageCount,
  setImageCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const combined = [...images, ...selectedFiles].slice(0, 3);
      setImages(combined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const isImageGenerationDisabled = generationMode === GenerationMode.PromptOnly;

  return (
    <div className="bg-brand-surface rounded-xl p-6 shadow-lg border border-white/10">
      <label htmlFor="brief-input" className="block text-lg font-semibold mb-2 text-brand-text">
        1. Enter Your Image Brief
      </label>
      <textarea
        id="brief-input"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g., A photorealistic image of a cat astronaut exploring Mars."
        className="w-full h-32 p-3 bg-brand-bg border border-white/20 rounded-lg focus:ring-2 focus:ring-banana-yellow focus:border-banana-yellow transition-colors placeholder:text-brand-subtle"
        disabled={isLoading}
      />

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-2 text-brand-text">
          1.5 (Optional) Add Reference Images <span className="text-sm font-normal text-brand-subtle">(Max 3)</span>
        </h3>
        <div 
          className={`w-full p-4 border-2 border-dashed border-brand-subtle rounded-lg text-center transition-colors ${images.length < 3 ? 'cursor-pointer hover:border-banana-yellow hover:bg-brand-surface/50' : 'cursor-not-allowed bg-brand-bg/50'}`}
          onClick={() => images.length < 3 && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            multiple 
            accept="image/*" 
            className="hidden" 
            disabled={isLoading || images.length >= 3}
          />
          <p className="text-brand-subtle">
            {images.length >= 3 ? 'Maximum 3 images uploaded' : 'Click or drag & drop to upload'}
          </p>
        </div>
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {images.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative group aspect-square">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`preview ${index}`}
                  className="w-full h-full object-cover rounded-md"
                  onLoad={e => URL.revokeObjectURL(e.currentTarget.src)}
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
      </div>

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-3 text-brand-text">2. Choose Output</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <RadioOption 
            id="mode-both"
            value={GenerationMode.PromptAndImage}
            currentValue={generationMode}
            onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
            label="Prompt & Images"
            description="Generate a detailed prompt and images."
            disabled={isLoading}
          />
          <RadioOption 
            id="mode-prompt"
            value={GenerationMode.PromptOnly}
            currentValue={generationMode}
            onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
            label="Prompt Only"
            description="Only generate the detailed prompt text."
            disabled={isLoading}
          />
          <RadioOption 
            id="mode-image"
            value={GenerationMode.ImageOnly}
            currentValue={generationMode}
            onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
            label="Images Only"
            description="Directly generate images from your brief."
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-3 text-brand-text">3. Number of Images</h3>
        <div className={`p-4 rounded-lg bg-brand-bg border border-white/20 transition-opacity ${isImageGenerationDisabled ? 'opacity-50' : ''}`}>
            <label htmlFor="image-count-slider" className="block text-sm font-medium text-brand-subtle">Number of Images</label>
            <div className="flex items-center gap-4 mt-2">
                <input
                    id="image-count-slider"
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={imageCount}
                    onChange={(e) => setImageCount(parseInt(e.target.value, 10))}
                    disabled={isLoading || isImageGenerationDisabled}
                    className="w-full h-2 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-banana-yellow disabled:cursor-not-allowed disabled:opacity-70"
                />
                <span className="font-mono text-lg text-banana-yellow w-4 text-center">{imageCount}</span>
            </div>
        </div>
      </div>


      <div className="mt-8 text-center">
        <button
          onClick={onGenerate}
          disabled={isLoading || !brief.trim()}
          className="w-full md:w-auto bg-banana-yellow text-black font-bold py-3 px-12 rounded-full text-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? 'Generating...' : '✨ Orchestrate'}
        </button>
      </div>
    </div>
  );
};

export default PromptInput;