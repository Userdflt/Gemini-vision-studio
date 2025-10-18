import React, { useRef } from 'react';
import { GenerationMode } from '../types';

interface PromptInputProps {
  brief: string;
  setBrief: (brief: string) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  onGenerate: () => void;
  isLoading: boolean;
  referenceImages: File[];
  setReferenceImages: (images: File[]) => void;
  backgroundImage: File | null;
  setBackgroundImage: (image: File | null) => void;
  editImage: File | null;
  setEditImage: (image: File | null) => void;
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

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
      <h4 className="font-semibold text-brand-text">{title}</h4>
      <p className="text-sm text-brand-subtle mb-2">{description}</p>
      
      {files.length > 0 && (
        <div className={`grid gap-2 my-2 ${maxFiles > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {files.map((file, index) => (
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

      {canUpload && (
         <div 
          className="mt-auto w-full p-4 border-2 border-dashed border-brand-subtle rounded-lg text-center transition-colors cursor-pointer hover:border-banana-yellow hover:bg-brand-surface/50"
          onClick={() => fileInputRef.current?.click()}
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
      )}
    </div>
  );
}


const PromptInput: React.FC<PromptInputProps> = ({
  brief,
  setBrief,
  generationMode,
  setGenerationMode,
  onGenerate,
  isLoading,
  referenceImages,
  setReferenceImages,
  backgroundImage,
  setBackgroundImage,
  editImage,
  setEditImage,
  imageCount,
  setImageCount,
}) => {
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
        placeholder="e.g., A photorealistic image of a cat astronaut exploring Mars. If editing, describe the change, like 'add a red bow'."
        className="w-full h-32 p-3 bg-brand-bg border border-white/20 rounded-lg focus:ring-2 focus:ring-banana-yellow focus:border-banana-yellow transition-colors placeholder:text-brand-subtle"
        disabled={isLoading}
      />

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-3 text-brand-text">
          1.5 (Optional) Provide Images
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploader
            title="Add a Background"
            description="Set the scene for your image."
            files={backgroundImage ? [backgroundImage] : []}
            setFiles={(newFiles) => setBackgroundImage(newFiles[0] || null)}
            maxFiles={1}
            isLoading={isLoading}
          />
          <ImageUploader
            title="Image to Edit"
            description="Inpaint or modify an existing image."
            files={editImage ? [editImage] : []}
            setFiles={(newFiles) => setEditImage(newFiles[0] || null)}
            maxFiles={1}
            isLoading={isLoading}
          />
          <div className="md:col-span-2">
            <ImageUploader
              title="Reference Images"
              description="Provide style or content examples (Max 3)."
              files={referenceImages}
              setFiles={setReferenceImages}
              maxFiles={3}
              isLoading={isLoading}
            />
          </div>
        </div>
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