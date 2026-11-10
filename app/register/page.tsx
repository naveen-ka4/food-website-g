"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { RegisterIllustrationContainer } from "@/components/DoodleHearts";
import { createClient } from "@/lib/supabase/client";
import { syncGuestSavedRecipesAction } from "@/app/actions/recipes";
import { useTranslation } from "@/lib/i18n/context";

function GarlicIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 8C20 12 10 20 10 29C10 36.5 16 42 24 42C32 42 38 36.5 38 29C38 20 28 12 24 8Z"
        fill="#F6F1E8"
        stroke="#42382F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 26C17 33 20 39 24 41.5"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M31 26C31 33 28 39 24 41.5"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 14V42"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 14C19.5 18.5 18 24 18.5 30C19 35 20.5 39 23.5 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M26 14C28.5 18.5 30 24 29.5 30C29 35 27.5 39 24.5 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M24 6C23.5 4.5 24 3 25 2C25.5 3.5 25 5 24 6Z"
        fill="#C8B89F"
        stroke="#42382F"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { t, l } = useTranslation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password too short.", {
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.", {
        description: "Please make sure your passwords match exactly.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
            display_name: username.trim(),
            location: location.trim() || undefined,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast.success("Account created successfully!", {
          description:
            "Please check your inbox to confirm your email before logging in.",
          duration: 8000,
        });
        router.push(l("/login"));
        return;
      }

      // Sync any local guest bookmarks to user's Supabase account
      try {
        const stored = localStorage.getItem("heygarlic_saved_recipes");
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) {
            const ids = list.map((item) => item.id || item.slug).filter(Boolean);
            if (ids.length > 0) {
              const syncRes = await syncGuestSavedRecipesAction(ids);
              if (syncRes.success && syncRes.count > 0) {
                toast.success(`Synced ${syncRes.count} saved recipes to your account!`);
                localStorage.removeItem("heygarlic_saved_recipes");
              }
            }
          }
        }
      } catch {
        // ignore
      }

      toast.success("Welcome to Hey Garlic!", {
        description: `Your account has been created, ${username}!`,
      });

      router.push(l("/profile"));
      router.refresh();
    } catch (err: any) {
      toast.error(
        err?.message || "An unexpected error occurred during registration."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate Google sign up.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Bar with Back Button & Brand Mark */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/80 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer group"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-all" />
          <span>{t("common.back")}</span>
        </button>

        <Link
          href={l("/")}
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <span className="font-heading text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            Hey Garlic
          </span>
          <GarlicIcon className="size-6 sm:size-7 -mt-0.5 transition-transform duration-300 group-hover:rotate-6" />
        </Link>
      </div>

      {/* Main Content Area without outer card container */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center py-6 sm:py-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Heading, Subtitle & Illustration (Desktop only, hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col items-center lg:items-start text-center lg:text-left pr-0 lg:pr-4 select-none">
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-normal tracking-tight text-foreground leading-[1.18]">
              {t("auth.registerHeadlineLine1")}
              <br />
              {t("auth.registerHeadlineLine2")}
            </h1>

            <p className="mt-4 text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed font-normal">
              {t("auth.registerSubtitleHero")}
            </p>

            {/* Wooden Cutting Board Illustration with Floating Doodle Hearts (Locked, no animations, not draggable) */}
            <div className="mt-6 sm:mt-8 select-none pointer-events-none">
              <RegisterIllustrationContainer />
            </div>
          </div>

          {/* Right Column: Clean Register Form directly on background (No card UI, no mobile image) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            {/* Header: Always shown on mobile & desktop */}
            <div className="mb-6">
              <h2 className="font-heading text-2xl sm:text-[1.85rem] font-normal text-foreground tracking-tight">
                {t("auth.createAccountHeading")}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {t("auth.createAccountSubheading")}
              </p>
            </div>

            {/* Register Form */}
            <form onSubmit={handleRegister} className="space-y-3.5 sm:space-y-4">
              {/* Username */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
                  {t("auth.usernameLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("auth.usernamePlaceholder")}
                    className="w-full rounded-2xl border border-border/90 bg-card/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
                  {t("auth.emailLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="w-full rounded-2xl border border-border/90 bg-card/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
                  {t("auth.passwordLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.createPasswordPlaceholder")}
                    className="w-full rounded-2xl border border-border/90 bg-card/80 pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
                  {t("auth.confirmPasswordLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    className="w-full rounded-2xl border border-border/90 bg-card/80 pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Location (Optional) */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
                  {t("auth.locationLabel")}
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("auth.locationPlaceholder")}
                    className="w-full rounded-2xl border border-border/90 bg-card/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-foreground text-background py-3 sm:py-3.5 text-xs sm:text-sm font-medium hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <span>{isLoading ? t("auth.creatingAccountButton") : t("auth.createAccountButton")}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>

              {/* Or divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-border/70" />
                <span className="absolute bg-background px-3 text-xs text-muted-foreground font-normal">
                  {t("auth.orDivider")}
                </span>
              </div>

              {/* Google Auth Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full rounded-full border border-border/90 bg-card hover:bg-muted/60 text-foreground py-2.5 sm:py-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer select-none active:scale-98"
                >
                  <GoogleIcon className="size-4.5" />
                  <span>{t("auth.continueWithGoogle")}</span>
                </button>
              </div>

              {/* Switch to Login */}
              <div className="pt-3 text-center text-xs sm:text-sm text-muted-foreground">
                <span>{t("auth.alreadyHaveAccount")}{" "}</span>
                <Link
                  href={l("/login")}
                  className="font-semibold text-foreground underline underline-offset-3 hover:text-primary transition-colors"
                >
                  {t("auth.logInLink")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

