import React, { useState, useCallback, useEffect } from 'react';
import type { Part } from '@google/genai';
import { GenerationMode, GeneratedContent, AgentContext } from './types';
import { generatePowerPrompt, generateImages } from './services/geminiService';
import PromptInput from './components/PromptInput';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';

// --- Session Persistence Helpers ---

const SESSION_KEY = 'geminiNanoBananaSession';

// Helper to convert a File to a savable Data URL string
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read file as data URL"));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

// Helper to convert a Data URL string back to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};


const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]);
          } else {
              reject(new Error("Failed to read file as data URL"));
          }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  };

const App: React.FC = () => {
  const [brief, setBrief] = useState<string>('');
  const [editBrief, setEditBrief] = useState<string>('');
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.PromptAndImage);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [sketchImage, setSketchImage] = useState<File | null>(null);
  const [floorplanImage, setFloorplanImage] = useState<File | null>(null);
  const [relatedImageBase, setRelatedImageBase] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [imageCount, setImageCount] = useState<number>(4);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load session from localStorage on initial mount
  useEffect(() => {
    try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
            const parsed = JSON.parse(savedSession);
            setBrief(parsed.brief ?? '');
            setEditBrief(parsed.editBrief ?? '');
            setGenerationMode(parsed.generationMode ?? GenerationMode.PromptAndImage);
            setImageCount(parsed.imageCount ?? 4);

            // Restore images
            if (parsed.referenceImages) setReferenceImages(parsed.referenceImages.map((f: any) => dataURLtoFile(f.data, f.name)));
            if (parsed.backgroundImage) setBackgroundImage(dataURLtoFile(parsed.backgroundImage.data, parsed.backgroundImage.name));
            if (parsed.editImage) setEditImage(dataURLtoFile(parsed.editImage.data, parsed.editImage.name));
            if (parsed.sketchImage) setSketchImage(dataURLtoFile(parsed.sketchImage.data, parsed.sketchImage.name));
            if (parsed.floorplanImage) setFloorplanImage(dataURLtoFile(parsed.floorplanImage.data, parsed.floorplanImage.name));
            if (parsed.relatedImageBase) setRelatedImageBase(dataURLtoFile(parsed.relatedImageBase.data, parsed.relatedImageBase.name));
        }
    } catch (e) {
        console.error("Failed to load session:", e);
        localStorage.removeItem(SESSION_KEY);
    } finally {
        setIsInitialized(true);
    }
  }, []);

  // Save session to localStorage whenever inputs change
  useEffect(() => {
    if (!isInitialized) return; // Don't save until after initial load

    const saveSession = async () => {
        try {
            const sessionData = {
                brief,
                editBrief,
                generationMode,
                imageCount,
                referenceImages: await Promise.all(referenceImages.map(async f => ({ name: f.name, data: await fileToDataURL(f) }))),
                backgroundImage: backgroundImage ? { name: backgroundImage.name, data: await fileToDataURL(backgroundImage) } : null,
                editImage: editImage ? { name: editImage.name, data: await fileToDataURL(editImage) } : null,
                sketchImage: sketchImage ? { name: sketchImage.name, data: await fileToDataURL(sketchImage) } : null,
                floorplanImage: floorplanImage ? { name: floorplanImage.name, data: await fileToDataURL(floorplanImage) } : null,
                relatedImageBase: relatedImageBase ? { name: relatedImageBase.name, data: await fileToDataURL(relatedImageBase) } : null,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        } catch (e) {
            console.error("Failed to save session:", e);
        }
    };
    
    // Debounce saving to avoid excessive writes for rapid changes (like sliders)
    const handler = setTimeout(() => {
        saveSession();
    }, 500);

    return () => {
        clearTimeout(handler);
    };

  }, [brief, editBrief, generationMode, imageCount, referenceImages, backgroundImage, editImage, sketchImage, floorplanImage, relatedImageBase, isInitialized]);


  const handleGenerate = useCallback(async () => {
    if (!brief.trim() && !editImage) {
      setError('Please enter a brief.');
      return;
    }
    if (editImage && !editBrief.trim()) {
      setError('Please describe what you want to change for the masked image.');
      return;
    }
    if (editImage && (sketchImage || floorplanImage)) {
        setError('Please provide either an Image to Edit or a Base Image, but not both.');
        return;
    }
    if (sketchImage && floorplanImage) {
        setError('Please provide either a Sketch/Photo Base Image or a Floor Plan Base Image, but not both.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setGeneratedImages(null);

    try {
      let briefWithContext = brief;
      const allImageFilesForPrompt: File[] = [];
      let agentContext: AgentContext = 'default';

      if (backgroundImage) {
        briefWithContext += "\n\n[Instruction] Use the following image as the background for the generation.";
        allImageFilesForPrompt.push(backgroundImage);
      }
      if (sketchImage) {
        briefWithContext += "\n\n[Instruction] Use the following image as the structural base for an image-to-image generation. Transform it based on the brief.";
        allImageFilesForPrompt.push(sketchImage);
      }
      if (floorplanImage) {
        briefWithContext += "\n\n[Instruction] Use the following floor plan image as the structural base for an image-to-image generation. Visualize it based on the brief.";
        allImageFilesForPrompt.push(floorplanImage);
        agentContext = 'floorplan';
      }
      if (relatedImageBase) {
        briefWithContext += "\n\n[Instruction] Generate a new scene that is a logical extension or different perspective of the provided image, guided by the user's brief. The new scene must match the original's style and theme.";
        allImageFilesForPrompt.push(relatedImageBase);
        agentContext = 'relatedScene';
      }
      if (referenceImages.length > 0) {
        briefWithContext += "\n\n[Instruction] Use the following images as visual cues for style and content. These cues must be described in words in the final prompt, as they are not sent to the image model directly.";
        allImageFilesForPrompt.push(...referenceImages);
      }
      
      let imageParts: Part[] = [];

      if (generationMode === GenerationMode.ImageOnly) {
        // Direct generation, skip agents
        if (editImage) {
            const editImagePart = await fileToGenerativePart(editImage);
            imageParts.push(editImagePart);
            if (maskImage) {
                const maskImagePart = await fileToGenerativePart(maskImage);
                imageParts.push(maskImagePart);
            }
        }
        // Add other images for direct mode if needed
        const allOtherImages = [backgroundImage, sketchImage, floorplanImage, relatedImageBase, ...referenceImages].filter((f): f is File => f !== null);
        for (const file of allOtherImages) {
            imageParts.push(await fileToGenerativePart(file));
        }
        
        const finalPrompt = editImage ? editBrief : brief;
        const images = await generateImages(finalPrompt, imageCount, imageParts);
        setGeneratedImages(images);

      } else {
        // Agent-based generation
        if (editImage) {
            briefWithContext = editBrief; // Use edit brief for agent
            agentContext = 'inpainting';
            const editImagePart = await fileToGenerativePart(editImage);
            imageParts.push(editImagePart);
            if (maskImage) {
                const maskImagePart = await fileToGenerativePart(maskImage);
                imageParts.push(maskImagePart);
            }
        } else {
             // For non-edit modes, collect all relevant images for the prompt generation
            for (const file of allImageFilesForPrompt) {
                imageParts.push(await fileToGenerativePart(file));
            }
        }

        const content = await generatePowerPrompt(briefWithContext, imageParts, agentContext);
        setGeneratedContent(content);

        if (generationMode === GenerationMode.PromptAndImage) {
            // Re-create image parts for generation, as they might be different from prompt analysis
            const generationImageParts: Part[] = [];
            if(editImage) {
                generationImageParts.push(await fileToGenerativePart(editImage));
                if(maskImage) generationImageParts.push(await fileToGenerativePart(maskImage));
            } else {
                // For non-edit modes, only background/base/related images are sent to the final model
                const finalImageInputs = [backgroundImage, sketchImage, floorplanImage, relatedImageBase].filter((f): f is File => f !== null);
                for (const file of finalImageInputs) {
                    generationImageParts.push(await fileToGenerativePart(file));
                }
            }
          
            const images = await generateImages(content.finalPrompt, imageCount, generationImageParts);
            setGeneratedImages(images);
        }
      }

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [brief, editBrief, generationMode, imageCount, referenceImages, backgroundImage, editImage, maskImage, sketchImage, floorplanImage, relatedImageBase]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Gemini <span className="text-banana-yellow">Vision Studio</span>
          </h1>
          <p className="text-lg text-brand-subtle mt-2">
            Turn your simple idea into a professional image prompt, then generate stunning visuals.
          </p>
        </header>

        <PromptInput
          brief={brief}
          setBrief={setBrief}
          editBrief={editBrief}
          setEditBrief={setEditBrief}
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          referenceImages={referenceImages}
          setReferenceImages={setReferenceImages}
          backgroundImage={backgroundImage}
          setBackgroundImage={setBackgroundImage}
          editImage={editImage}
          setEditImage={setEditImage}
          sketchImage={sketchImage}
          setSketchImage={setSketchImage}
          floorplanImage={floorplanImage}
          setFloorplanImage={setFloorplanImage}
          relatedImageBase={relatedImageBase}
          setRelatedImageBase={setRelatedImageBase}
          maskImage={maskImage}
          setMaskImage={setMaskImage}
          imageCount={imageCount}
          setImageCount={setImageCount}
        />

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg animate-fade-in" role="alert">
            <p className="font-semibold">An error occurred:</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading && <Loader />}

        {!isLoading && (generatedContent || generatedImages) && (
          <ResultsDisplay 
            content={generatedContent} 
            images={generatedImages}
            generationMode={generationMode}
          />
        )}
      </main>
    </div>
  );
};

export default App;