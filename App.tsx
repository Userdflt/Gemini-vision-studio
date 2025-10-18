import React, { useState, useCallback } from 'react';
import type { Part } from '@google/genai';
import { GenerationMode, GeneratedContent } from './types';
import { generatePowerPrompt, generateImages } from './services/geminiService';
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
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.PromptAndImage);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [imageCount, setImageCount] = useState<number>(4);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!brief.trim()) {
      setError('Please enter a brief.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setGeneratedImages(null);

    try {
      let briefWithContext = brief;
      const allImageFilesForPrompt: File[] = [];

      // The order is important for the model to associate text with the following image
      if (backgroundImage) {
        briefWithContext += "\n\n[Instruction] Use the following image as the background for the generation.";
        allImageFilesForPrompt.push(backgroundImage);
      }
      if (editImage) {
        briefWithContext += "\n\n[Instruction] The user wants to edit or inpaint the following image based on the brief.";
        allImageFilesForPrompt.push(editImage);
      }
      if (referenceImages.length > 0) {
        briefWithContext += `\n\n[Instruction] Use the following ${referenceImages.length} image(s) as general reference.`;
        allImageFilesForPrompt.push(...referenceImages);
      }
      
      const promptGenerationParts = await Promise.all(
        allImageFilesForPrompt.map(fileToGenerativePart)
      );
      
      let finalPromptText = '';

      if (generationMode !== GenerationMode.ImageOnly) {
        const content = await generatePowerPrompt(briefWithContext, promptGenerationParts);
        setGeneratedContent(content);
        finalPromptText = content.finalPrompt;
      } else {
        // For image-only, we still need to generate the prompt behind the scenes
        const content = await generatePowerPrompt(briefWithContext, promptGenerationParts);
        finalPromptText = `${content.finalPrompt}\nResponse Modalities: Image`;
      }
      
      if (generationMode !== GenerationMode.PromptOnly) {
        // Construct parts specifically for the image generation step.
        // Reference images have already been "baked into" the final prompt,
        // so they should not be sent to the image generation model.
        // Only background and edit images, which are the canvas for generation, should be sent.
        const imageGenerationFiles: File[] = [];
        if (backgroundImage) {
          imageGenerationFiles.push(backgroundImage);
        }
        if (editImage) {
          imageGenerationFiles.push(editImage);
        }

        const imageGenerationParts = await Promise.all(
            imageGenerationFiles.map(fileToGenerativePart)
        );

        const images = await generateImages(finalPromptText, imageCount, imageGenerationParts);
        setGeneratedImages(images);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred. Check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [brief, generationMode, referenceImages, backgroundImage, editImage, imageCount]);

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
            Nano Banana <span className="text-banana-yellow">Power Prompt & Image Generator</span>
          </h1>
          <p className="mt-2 text-lg text-brand-subtle max-w-2xl mx-auto">
            Your AI app orchestrator for turning simple briefs into stunning, prompt-perfect images.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <PromptInput
            brief={brief}
            setBrief={setBrief}
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
            imageCount={imageCount}
            setImageCount={setImageCount}
          />

          {isLoading && <Loader />}

          {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!isLoading && (generatedContent || generatedImages) && (
            <ResultsDisplay
              content={generatedContent}
              images={generatedImages}
              generationMode={generationMode}
            />
          )}
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-brand-subtle">
        <p>Built for Gemini AI Studio</p>
      </footer>
    </div>
  );
};

export default App;
