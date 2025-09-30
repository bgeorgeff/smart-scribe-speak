import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Pause, Square, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FontSelector } from "@/components/FontSelector";
import { InteractiveText } from "@/components/InteractiveText";

const Index = () => {
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [fontSize, setFontSize] = useState([18]);
  const [fontFamily, setFontFamily] = useState("dyslexic-arial");
  const [content, setContent] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  
  const { toast } = useToast();
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthRef.current = window.speechSynthesis;
    }
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

    setIsGenerating(true);
    setContent("");
    setCitations([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-educational-content', {
        body: { topic: topic.trim(), gradeLevel }
      });

      if (error) throw error;

      setContent(data.content);
      setCitations(data.citations || []);
      
      toast({
        title: "Content Generated!",
        description: "Your educational content is ready to read.",
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const speakText = (text: string) => {
    if (!speechSynthRef.current) return;

    // Stop any current speech
    speechSynthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    currentUtteranceRef.current = utterance;
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
      speakText(selectedText);
    } else if (content.trim()) {
      speakText(content);
    }
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">AI Educational Content Generator</h1>
          <p className="text-lg text-muted-foreground">
            Generate grade-appropriate explanations with interactive reading features
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Input
                  placeholder="e.g., Solar System, Photosynthesis, World War II"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full"
                />
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
                  Font Size: {fontSize[0]}px
                </label>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={10}
                  max={48}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              onClick={generateContent}
              disabled={isGenerating || !topic.trim() || !gradeLevel}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                "Generate Educational Content"
              )}
            </Button>
          </CardContent>
        </Card>

        {content && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Generated Content</CardTitle>
              <div className="flex items-center gap-2">
                {selectedText && (
                  <span className="text-sm text-muted-foreground">
                    Text selected
                  </span>
                )}
                <Button
                  onClick={isPlaying ? stopSpeech : playSelectedText}
                  variant="outline"
                  size="sm"
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {selectedText ? "Play Selection" : "Play All"}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InteractiveText
                content={content}
                fontFamily={fontFamily}
                fontSize={fontSize[0]}
                onWordClick={speakText}
                onTextSelection={setSelectedText}
                isPlaying={isPlaying}
              />
            </CardContent>
          </Card>
        )}

        {citations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Sources & Citations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {citations.map((citation, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {citation}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;