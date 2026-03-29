import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleConfirmation = async () => {
      // Check for PKCE flow params (token_hash + type in query string)
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "email" | "recovery" | "invite" | "magiclink" | "signup" | "email_change",
        });

        if (error) {
          setStatus("error");
          setMessage("Verification failed. The link may have expired. Please try signing up again.");
        } else {
          setStatus("success");
          if (type === "recovery") {
            setMessage("Verified! Redirecting to reset your password...");
          } else {
            setMessage("Email confirmed! Redirecting you to the app...");
          }
          // Clean up URL params before redirecting
          window.history.replaceState({}, document.title, "/auth/confirm");
          setTimeout(() => navigate("/"), 2000);
        }
        return;
      }

      // Check for implicit flow params (access_token in hash fragment)
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const errorCode = hashParams.get("error_code");

      if (errorCode) {
        setStatus("error");
        setMessage(hashParams.get("error_description")?.replace(/\+/g, " ") || "Verification failed.");
      } else if (accessToken) {
        setStatus("success");
        setMessage("Email confirmed! Redirecting you to the app...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        // No params found - the Supabase client may have already processed the session
        // from the URL automatically. Check if there's an active session.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("success");
          setMessage("Email confirmed! Redirecting you to the app...");
          setTimeout(() => navigate("/"), 2000);
        } else {
          setStatus("error");
          setMessage("Invalid confirmation link. Please try signing up again.");
        }
      }
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "verifying" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          {status === "success" && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
          <p className="text-center text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthConfirm;
