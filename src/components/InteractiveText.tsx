
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

interface WordDefinition {
  word: string;
  definition: string;
  syllables?: string[]; // For future syllable breakdown feature
}

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
  const [selectedWordDef, setSelectedWordDef] = useState<WordDefinition | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || "";
      onTextSelection(selectedText);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [onTextSelection]);

  const fetchDefinition = async (word: string): Promise<string> => {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response.ok) throw new Error('Definition not found');
      
      const data = await response.json();
      const firstMeaning = data[0]?.meanings[0]?.definitions[0]?.definition;
      return firstMeaning || 'Definition not available';
    } catch (error) {
      return 'Definition not available for this word';
    }
  };

  const handleWordClick = async (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLSpanElement;
    const word = target.textContent?.trim().replace(/[.,!?;:]/g, '') || "";
    
    if (word && /^[a-zA-Z]+$/.test(word)) {
      setHighlightedWord(word);
      onWordClick(word);
      
      // Calculate popup position
      const rect = target.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Center the popup horizontally on the word
      const popupLeft = rect.left + scrollLeft + (rect.width / 2);
      
      setPopupPosition({
        top: rect.bottom + scrollTop + 8,
        left: popupLeft
      });

      // Fetch definition
      setIsLoadingDef(true);
      const definition = await fetchDefinition(word.toLowerCase());
      setSelectedWordDef({
        word: word,
        definition: definition,
        syllables: [] // Placeholder for future syllable data
      });
      setIsLoadingDef(false);
      
      // Remove highlight after speaking
      setTimeout(() => setHighlightedWord(null), 2000);
    }
  };

  const speakDefinition = () => {
    if (!speechSynthRef.current || !selectedWordDef) return;

    speechSynthRef.current.cancel();
    const textToSpeak = `${selectedWordDef.word}. ${selectedWordDef.definition}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthRef.current.speak(utterance);
  };

  const closePopup = () => {
    setSelectedWordDef(null);
    setPopupPosition(null);
  };

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

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`prose prose-lg max-w-none leading-relaxed font-${fontFamily}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
      >
        {paragraphs.map((paragraph, index) => {
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
        })}
      </div>

      {/* Definition Popup */}
      {selectedWordDef && popupPosition && (
        <Card 
          className="fixed z-[9999] shadow-xl border-2 border-primary/20 max-w-sm bg-background print:hidden"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg text-primary capitalize">
                {selectedWordDef.word}
              </h3>
              <Button
                onClick={closePopup}
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {isLoadingDef ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading definition...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedWordDef.definition}
                </p>
                
                {/* Placeholder for future syllable breakdown */}
                {selectedWordDef.syllables && selectedWordDef.syllables.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Syllables: {selectedWordDef.syllables.join(' · ')}
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={speakDefinition}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Listen to Definition
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
