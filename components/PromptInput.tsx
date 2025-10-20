import React from 'react';
import { GenerationMode } from '../types';
import ImageUploader from './ImageUploader';
import MaskEditor from './MaskEditor';

interface PromptInputProps {
  brief: string;
  setBrief: (brief: string) => void;
  editBrief: string;
  setEditBrief: (brief: string) => void;
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
  baseImage: File | null;
  setBaseImage: (image: File | null) => void;
  relatedImageBase: File | null;
  setRelatedImageBase: (image: File | null) => void;
  maskImage: File | null;
  setMaskImage: (image: File | null) => void;
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
  editBrief,
  setEditBrief,
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
  baseImage,
  setBaseImage,
  relatedImageBase,
  setRelatedImageBase,
  maskImage,
  setMaskImage,
  imageCount,
  setImageCount,
}) => {
  const isImageGenerationDisabled = generationMode === GenerationMode.PromptOnly;

  // Logic to disable mutually exclusive main image uploaders
  const disableBackgroundImage = !!baseImage || !!relatedImageBase;
  const disableBaseImage = !!backgroundImage || !!relatedImageBase;
  const disableRelatedImage = !!backgroundImage || !!baseImage;


  return (
    <div className="bg-brand-surface rounded-xl p-6 shadow-lg border border-white/10">
      <label htmlFor="brief-input" className="block text-lg font-semibold mb-2 text-brand-text">
        1. Enter Your Image Brief
      </label>
      <textarea
        id="brief-input"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g., A photorealistic image of a cat astronaut exploring Mars. This brief provides general context."
        className="w-full h-32 p-3 bg-brand-bg border border-white/20 rounded-lg focus:ring-2 focus:ring-banana-yellow focus:border-banana-yellow transition-colors placeholder:text-brand-subtle"
        disabled={isLoading}
      />

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-3 text-brand-text">
          1.5 (Optional) Provide Images
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editImage ? (
            <div className="md:col-span-2 bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
              <MaskEditor 
                imageFile={editImage}
                editBrief={editBrief}
                setEditBrief={setEditBrief}
                onImageRemove={() => {
                  setEditImage(null);
                  setMaskImage(null);
                  setEditBrief('');
                }}
                onMaskUpdate={setMaskImage}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <>
              <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Add a Background"
                  description="Set the scene for your image."
                  files={backgroundImage ? [backgroundImage] : []}
                  setFiles={(newFiles) => setBackgroundImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
                  disabled={disableBackgroundImage}
                />
              </div>

              <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
                  <ImageUploader
                    title="Image to Edit & Mask"
                    description="Inpaint or modify a selected area."
                    files={[]}
                    setFiles={(newFiles) => setEditImage(newFiles[0] || null)}
                    maxFiles={1}
                    isLoading={isLoading}
                  />
              </div>

              <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Base Image"
                  description="Sketch-to-image or style transfer."
                  files={baseImage ? [baseImage] : []}
                  setFiles={(newFiles) => setBaseImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
                  disabled={disableBaseImage}
                />
              </div>
              
              <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                    title="Generate Related Scenes"
                    description="Upload a context image (e.g., building exterior) to generate related scenes (e.g., interior views)."
                    files={relatedImageBase ? [relatedImageBase] : []}
                    setFiles={(newFiles) => setRelatedImageBase(newFiles[0] || null)}
                    maxFiles={1}
                    isLoading={isLoading}
                    disabled={disableRelatedImage}
                />
            </div>
            </>
          )}
          
          <div className="md:col-span-2 bg-brand-bg border border-white/10 rounded-lg p-4">
            <ImageUploader
              title="Image Cues"
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
            label="Image Only (Fast)"
            description="Use a direct prompt for faster image results."
            disabled={isLoading || !brief.trim()}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <label htmlFor="image-count" className="text-sm font-medium text-brand-subtle whitespace-nowrap">Number of Images:</label>
            <input
                id="image-count"
                type="range"
                min="1"
                max="8"
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                disabled={isLoading || isImageGenerationDisabled}
                className="w-full h-2 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-banana-yellow disabled:opacity-50"
            />
            <span className="font-semibold text-brand-text w-4 text-center">{imageCount}</span>
        </div>

        <button
            onClick={onGenerate}
            disabled={isLoading || (!brief.trim() && !editImage)}
            className="w-full sm:w-auto bg-banana-yellow text-black font-bold py-3 px-8 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
            ) : 'Generate'}
        </button>
      </div>
    </div>
  );
};

export default PromptInput;