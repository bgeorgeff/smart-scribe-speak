import { useEffect, useRef, useState } from "react";
import { Volume2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InteractiveTextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  onWordClick: (word: string) => void;
  onTextSelection: (selectedText: string) => void;
  isPlaying: boolean;
}

// Removed interface WordDefinition and related states/functions

export const InteractiveText = ({
  content,
  fontFamily,
  fontSize,
  onWordClick,
  onTextSelection,
  isPlaying
}: InteractiveTextProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  // Removed selectedWordDef, popupPosition, isLoadingDef, speechSynthRef states

  // Removed useEffect for speech synthesis initialization
  // Removed useEffect for handling clicks outside the popup

  // Removed fetchDefinition function
  // Removed speakDefinition function

  const handleWordClick = async (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLSpanElement;
    // Strip punctuation from both beginning and end, but keep apostrophes for contractions
    const word = target.textContent?.trim().replace(/^[.,!?;:"]+|[.,!?;:"]+$/g, '') || "";

    console.log('Word clicked:', word);

    // Normalize curly apostrophes to straight apostrophes
    const normalizedWord = word.replace(/'/g, "'");

    if (normalizedWord && /^[a-zA-Z']+$/.test(normalizedWord)) {
      setHighlightedWord(normalizedWord);
      onWordClick(normalizedWord);

      // Remove highlight after a delay
      setTimeout(() => setHighlightedWord(null), 2000);
    }
  };

  // Removed closePopup function

  const renderInteractiveContent = (text: string) => {
    // Remove markdown bold formatting (** or __)
    const cleanedText = text.replace(/\*\*/g, '').replace(/__/g, '');

    // Split text into words while preserving spaces and punctuation
    const words = cleanedText.split(/(\s+|[.,!?;:])/);

    return words.map((word, index) => {
      const isWord = /[a-zA-Z]/.test(word);
      const isHighlighted = highlightedWord === word.trim().replace(/[.,!?;:]/g, '');

      if (isWord) {
        return (
          <span
            key={index}
            onClick={handleWordClick}
            className={`cursor-pointer hover:bg-accent hover:text-accent-foreground rounded px-1 transition-colors ${
              isHighlighted ? 'bg-primary text-primary-foreground' : ''
            } ${isPlaying ? 'animate-pulse' : ''}`}
            style={{ userSelect: 'text' }}
          >
            {word}
          </span>
        );
      }

      return <span key={index}>{word}</span>;
    });
  };

  const paragraphs = content.split('\n\n').filter(p => p.trim());

  const renderedContent = paragraphs.map((paragraph, index) => {
    // Check if it's a heading (starts with # or is all caps and short)
    const isHeading = paragraph.startsWith('#') ||
      (paragraph.length < 50 && paragraph === paragraph.toUpperCase());

    if (isHeading) {
      return (
        <h2
          key={index}
          className="text-2xl font-bold mb-4 mt-6 text-foreground"
          style={{ fontSize: `${fontSize * 1.4}px` }}
        >
          {renderInteractiveContent(paragraph.replace(/^#+\s*/, ''))}
        </h2>
      );
    }

    return (
      <p key={index} className="mb-4 text-foreground">
        {renderInteractiveContent(paragraph)}
      </p>
    );
  });

  return (
    <div
      ref={contentRef}
      className={`prose prose-lg max-w-none leading-relaxed font-${fontFamily}`}
      style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
    >
      {renderedContent}
    </div>
  );
};