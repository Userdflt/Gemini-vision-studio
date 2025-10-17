
import React from 'react';
import type { GeneratedContent } from '../types';
import { GenerationMode } from '../types';
import ImageGrid from './ImageGrid';

interface ResultsDisplayProps {
  content: GeneratedContent | null;
  images: string[] | null;
  generationMode: GenerationMode;
}

const ResultSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold text-banana-yellow mb-2 tracking-wide">{title}</h3>
    {children}
  </div>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc list-inside space-y-1 text-brand-subtle">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ content, images, generationMode }) => {
  return (
    <div className="mt-10 animate-fade-in">
      {generationMode !== GenerationMode.ImageOnly && content && (
        <div className="bg-brand-surface rounded-xl p-6 shadow-lg border border-white/10 mb-8">
          <ResultSection title="Checklist">
            <BulletList items={content.checklist} />
          </ResultSection>

          <ResultSection title="Final One-Shot Prompt">
            <pre className="bg-brand-bg p-4 rounded-lg text-brand-text whitespace-pre-wrap font-mono text-sm border border-white/10">
              <code>{content.finalPrompt}</code>
            </pre>
          </ResultSection>

          <ResultSection title="Assumptions">
            <BulletList items={content.assumptions} />
          </ResultSection>

          <ResultSection title="Clarifying Questions">
            <ol className="list-decimal list-inside space-y-1 text-brand-subtle">
              {content.questions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </ResultSection>
        </div>
      )}

      {generationMode !== GenerationMode.PromptOnly && images && images.length > 0 && (
        <div className="bg-brand-surface rounded-xl p-6 shadow-lg border border-white/10">
           <h3 className="text-2xl font-bold text-center text-banana-yellow mb-4 tracking-wide">Generated Images</h3>
           <ImageGrid images={images} />
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
