"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully!", {
        description: "You can now log in with your new password.",
      });

      router.push("/login");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Bar with Back Button & Brand Mark */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/80 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer group"
          aria-label="Go back to login page"
        >
          <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-all" />
          <span>Back to Login</span>
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <span className="font-heading text-xl sm:text-2xl font-medium tracking-tight text-foreground">
            Hey Garlic
          </span>
          <GarlicIcon className="size-6 sm:size-7 -mt-0.5 transition-transform duration-300 group-hover:rotate-6" />
        </Link>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-6 sm:py-10 my-auto">
        <div className="mb-6">
          <h1 className="font-heading text-2xl sm:text-[1.85rem] font-normal text-foreground tracking-tight">
            Create New Password
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Enter your new secure password below.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
              New Password <span className="text-destructive">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

          {/* Confirm New Password */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground block mb-1.5">
              Confirm New Password <span className="text-destructive">*</span>
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 size-4.5 text-muted-foreground pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-foreground text-background py-3 sm:py-3.5 text-xs sm:text-sm font-medium hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
            >
              <span>{isLoading ? "Updating..." : "Update Password"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
