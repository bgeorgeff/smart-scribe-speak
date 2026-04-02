import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackFab } from "@/components/FeedbackFab";
import { getWords, removeWord, clearWords, type ClickedWord } from "@/lib/wordStorage";
import type { User } from "@/types";

const ReviewWords = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<ClickedWord[]>([]);
  const [user, setUser] = useState<User>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthRef.current = window.speechSynthesis;
    }
    setWords(getWords().sort((a, b) => b.clickedAt.localeCompare(a.clickedAt)));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleRemove = (word: string) => {
    removeWord(word);
    setWords((prev) => prev.filter((w) => w.word.toLowerCase() !== word.toLowerCase()));
  };

  const handleClearAll = () => {
    clearWords();
    setWords([]);
  };

  const handleSpeak = (word: string) => {
    if (!speechSynthRef.current) return;
    speechSynthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
    utterance.lang = "en-US";
    utterance.rate = 0.8;

    // Select adult voice and avoid child voices
    const voices = speechSynthRef.current.getVoices();
    if (voices.length > 0) {
      // Prefer adult voices and avoid child/young voices
      let preferredVoice = voices.find(v =>
        v.lang.startsWith('en-US') &&
        !v.name.toLowerCase().includes('child') &&
        !v.name.toLowerCase().includes('young')
      );

      // Fallback to first en-US voice if no adult voice found
      if (!preferredVoice) {
        preferredVoice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
      }

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    speechSynthRef.current.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Review Words</h1>
        </div>

        <p className="text-muted-foreground">
          Words you've clicked on while reading. Click the speaker icon to hear them again.
        </p>

        {words.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              No words saved yet. Click on words while reading to add them here.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>

            <Card className="bg-card border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {words.length} {words.length === 1 ? "Word" : "Words"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {words.map((entry) => (
                    <div
                      key={entry.word}
                      className="flex items-center justify-between py-3 gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-lg font-medium text-foreground">
                          {entry.word}
                        </span>
                        {entry.syllables && (
                          <span className="ml-3 text-lg text-muted-foreground">
                            {entry.syllables}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeak(entry.word)}
                          title="Listen"
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(entry.word)}
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <FeedbackFab user={user} />
      </div>
    </div>
  );
};

export default ReviewWords;
