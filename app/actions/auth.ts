"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const SignUpSchema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
  confirmPassword: z.string(),
  location: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const SignInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type AuthActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  requiresEmailVerification?: boolean;
};

/**
 * Server Action for User Registration
 */
export async function signUpAction(data: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  location?: string;
}): Promise<AuthActionResult> {
  const parsed = SignUpSchema.safeParse(data);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid registration data.";
    return { success: false, error: errorMsg };
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.username,
        location: parsed.data.location?.trim() || null,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // If Supabase has email confirmation enabled, data.session might be null
  if (authData.user && !authData.session) {
    return {
      success: true,
      requiresEmailVerification: true,
      message: "Registration successful! Please check your email to confirm your account.",
    };
  }

  return {
    success: true,
    requiresEmailVerification: false,
    message: `Welcome to Hey Garlic, ${parsed.data.username}!`,
  };
}

/**
 * Server Action for User Login
 */
export async function signInAction(data: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = SignInSchema.safeParse(data);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid login credentials.";
    return { success: false, error: errorMsg };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Logged in successfully!" };
}

/**
 * Server Action for Password Reset Email
 */
export async function resetPasswordAction(email: string, redirectTo?: string): Promise<AuthActionResult> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Password reset link sent! Check your inbox.",
  };
}

/**
 * Server Action for Sign Out
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
