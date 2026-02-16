import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedContent {
  id: string;
  topic: string;
  grade_level: string;
  content: string;
  citations: any;
  font_family: string;
  font_size: string;
  created_at: string;
}

interface SavedContentListProps {
  userId: string;
  onLoad: (content: SavedContent) => void;
}

export const SavedContentList = ({ userId, onLoad }: SavedContentListProps) => {
  const [savedItems, setSavedItems] = useState<SavedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedContent();
  }, [userId]);

  const fetchSavedContent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_content')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedItems(data || []);
    } catch (error) {
      console.error('Error fetching saved content:', error);
      toast({
        title: "Error",
        description: "Failed to load saved content.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('saved_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedItems(savedItems.filter(item => item.id !== id));
      toast({
        title: "Deleted",
        description: "Content removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50 shadow-elegant">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (savedItems.length === 0) {
    return (
      <Card className="bg-card border-border/50 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground font-semibold">Saved Passages</CardTitle>
          <CardDescription>Your saved content will appear here</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No saved passages yet. Generate and save content to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground font-semibold">Saved Passages</CardTitle>
        <CardDescription>Click to load a saved passage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {savedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-border/50 rounded-md hover-elevate transition-colors cursor-pointer"
              data-testid={`card-saved-${item.id}`}
            >
              <div className="flex-1" onClick={() => onLoad(item)}>
                <h3 className="font-medium text-foreground text-sm">{item.topic}</h3>
                <p className="text-xs text-muted-foreground">
                  Grade {item.grade_level} &bull; {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                data-testid={`button-delete-${item.id}`}
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
