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
  maskImage,
  setMaskImage,
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
        placeholder="e.g., A photorealistic image of a cat astronaut exploring Mars. This brief provides general context."
        className="w-full h-32 p-3 bg-brand-bg border border-white/20 rounded-lg focus:ring-2 focus:ring-banana-yellow focus:border-banana-yellow transition-colors placeholder:text-brand-subtle"
        disabled={isLoading}
      />

      <div className="mt-6">
        <h3 className="block text-lg font-semibold mb-3 text-brand-text">
          1.5 (Optional) Provide Images
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!editImage && (
            <>
              <div className="bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Add a Background"
                  description="Set the scene for your image."
                  files={backgroundImage ? [backgroundImage] : []}
                  setFiles={(newFiles) => setBackgroundImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
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
                />
              </div>
            </>
          )}
          
          {editImage && (
            <div className="md:col-span-3 bg-brand-bg border border-white/10 rounded-lg p-4 h-full flex flex-col">
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
          )}

          <div className="md:col-span-3 bg-brand-bg border border-white/10 rounded-lg p-4 mt-2">
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
          disabled={isLoading || (!brief.trim() && !editImage) || (editImage && !editBrief.trim())}
          className="w-full md:w-auto bg-banana-yellow text-black font-bold py-3 px-12 rounded-full text-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? 'Generating...' : '✨ Orchestrate'}
        </button>
      </div>
    </div>
  );
};

export default PromptInput;