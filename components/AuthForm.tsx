"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./UI/Button";
import Input from "./UI/Input";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const {
    signIn,
    signUp,
    error,
    userNotFound,
    userEmailUnconfirmed,
    resendConfirmation,
  } = useAuth();

  const deriveNameFromEmail = (em: string) => {
    if (!em) return "";
    const local = em.split("@")[0] || em;
    return local
      .replace(/[._\-\d]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // If name contains @, strip the domain part (user likely entered email by mistake)
        const cleanName = name.includes("@") ? name.split("@")[0] : name;
        await signUp(email, password, cleanName);
        // Show confirmation email message and require the user to confirm before signing in
        setConfirmationEmailSent(true);
      } else {
        await signIn(email, password);
        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      alert("Google sign-in failed: " + (err.message || String(err)));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("GitHub sign-in error:", err);
      alert("GitHub sign-in failed: " + (err.message || String(err)));
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await resendConfirmation(email);
      setResendSuccess(true);
    } catch (err: any) {
      console.error("Resend error:", err);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-lg border border-white/10 bg-white/3">
      <h2 className="text-2xl font-bold mb-6">
        {isSignUp ? "Create Account" : "Sign In"}
      </h2>

      {confirmationEmailSent ? (
        <div className="text-center space-y-4">
          <div className="p-4 rounded bg-green-500/20 text-green-300">
            <p className="font-medium mb-2">Account Created Successfully!</p>
            <p className="text-sm">
              Welcome to Memesite! Your account has been created and you're now signed in.
            </p>
            <p className="text-xs mt-2 text-green-400">
              You can start exploring and uploading memes right away.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push("/")}
            className="w-full"
          >
            Continue to Homepage
          </Button>
        </div>
      ) : (
        <>
          {userEmailUnconfirmed ? (
            <div className="mb-4 p-3 rounded bg-yellow-600/10 text-yellow-300 text-sm">
              <p className="font-medium mb-2">Please confirm your email</p>
              <p className="text-sm mb-3">
                We sent a confirmation message to <strong>{email}</strong>.
                Please follow the instructions in that email to confirm your
                address, then come back and sign in. If you didn't receive the
                email, check your spam folder.
              </p>

              {resendSuccess ? (
                <p className="text-green-400 font-medium text-sm">
                  Confirmation email resent! Please check your inbox.
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="w-full mt-2 border-yellow-300/30 text-yellow-300 hover:bg-yellow-300/10"
                >
                  {resendLoading ? "Sending..." : "Resend Confirmation Email"}
                </Button>
              )}
            </div>
          ) : (
            error && (
              <div className="mb-4 p-3 rounded bg-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )
          )}

          {!isSignUp && userNotFound && (
            <div className="mb-4 p-3 rounded bg-yellow-600/10 text-yellow-300 text-sm">
              <p className="mb-2">It looks like this email isn't registered.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setName(deriveNameFromEmail(email));
                    setIsSignUp(true);
                  }}
                  className="flex-1"
                >
                  Create an account
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    // clear flag and let user try again
                    // userNotFound is managed by the hook, so just clear form
                    setEmail("");
                    setPassword("");
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Button
            variant="ghost"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2 border border-white/20"
          >
            {googleLoading ? (
              "Loading..."
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleGithubSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-white/20 mt-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail("");
                setPassword("");
                setName("");
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

          {(!isSignUp || (error && error.toLowerCase().includes("registered"))) && (
            <div className="mt-2 text-center">
              <a
                href="/forgot-password"
                style={{ color: "#f87171" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fca5a5")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#f87171")}
                className="text-xs"
              >
                Forgot your password?
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
