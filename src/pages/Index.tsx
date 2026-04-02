import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Square, Mic, Settings, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FontSelector } from "@/components/FontSelector";
import { InteractiveText } from "@/components/InteractiveText";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Auth } from "@/components/Auth";
import { ResetPassword } from "@/components/ResetPassword";
import { ContentToolbar } from "@/components/ContentToolbar";
import { SavedContentList } from "@/components/SavedContentList";
import { FeedbackFab } from "@/components/FeedbackFab";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { User, SavedContent } from "@/types";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("dyslexic-arial");
  const [content, setContent] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [user, setUser] = useState<User>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);

  const { toast } = useToast();
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const contentCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  // Check auth status
  useEffect(() => {
    // Check for password reset redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") {
      setIsResettingPassword(true);
      window.history.replaceState({}, document.title, "/");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      // Check if this is a password recovery event
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const generateContent = async () => {
    if (!topic.trim() || !gradeLevel) {
      toast({
        title: "Missing Information",
        description: "Please enter a topic and select a grade level.",
        variant: "destructive",
      });
      return;
    }

    await generateContentWithGrade(gradeLevel);
  };

  const generateContentWithGrade = async (grade: string) => {
    setIsGenerating(true);
    setContent("");
    setCitations([]);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        const increment = prev < 30 ? 3 : prev < 60 ? 2 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 500);

    try {
      const userDate = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { data, error } = await supabase.functions.invoke('generate-educational-content', {
        body: {
          topic: topic.trim(),
          gradeLevel: grade,
          userDate: userDate.toISOString(),
          userTimezone: userTimezone
        }
      });

      if (error) throw error;

      clearInterval(progressInterval);
      setProgress(100);
      setContent(data.content);
      setCitations(data.citations || []);
      setShowFeedbackPrompt(false);
      setTimeout(() => setShowFeedbackPrompt(true), 3000);

      toast({
        title: "Content Generated!",
        description: "Your educational content is ready to read.",
      });

      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        contentCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 800);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const speakText = (text: string) => {
    if (!speechSynthRef.current) return;

    speechSynthRef.current.cancel();

    // Normalize apostrophes and convert to lowercase for TTS compatibility
    // The Web Speech API has issues with uppercase text, especially contractions like "It's"
    const normalizedText = text.replace(/[''`]/g, "'").toLowerCase();

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Select the best available voice for English
    // Prefer adult voices and avoid child/young voices
    const voices = speechSynthRef.current.getVoices();
    if (voices.length > 0) {
      // On iOS, look for default or Premium voices and avoid child voices
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

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechSynthRef.current.speak(utterance);
  };

  const stopSpeech = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const playSelectedText = () => {
    if (selectedText.trim()) {
      // Remove quotation marks but preserve apostrophes in contractions
      const cleanedSelection = selectedText.replace(/[""]/g, '').replace(/'/g, "'");
      speakText(cleanedSelection);
    } else if (content.trim()) {
      // Remove markdown heading symbols and quotation marks, but preserve apostrophes
      const cleanedContent = content.replace(/^#+\s*/gm, '').replace(/[""]/g, '').replace(/'/g, "'");
      speakText(cleanedContent);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      try {
        setIsTranscribing(true);
        const { audio: audioData, mimeType } = await stopRecording();

        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: { audio: audioData, mimeType }
        });

        if (error) throw error;

        setTopic(data.text);
        toast({
          title: "Success",
          description: "Voice recorded and transcribed successfully!",
        });
      } catch (error) {
        console.error('Error transcribing audio:', error);
        toast({
          title: "Error",
          description: "Failed to transcribe audio. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsTranscribing(false);
      }
    } else {
      try {
        await startRecording();
        toast({
          title: "Recording",
          description: "Speak your topic now...",
        });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: "Error",
          description: "Failed to access microphone. Please check permissions.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveContent = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to save content.",
        variant: "destructive",
      });
      return;
    }

    if (!content) {
      toast({
        title: "No Content",
        description: "Generate content first before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('saved_content')
        .insert({
          user_id: user.id,
          topic,
          grade_level: gradeLevel,
          content,
          citations,
          font_family: fontFamily,
          font_size: fontSize.toString(),
        });

      if (error) throw error;

      toast({
        title: "Content Saved!",
        description: "Your educational content has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Save Failed",
        description: "Could not save content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintContent = () => {
    if (!content) {
      toast({
        title: "No Content",
        description: "Generate content first before printing.",
        variant: "destructive",
      });
      return;
    }

    window.print();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  const handleLoadSavedContent = (savedItem: SavedContent) => {
    setTopic(savedItem.topic);
    setGradeLevel(savedItem.grade_level);
    setContent(savedItem.content);
    setCitations(savedItem.citations || []);
    setFontFamily(savedItem.font_family || "dyslexic-arial");
    setFontSize(savedItem.font_size ? parseInt(savedItem.font_size) : 18);

    toast({
      title: "Content Loaded",
      description: "Your saved passage has been loaded.",
    });

    // Scroll to the loaded content after a brief delay to ensure rendering
    setTimeout(() => {
      contentCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const gradeOptions = [
    { value: "1", label: "1st Grade" },
    { value: "2", label: "2nd Grade" },
    { value: "3", label: "3rd Grade" },
    { value: "4", label: "4th Grade" },
    { value: "5", label: "5th Grade" },
    { value: "6", label: "6th Grade" },
    { value: "7", label: "7th Grade" },
    { value: "8", label: "8th Grade" },
    { value: "9", label: "9th Grade" },
    { value: "10", label: "10th Grade" },
    { value: "11", label: "11th Grade" },
    { value: "12", label: "12th Grade" },
  ];

  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <ResetPassword onComplete={() => setIsResettingPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="text-center space-y-6 py-12 print:hidden">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground animate-fade-in leading-snug break-words">
            Learn <span className="text-primary italic">anything</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground animate-fade-in max-w-2xl mx-auto leading-relaxed">
            Read About Any Topic At Any Grade Level
          </p>
          {user && (
            <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
              <Button onClick={() => navigate("/review-words")} variant="ghost" size="sm" data-testid="button-review-words">
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                Review Words
              </Button>
              {user.email === "bgeorgeff@protonmail.com" && (
                <Button onClick={() => navigate("/syllable-editor")} variant="ghost" size="sm" data-testid="button-syllable-editor">
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Syllable Editor
                </Button>
              )}
              <Button onClick={handleSignOut} variant="ghost" size="sm" data-testid="button-sign-out">
                Sign Out
              </Button>
            </div>
          )}
        </header>

        {!user ? (
          <div className="print:hidden">
            <Auth />
          </div>
        ) : (
          <>
            <Card className="bg-card border-border/50 shadow-elegant print:hidden">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground font-semibold">
                  Content Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Topic</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., how to throw a football spiral; photosynthesis; World War II"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full"
                        data-testid="input-topic"
                      />
                      <Button
                        type="button"
                        onClick={handleMicClick}
                        disabled={isTranscribing}
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon"
                        className="shrink-0"
                        title={isRecording ? "Stop recording" : "Start voice recording"}
                        data-testid="button-mic"
                      >
                        {isTranscribing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade Level</label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FontSelector value={fontFamily} onChange={setFontFamily} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Font Size: {fontSize}px
                    </label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      min={10}
                      max={48}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <Button
                    onClick={generateContent}
                    disabled={isGenerating || !topic.trim() || !gradeLevel}
                    className="w-full bg-primary text-primary-foreground shadow-elegant transition-all duration-300 text-lg py-7 rounded-xl font-medium"
                    size="lg"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin inline-block" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                  {isGenerating && (
                    <div className="mt-3 space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {progress < 30 ? "Researching topic..." : progress < 60 ? "Writing content..." : progress < 90 ? "Formatting for grade level..." : "Almost done..."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {content && (
              <>
                <div className="print:hidden">
                  <ContentToolbar
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    onFontFamilyChange={setFontFamily}
                    onFontSizeChange={setFontSize}
                    onSave={handleSaveContent}
                    onPrint={handlePrintContent}
                    isSaving={isSaving}
                  />
                </div>

                <Card ref={contentCardRef} className="bg-card border-border/50 shadow-elegant animate-fade-in print:shadow-none print:border-none print:bg-white">
                  <CardHeader className="print:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-2xl text-foreground font-semibold">
                        Generated Content
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Change Grade:</span>
                          <Select value={gradeLevel} onValueChange={(newGrade) => {
                            setGradeLevel(newGrade);
                            if (topic.trim()) {
                              generateContentWithGrade(newGrade);
                            }
                          }}>
                            <SelectTrigger className="w-32" data-testid="select-change-grade">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {gradeOptions.map((grade) => (
                                <SelectItem key={grade.value} value={grade.value}>
                                  {grade.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={isPlaying ? stopSpeech : playSelectedText}
                          variant="outline"
                          size="sm"
                          data-testid="button-play-all"
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-4 h-4 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              {selectedText ? "Play Selection" : "Play All"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <InteractiveText
                      content={content}
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      onWordClick={speakText}
                      onTextSelection={setSelectedText}
                      isPlaying={isPlaying}
                    />
                    {showFeedbackPrompt && (
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between animate-fade-in print:hidden">
                        <span className="text-sm text-muted-foreground">How was this content?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            Share feedback →
                          </button>
                          <button
                            onClick={() => setShowFeedbackPrompt(false)}
                            className="text-muted-foreground hover:text-foreground text-xs ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {citations.length > 0 && (
              <Card className="bg-card border-border/50 shadow-elegant animate-fade-in print:hidden">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground font-semibold">
                    Sources & Citations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2">
                    {citations.map((citation, index) => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = citation.split(urlRegex);

                      return (
                        <li key={index} className="text-sm text-muted-foreground">
                          {parts.map((part, partIndex) => {
                            if (part.match(urlRegex)) {
                              return (
                                <a
                                  key={partIndex}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline underline cursor-pointer font-medium print:text-black"
                                >
                                  {part}
                                </a>
                              );
                            }
                            return <span key={partIndex}>{part}</span>;
                          })}
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            )}

            <div className="print:hidden">
              <SavedContentList userId={user.id} onLoad={handleLoadSavedContent} />
            </div>
          </>
        )}

      </div>

      <FeedbackFab user={user} />
      <FeedbackForm
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={user}
      />

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:pb-2 {
            padding-bottom: 0.5rem !important;
          }
          .print\\:break-before-page {
            break-before: page !important;
          }
          .print\\:text-black {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;