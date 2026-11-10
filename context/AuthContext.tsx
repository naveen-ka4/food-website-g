"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface UserProfile {
  name: string;
  email: string;
  initial: string;
  avatarUrl: string;
  status: string;
  tagline: string;
  bio: string;
  aboutMe: string;
  location: string;
  interests: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  updateProfile: async () => false,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function extractProfile(user: User | null): UserProfile | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const rawName =
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    meta.username ||
    user.email?.split("@")[0] ||
    "User";

  let rawAvatar = meta.avatar_url || meta.picture || "";
  // Guard against bloated base64 data URLs in session metadata
  if (rawAvatar && rawAvatar.startsWith("data:")) {
    rawAvatar = "";
  }

  const initial =
    rawName.charAt(0).toUpperCase() ||
    (user.email ? user.email.charAt(0).toUpperCase() : "U");

  return {
    name: rawName,
    email: user.email || "",
    initial,
    avatarUrl: rawAvatar,
    status: meta.status || "",
    tagline: meta.tagline || "",
    bio: meta.bio || "",
    aboutMe: meta.about_me || "",
    location: meta.location || "",
    interests: Array.isArray(meta.interests) ? meta.interests : [],
    socialLinks: meta.social_links || {},
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync user and profile helper
  const applyUser = useCallback((u: User | null) => {
    setUser(u);
    setProfile(extractProfile(u));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      applyUser(freshUser);
    } catch {
      // ignore
    }
  }, [applyUser]);

  useEffect(() => {
    let isMounted = true;

    // Purge legacy global mock profile key that could bleed across accounts
    try {
      localStorage.removeItem("heygarlic_user_profile");
    } catch {
      // ignore
    }

    try {
      const supabase = createClient();

      // 1. Fast local session hydration (<5ms, reads cookies/storage)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          applyUser(session.user);
        } else {
          applyUser(null);
        }
        setIsLoading(false);
      });

      // 2. Realtime auth change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          applyUser(session.user);
        } else {
          applyUser(null);
        }
        setIsLoading(false);
      });

      // 3. Background server-side token validation
      supabase.auth.getUser().then(({ data: { user: serverUser } }) => {
        if (!isMounted) return;
        if (serverUser) {
          applyUser(serverUser);
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }, [applyUser]);

  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<boolean> => {
    try {
      const supabase = createClient();
      const metaUpdates: Record<string, any> = {};

      if (updates.name !== undefined) {
        metaUpdates.display_name = updates.name;
        metaUpdates.username = updates.name;
        metaUpdates.full_name = updates.name;
      }
      if (updates.avatarUrl !== undefined) {
        // Prevent huge base64 strings from polluting JWT session cookies
        metaUpdates.avatar_url =
          updates.avatarUrl && updates.avatarUrl.startsWith("data:")
            ? ""
            : updates.avatarUrl;
      }
      if (updates.status !== undefined) metaUpdates.status = updates.status;
      if (updates.tagline !== undefined) metaUpdates.tagline = updates.tagline;
      if (updates.bio !== undefined) metaUpdates.bio = updates.bio;
      if (updates.aboutMe !== undefined) metaUpdates.about_me = updates.aboutMe;
      if (updates.location !== undefined) metaUpdates.location = updates.location;
      if (updates.interests !== undefined) metaUpdates.interests = updates.interests;
      if (updates.socialLinks !== undefined) metaUpdates.social_links = updates.socialLinks;

      const { data, error } = await supabase.auth.updateUser({
        data: metaUpdates,
      });

      if (error) throw error;

      // Sync directly to public.profiles table so all author views stay fresh
      if (user) {
        const profilePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.name !== undefined) profilePayload.full_name = updates.name;
        if (updates.avatarUrl !== undefined) {
          profilePayload.avatar_url =
            updates.avatarUrl && !updates.avatarUrl.startsWith("data:")
              ? updates.avatarUrl
              : null;
        }
        if (updates.bio !== undefined) profilePayload.bio = updates.bio;
        if (updates.tagline !== undefined) profilePayload.tagline = updates.tagline;
        if (updates.status !== undefined) profilePayload.status = updates.status;

        await supabase.from("profiles").update(profilePayload).eq("id", user.id);
      }

      if (data.user) {
        applyUser(data.user);
      }
      return true;
    } catch (err) {
      console.error("Error updating user profile:", err);
      return false;
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        updateProfile,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
