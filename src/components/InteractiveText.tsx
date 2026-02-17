import { useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { useSyllables } from "@/hooks/useSyllables";

interface InteractiveTextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  onWordClick: (word: string) => void;
  onTextSelection: (selectedText: string) => void;
  isPlaying: boolean;
}

interface SyllablePopup {
  word: string;
  syllables: string;
  x: number;
  y: number;
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
  const popupRef = useRef<HTMLDivElement>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [syllablePopup, setSyllablePopup] = useState<SyllablePopup | null>(null);
  const { getSyllables } = useSyllables();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSyllablePopup(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSyllablePopup(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const normalizeWord = (raw: string): string => {
    let word = raw.trim().replace(/^[.,!?;:"]+|[.,!?;:"]+$/g, '');
    word = word.replace(/[\u0027\u2019\u2018\u0060\u00B4\u02BC]/g, "'");
    return word.trim();
  };

  const handleWordClick = async (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLSpanElement;
    const normalizedWord = normalizeWord(target.textContent || "");

    if (normalizedWord && /[a-zA-Z]/.test(normalizedWord)) {
      setHighlightedWord(normalizedWord);
      onWordClick(normalizedWord);

      const syllables = getSyllables(normalizedWord);
      if (syllables) {
        const rect = target.getBoundingClientRect();
        setSyllablePopup({
          word: normalizedWord,
          syllables,
          x: rect.left,
          y: rect.bottom + 4,
        });
      } else {
        setSyllablePopup(null);
      }

      setTimeout(() => setHighlightedWord(null), 2000);
    }
  };

  const speakSyllables = () => {
    if (!syllablePopup) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const syllableParts = syllablePopup.syllables
      .split("\u00b7")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    let index = 0;
    const speakNext = () => {
      if (index >= syllableParts.length) return;
      const utterance = new SpeechSynthesisUtterance(syllableParts[index]);
      utterance.lang = "en-US";
      utterance.rate = 0.6;
      utterance.onend = () => {
        index++;
        setTimeout(speakNext, 300);
      };
      synth.speak(utterance);
    };
    speakNext();
  };

  const renderInteractiveContent = (text: string) => {
    const cleanedText = text.replace(/\*\*/g, '').replace(/__/g, '');
    const words = cleanedText.split(/(\s+|[.,!?;:])/);

    return words.map((word, index) => {
      const isWord = /[a-zA-Z]/.test(word);
      const isHighlighted = highlightedWord === word.trim().replace(/[.,!?;:]/g, '');

      if (isWord) {
        return (
          <span
            key={index}
            onClick={handleWordClick}
            data-testid={`word-${index}`}
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

      {syllablePopup && (
        <div
          ref={popupRef}
          data-testid="popup-syllables"
          className="fixed z-50 bg-card border border-border rounded-md shadow-lg p-3 min-w-[120px]"
          style={{
            left: `${syllablePopup.x}px`,
            top: `${syllablePopup.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={speakSyllables}
                data-testid="button-speak-syllables"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground">Syllables</span>
            </div>
            <button
              onClick={() => setSyllablePopup(null)}
              data-testid="button-close-syllables"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-base text-foreground" style={{ fontFamily }}>
            {syllablePopup.syllables}
          </div>
        </div>
      )}
    </div>
  );
};
