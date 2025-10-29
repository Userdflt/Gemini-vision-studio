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
  sketchImage: File | null;
  setSketchImage: (image: File | null) => void;
  floorplanImage: File | null;
  setFloorplanImage: (image: File | null) => void;
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
  <label htmlFor={id} className={`flex p-3 rounded-lg border bg-card transition-colors duration-200 ${disabled ? 'opacity-60 cursor-not-allowed' : 'has-[:checked]:border-secondary-foreground has-[:checked]:bg-muted cursor-pointer'}`}>
    <input
      type="radio"
      id={id}
      name="generationMode"
      value={value}
      checked={currentValue === value}
      onChange={onChange}
      className="shrink-0 mt-0.5 border-muted-foreground rounded-full text-primary focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
      disabled={disabled}
    />
    <div className="ms-3">
      <span className="block text-sm font-semibold text-card-foreground">{label}</span>
      <span className="block text-sm text-muted-foreground">{description}</span>
    </div>
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
  sketchImage,
  setSketchImage,
  floorplanImage,
  setFloorplanImage,
  relatedImageBase,
  setRelatedImageBase,
  maskImage,
  setMaskImage,
  imageCount,
  setImageCount,
}) => {
  const isImageGenerationDisabled = generationMode === GenerationMode.PromptOnly;

  // Logic to disable mutually exclusive main image uploaders
  const hasBaseImage = !!sketchImage || !!floorplanImage;
  const disableBackgroundImage = hasBaseImage || !!relatedImageBase;
  const disableSketchImage = !!backgroundImage || !!relatedImageBase || !!floorplanImage;
  const disableFloorplanImage = !!backgroundImage || !!relatedImageBase || !!sketchImage;
  const disableRelatedImage = !!backgroundImage || hasBaseImage;


  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <label htmlFor="brief-input" className="block text-base font-semibold mb-2 text-foreground">
        1. Enter Your Image Brief
      </label>
      <textarea
        id="brief-input"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g., Cinematic, photorealistic shot of a majestic lion with a golden mane, standing on a rocky cliff overlooking a misty valley at sunrise. Dramatic lighting, sharp focus on the lion. AR: 16:9"
        className="w-full h-32 p-3 bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors placeholder:text-muted-foreground"
        disabled={isLoading}
      />

      <div className="mt-6">
        <h3 className="block text-base font-semibold mb-3 text-foreground">
          2. (Optional) Provide Images
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editImage ? (
            <div className="md:col-span-2 bg-background border border-border rounded-lg p-4 h-full flex flex-col">
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
              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Add a Background"
                  description="Image to use as the background."
                  files={backgroundImage ? [backgroundImage] : []}
                  setFiles={(newFiles) => setBackgroundImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
                  disabled={disableBackgroundImage}
                />
              </div>

              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col">
                  <ImageUploader
                    title="Image to Edit & Mask"
                    description="Upload an image to edit or inpaint."
                    files={[]}
                    setFiles={(newFiles) => setEditImage(newFiles[0] || null)}
                    maxFiles={1}
                    isLoading={isLoading}
                  />
              </div>

              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Base Image (Sketch/Photo)"
                  description="Transform a sketch or photo."
                  files={sketchImage ? [sketchImage] : []}
                  setFiles={(newFiles) => setSketchImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
                  disabled={disableSketchImage}
                />
              </div>

              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                  title="Base Image (Floor Plan)"
                  description="Visualize from a floor plan."
                  files={floorplanImage ? [floorplanImage] : []}
                  setFiles={(newFiles) => setFloorplanImage(newFiles[0] || null)}
                  maxFiles={1}
                  isLoading={isLoading}
                  disabled={disableFloorplanImage}
                />
              </div>
              
              <div className="bg-background border border-border rounded-lg p-4 h-full flex flex-col">
                <ImageUploader
                    title="Generate Related Scenes"
                    description="Generate new scenes based on this image."
                    files={relatedImageBase ? [relatedImageBase] : []}
                    setFiles={(newFiles) => setRelatedImageBase(newFiles[0] || null)}
                    maxFiles={1}
                    isLoading={isLoading}
                    disabled={disableRelatedImage}
                />
            </div>
            </>
          )}
          
          <div className="md:col-span-2 bg-background border border-border rounded-lg p-4">
            <ImageUploader
              title="Image Cues"
              description="Use as style and content references (Max 3)."
              files={referenceImages}
              setFiles={setReferenceImages}
              maxFiles={3}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="block text-base font-semibold mb-3 text-foreground">3. Choose Output</h3>
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

      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="w-full md:w-auto flex-grow">
            <div className="flex items-center gap-3 w-full md:max-w-sm">
                <label htmlFor="image-count" className="text-sm font-medium text-muted-foreground whitespace-nowrap">Number of Images:</label>
                <input
                    id="image-count"
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    disabled={isLoading || isImageGenerationDisabled}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-foreground w-4 text-center">{imageCount}</span>
            </div>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
            <button
                onClick={onGenerate}
                disabled={isLoading || (!brief.trim() && !editImage)}
                className="w-full md:w-auto flex-grow bg-primary text-primary-foreground font-semibold py-2 px-6 rounded-md hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : 'Generate'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;