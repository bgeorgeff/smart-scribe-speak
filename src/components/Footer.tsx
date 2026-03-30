import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { User } from "@/types";

interface FooterProps {
  user: User;
}

export const Footer = ({ user }: FooterProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border/50 py-6 mt-12 print:hidden">
        <div className="max-w-5xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Learn Anything © 2024
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFeedbackOpen(true)}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Feedback
          </Button>
        </div>
      </footer>

      <FeedbackForm
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={user}
      />
    </>
  );
};
