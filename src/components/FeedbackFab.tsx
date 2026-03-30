import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { User } from "@/types";

interface FeedbackFabProps {
  user: User;
}

export const FeedbackFab = ({ user }: FeedbackFabProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-6 right-6 z-40 shadow-lg rounded-full px-4 py-3 h-auto print:hidden"
        size="sm"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Feedback
      </Button>

      <FeedbackForm
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={user}
      />
    </>
  );
};
