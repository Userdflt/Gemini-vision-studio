import React, { useState } from 'react';
import type { GeneratedContent } from '../types';
import { GenerationMode } from '../types';
import ImageGrid from './ImageGrid';
import ImageModal from './ImageModal';

interface ResultsDisplayProps {
  content: GeneratedContent | null;
  images: string[] | null;
  generationMode: GenerationMode;
}

const ResultSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`py-6 border-b border-border last:border-b-0 ${className}`}>
    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc list-inside space-y-1.5 text-secondary-foreground">
    {items.map((item, index) => (
      <li key={index} className="text-foreground">{item}</li>
    ))}
  </ul>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ content, images, generationMode }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div className="mt-12">
        {generationMode !== GenerationMode.ImageOnly && content && (
          <div className="bg-card border border-border rounded-lg">
            <ResultSection title="Checklist" className="px-6">
              <BulletList items={content.checklist} />
            </ResultSection>

            <ResultSection title="Final One-Shot Prompt" className="px-6">
              <pre className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap font-mono text-sm">
                <code>{content.finalPrompt}</code>
              </pre>
            </ResultSection>

            <ResultSection title="Assumptions" className="px-6">
              <BulletList items={content.assumptions} />
            </ResultSection>

            <ResultSection title="Clarifying Questions" className="px-6">
              <ol className="list-decimal list-inside space-y-1.5 text-secondary-foreground">
                {content.questions.map((item, index) => (
                  <li key={index} className="text-foreground">{item}</li>
                ))}
              </ol>
            </ResultSection>
          </div>
        )}

        {generationMode !== GenerationMode.PromptOnly && images && images.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Generated Images</h3>
            <ImageGrid images={images} onImageClick={setSelectedImage} />
          </div>
        )}
      </div>
      {selectedImage && (
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </>
  );
};

export default ResultsDisplay;