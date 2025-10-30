import React, { useState, useCallback, useEffect } from 'react';
import type { Part } from '@google/genai';
import { GenerationMode, GeneratedContent, AgentContext, SUPPORTED_MIME_TYPES } from './types';
import { generatePowerPrompt, generateImages } from './services/geminiService';
import { saveSession, loadSession } from './services/dbService';
import PromptInput from './components/PromptInput';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';

const GeminiVisionStudioLogo = () => (
    <div className="text-xl font-semibold text-white">
        Gemini <span className="text-blue-500">Vision</span> Studio
    </div>
);

const imageRow1 = [
    'https://ywsportfolio.netlify.app/images/ai_visual_images/sketch_to_render/sketch_1/sketch_1_render_3.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/sketch_to_render/sketch_1/sketch_1_render_4.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/sketch_to_render/sketch_2/nano-banana-image-22.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/sketch_to_render/sketch_3/sketch_3_render_3.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/model_to_render/model_1_render_1.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/text_to_render/interior_render_2.png'
  ];
  
  const imageRow2 = [
    'https://ywsportfolio.netlify.app/images/ai_visual_images/plan_to_render/plan_1_render_1.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/plan_to_render/plan_3_render_2.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/masterplan_render/masterplan_1_render_2.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/bg_add_render/first_concept_w_ppl.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/bg_add_render/related_interior_renders/interior_render_11.png',
    'https://ywsportfolio.netlify.app/images/ai_visual_images/bg_add_render/related_interior_renders/interior_render_7.png'
  ];

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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const sessionData = await loadSession();
        if (sessionData) {
          setBrief(sessionData.brief);
          setEditBrief(sessionData.editBrief);
          setGenerationMode(sessionData.generationMode);
          setImageCount(sessionData.imageCount);
          setReferenceImages(sessionData.referenceImages.filter(f => f && SUPPORTED_MIME_TYPES.includes(f.type)));
          
          if (sessionData.backgroundImage && SUPPORTED_MIME_TYPES.includes(sessionData.backgroundImage.type)) {
            setBackgroundImage(sessionData.backgroundImage);
          }
          if (sessionData.editImage && SUPPORTED_MIME_TYPES.includes(sessionData.editImage.type)) {
            setEditImage(sessionData.editImage);
          }
          if (sessionData.sketchImage && SUPPORTED_MIME_TYPES.includes(sessionData.sketchImage.type)) {
            setSketchImage(sessionData.sketchImage);
          }
          if (sessionData.floorplanImage && SUPPORTED_MIME_TYPES.includes(sessionData.floorplanImage.type)) {
            setFloorplanImage(sessionData.floorplanImage);
          }
          if (sessionData.relatedImageBase && SUPPORTED_MIME_TYPES.includes(sessionData.relatedImageBase.type)) {
            setRelatedImageBase(sessionData.relatedImageBase);
          }
        }
      } catch(e) {
        console.error("Failed to restore session", e);
      } finally {
        setIsInitialized(true);
      }
    };
    restoreSession();
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setGeneratedImages(null);

    saveSession({
      brief, editBrief, generationMode, imageCount,
      referenceImages, backgroundImage, editImage, sketchImage, floorplanImage, relatedImageBase,
    });

    try {
      let currentPrompt = brief;
      let agentContext: AgentContext = 'default';
      const imageParts: Part[] = [];

      if (editImage) {
        agentContext = 'inpainting';
        currentPrompt = editBrief;
        imageParts.push(await fileToGenerativePart(editImage));
        if (maskImage) {
          imageParts.push(await fileToGenerativePart(maskImage));
        }
      } else if (floorplanImage) {
        agentContext = 'floorplan';
        imageParts.push(await fileToGenerativePart(floorplanImage));
      } else if (relatedImageBase) {
        agentContext = 'relatedScene';
        imageParts.push(await fileToGenerativePart(relatedImageBase));
      } else if (backgroundImage) {
        agentContext = 'background';
        imageParts.push(await fileToGenerativePart(backgroundImage));
      } else if (sketchImage) {
        agentContext = 'default';
        imageParts.push(await fileToGenerativePart(sketchImage));
      }
      
      for (const refImg of referenceImages) {
        imageParts.push(await fileToGenerativePart(refImg));
      }

      if (generationMode === GenerationMode.ImageOnly) {
        const images = await generateImages(currentPrompt, imageCount, imageParts);
        setGeneratedImages(images);
      } else {
        const content = await generatePowerPrompt(currentPrompt, imageParts, agentContext);
        setGeneratedContent(content);
        if (generationMode === GenerationMode.PromptAndImage) {
          const images = await generateImages(content.finalPrompt, imageCount, imageParts);
          setGeneratedImages(images);
        }
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [
    brief, editBrief, generationMode, imageCount,
    referenceImages, backgroundImage, editImage, sketchImage, floorplanImage, relatedImageBase, maskImage
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <div className="bg-gradient-to-b from-black/20 to-transparent">
          <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex justify-between items-center border-b border-white/10">
              <GeminiVisionStudioLogo />
            </div>
          </header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 md:pt-20 md:pb-16 text-center">
            <img
              src="https://github.com/Userdflt/Gemini-vision-studio/raw/main/Gemini_Vision_Studio_logo2.png"
              alt="Gemini Vision Studio Logo"
              className="h-65 max-w-xs mx-auto mb-8 opacity-0"
              style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards' }}
            />
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white opacity-0"
              style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards' }}
            >
              Gemini Image Generation <span className="text-blue-500">Simplified</span>
            </h1>
            <p
              className="mt-6 max-w-3xl mx-auto text-lg text-gray-300 opacity-0"
              style={{ whiteSpace: 'pre-line', animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards' }}
            >
            {"\nTransform simple ideas into polished, high-quality visuals through intelligent multi-agent workflows. \n\n"}
            </p>
            <div 
              className="mt-12 relative opacity-0"
              style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s forwards' }}
            >
              <div 
                className="absolute inset-0 z-10" 
                style={{ background: 'linear-gradient(to right, hsl(var(--background)) 0%, transparent 15%, transparent 85%, hsl(var(--background)) 100%)' }} 
              />
              <div className="space-y-4 overflow-hidden animate-[fade-loop_40s_linear_infinite]">
                <div className="flex animate-[marquee_40s_linear_infinite]">
                  {[...imageRow1, ...imageRow1].map((src, index) => (
                    <div key={`row1-${index}`} className="flex-shrink-0 w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6 p-2">
                      <img src={src} alt={`Generated example ${index + 1}`} className="w-full h-auto rounded-lg aspect-[3/4] object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex animate-[marquee-reverse_40s_linear_infinite]">
                  {[...imageRow2, ...imageRow2].map((src, index) => (
                    <div key={`row2-${index}`} className="flex-shrink-0 w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6 p-2">
                      <img src={src} alt={`Generated example ${imageRow1.length + index + 1}`} className="w-full h-auto rounded-lg aspect-[3/4] object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      
        <main 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-20 opacity-0"
          style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.0s forwards' }}
        >
          {!isInitialized ? (
            <div className="flex items-center justify-center pt-20">
              <Loader />
            </div>
          ) : (
            <>
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
              {isLoading && !generatedContent && !generatedImages && <Loader />}
              {error && <div className="mt-8 text-center text-destructive bg-destructive/10 p-4 rounded-md">{error}</div>}
              {(generatedContent || generatedImages) && !isLoading && (
                <ResultsDisplay
                  content={generatedContent}
                  images={generatedImages}
                  generationMode={generationMode}
                />
              )}
            </>
          )}
        </main>
      </div>
      <footer className="w-full text-center p-6 text-xs text-muted-foreground">
        <p>Copyright © 2025 The Gemini Vision Studio Authors. All rights reserved.</p>
        <p>
            Licensed under the{' '}
            <a
                href="http://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
            >
                Apache License, Version 2.0
            </a>
            .
        </p>
      </footer>
    </div>
  );
};

export default App;