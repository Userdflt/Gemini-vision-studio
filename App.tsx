
import React, { useState, useCallback, useEffect } from 'react';
import type { Part } from '@google/genai';
import { GenerationMode, GeneratedContent, AgentContext } from './types';
import { generatePowerPrompt, generateImages } from './services/geminiService';
import { saveSession, loadSession } from './services/dbService';
import PromptInput from './components/PromptInput';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';

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

  // Load session from IndexedDB on initial mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = await loadSession();
        if (savedSession) {
          setBrief(savedSession.brief ?? '');
          setEditBrief(savedSession.editBrief ?? '');
          setGenerationMode(savedSession.generationMode ?? GenerationMode.PromptAndImage);
          setImageCount(savedSession.imageCount ?? 4);

          // Files are restored directly from IndexedDB
          setReferenceImages(savedSession.referenceImages ?? []);
          setBackgroundImage(savedSession.backgroundImage ?? null);
          setEditImage(savedSession.editImage ?? null);
          setSketchImage(savedSession.sketchImage ?? null);
          setFloorplanImage(savedSession.floorplanImage ?? null);
          setRelatedImageBase(savedSession.relatedImageBase ?? null);
        }
      } catch (e) {
        console.error("Failed to load session from IndexedDB:", e);
      } finally {
        setIsInitialized(true);
      }
    };
    restoreSession();
  }, []);

  // Save session to IndexedDB whenever inputs change
  useEffect(() => {
    if (!isInitialized) return; // Don't save until after initial load

    const persistSession = async () => {
      try {
        const sessionData = {
          brief,
          editBrief,
          generationMode,
          imageCount,
          referenceImages,
          backgroundImage,
          editImage,
          sketchImage,
          floorplanImage,
          relatedImageBase,
        };
        await saveSession(sessionData);
      } catch (e) {
        console.error("Failed to save session to IndexedDB:", e);
      }
    };
    
    // Debounce saving to avoid excessive writes for rapid changes (like sliders)
    const handler = setTimeout(() => {
        persistSession();
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
        agentContext = 'background';
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
        briefWithContext += "\n\n[Instruction] Use the following images as visual cues for style and content. Describe their key features in the final prompt to reinforce their influence, as both the prompt and the images will be sent to the final image model.";
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
                // For non-edit modes, all base and reference images are sent to the final model
                const finalImageInputs = [backgroundImage, sketchImage, floorplanImage, relatedImageBase, ...referenceImages].filter((f): f is File => f !== null);
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
