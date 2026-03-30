import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const FeedbackForm = ({ isOpen, onClose, user }: FeedbackFormProps) => {
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter your feedback.",
        variant: "destructive",
      });
      return;
    }

    // If not logged in, email is required
    if (!user && !email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email so we can reply to you.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          email: user ? undefined : email.trim(),
          message: message.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });

      setMessage("");
      if (!user) setEmail("");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Learn Anything with your suggestions and comments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field - only show for logged-out users */}
          {!user && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email (optional)
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll use this if we need to follow up with you.
              </p>
            </div>
          )}

          {/* Message field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Feedback</label>
            <Textarea
              placeholder="Tell us what you think..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Feedback"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
