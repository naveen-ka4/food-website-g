"use client";

import React, { useState, useEffect, useRef, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Sparkles,
  Bell,
  ShieldCheck,
  Lock,
  ChevronRight,
  ChevronLeft,
  Camera,
  Upload,
  Download,
  Check,
  X,
  MapPin,
  Globe,
  Trash2,
  LogOut,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Laptop,
  Smartphone,
  Scale,
  UtensilsCrossed,
  Flame,
  Menu,
  Palette,
  Sun,
  Moon,
  Monitor,
  Search,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Settings as SettingsIcon,
  Star,
  MessageSquare,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/Sidebar";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { useLanguage, useTranslation } from "@/lib/i18n/context";
import type { SupportedLocaleCode } from "@/lib/i18n/config";

export type SettingsTab =
  | "general"
  | "appearance"
  | "notifications"
  | "edit-profile"
  | "visibility"
  | "security"
  | "account"
  | "preferences"
  | "privacy";

interface TabMeta {
  id: SettingsTab;
  label: string;
  category: "Personal" | "Security & System";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isExternal?: boolean;
}

const SETTINGS_TABS: TabMeta[] = [
  {
    id: "general",
    label: "General",
    category: "Personal",
    description: "Language and display preferences.",
    icon: SettingsIcon,
  },
  {
    id: "appearance",
    label: "Appearance",
    category: "Personal",
    description: "Customize theme and display appearance.",
    icon: Sun,
  },
  {
    id: "notifications",
    label: "Notifications",
    category: "Personal",
    description: "Manage alerts for reviews, replies, and saved recipes.",
    icon: Bell,
  },
  {
    id: "edit-profile",
    label: "Edit profile",
    category: "Personal",
    description: "Update your culinary avatar, display name, bio, tags, and social profiles.",
    icon: User,
  },
  {
    id: "visibility",
    label: "Profile visibility",
    category: "Personal",
    description: "Control who can see your profile and recipes.",
    icon: Eye,
  },
  {
    id: "security",
    label: "Security and login",
    category: "Personal",
    description: "Password credentials, two-factor authentication (2FA), and active browser sessions.",
    icon: ShieldCheck,
  },
  {
    id: "account",
    label: "Account",
    category: "Personal",
    description: "Manage your email address, verification, and account deletion.",
    icon: SlidersHorizontal,
  },
  {
    id: "preferences",
    label: "Culinary preferences",
    category: "Personal",
    description: "Measurement units, default servings, dietary choices, and cooking preferences.",
    icon: Sparkles,
  },
  {
    id: "privacy",
    label: "Privacy and data",
    category: "Personal",
    description: "Export recipes, clear search history, and manage data privacy.",
    icon: Lock,
  },
];

function getTabLabel(id: SettingsTab, t: (key: string, params?: Record<string, any>) => string): string {
  switch (id) {
    case "general": return t("settings.general");
    case "appearance": return t("settings.appearance");
    case "notifications": return t("settings.notifications");
    case "edit-profile": return t("settings.editProfile");
    case "visibility": return t("settings.visibility");
    case "security": return t("settings.security");
    case "account": return t("settings.account");
    case "preferences": return t("settings.preferences");
    case "privacy": return t("settings.privacy");
    default: return id;
  }
}

function getTabDescription(id: SettingsTab, t: (key: string, params?: Record<string, any>) => string): string {
  switch (id) {
    case "general": return t("settings.generalDesc");
    case "appearance": return t("settings.appearanceDesc");
    case "notifications": return t("settings.notificationsDesc");
    case "edit-profile": return t("settings.editProfileDesc");
    case "visibility": return t("settings.visibilityDesc");
    case "security": return t("settings.securityDesc");
    case "account": return t("settings.accountDesc");
    case "preferences": return t("settings.preferencesDesc");
    case "privacy": return t("settings.privacyDesc");
    default: return "";
  }
}



const PRESET_STATUSES = [
  "🌱 New to Cooking",
  "🍳 Home Cook",
  "🥗 Healthy Foodie",
  "🍰 Passionate Baker",
  "🌶️ Spice Explorer",
  "👨‍🍳 Aspiring Chef",
];

const AVAILABLE_CUISINES = [
  "Sri Lankan",
  "Italian",
  "Asian",
  "Healthy",
  "Vegetarian",
  "Non-Vegetarian",
  "Desserts",
  "Pasta",
  "Seafood",
  "Chicken",
  "Quick & Easy",
  "Baking",
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Halal",
  "Keto",
  "Low Carb",
  "Pescatarian",
];

function GarlicBrandIcon({ className = "size-7" }: { className?: string }) {
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

function FacebookIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Toggle switch component matching clean, high-contrast design
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${checked
        ? "border-transparent bg-foreground"
        : "border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800/90 hover:border-zinc-400 dark:hover:border-zinc-600"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-6 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out ${checked
          ? "translate-x-5 bg-background"
          : "translate-x-0 bg-white dark:bg-zinc-200"
          }`}
      />
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSidebar } = useSidebar();
  const { t, l } = useTranslation();

  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const initialTab: SettingsTab =
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)
      ? tabParam
      : "general";

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  // On mobile: null means showing the Settings menu list; when set, shows the specific tab screen
  const [mobileActiveTab, setMobileActiveTab] = useState<SettingsTab | null>(
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam) ? tabParam : null
  );

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Edit Profile Form State (Matches Image 3)
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    "Sri Lankan",
  ]);
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    instagram: "",
    youtube: "",
    website: "",
  });

  // 2. Profile Visibility State (Matches Image 1)
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [searchPrivacy, setSearchPrivacy] = useState(false);
  const [showCookingStatus, setShowCookingStatus] = useState(true);
  const [allowRecipeRemix, setAllowRecipeRemix] = useState(true);

  // 3. Account Management State
  const [measurementUnit, setMeasurementUnit] = useState<"metric" | "imperial">(
    "metric"
  );
  const [defaultServings, setDefaultServings] = useState(4);
  const [language, setLanguage] = useState("English (US)");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 4. Culinary Preferences State
  const [dietaryList, setDietaryList] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<"mild" | "medium" | "hot" | "fiery">(
    "medium"
  );
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate"
  );

  // 5. Notifications State
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifSaves, setNotifSaves] = useState(true);
  const [notifProfileBadge, setNotifProfileBadge] = useState(true);


  // 6. Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Load user data on mount with fast session hydration
  useEffect(() => {
    let isMounted = true;

    function applyUserMeta(u: any) {
      const meta = u.user_metadata || {};
      const userEmail = u.email || "";
      setEmail(userEmail);
      setFullName(meta.full_name || meta.display_name || meta.name || "");
      setUsername(meta.username || userEmail.split("@")[0] || "");
      setLocation(meta.location || "");
      let cleanAvatar = meta.avatar_url || meta.picture || "";
      if (cleanAvatar.startsWith("data:")) {
        cleanAvatar = "";
        const supabase = createClient();
        supabase.auth.updateUser({ data: { avatar_url: "" } }).catch(() => { });
      }
      setAvatarUrl(cleanAvatar);
      setBio(meta.bio || "");
      setStatus(meta.status || "");

      if (Array.isArray(meta.interests) && meta.interests.length > 0) {
        setSelectedCuisines(meta.interests);
      }

      if (meta.social_links) {
        setSocialLinks({
          facebook: meta.social_links.facebook || "",
          instagram: meta.social_links.instagram || "",
          youtube: meta.social_links.youtube || "",
          website: meta.social_links.website || "",
        });
      }

      if (meta.visibility) {
        setIsPrivateProfile(Boolean(meta.visibility.private_profile));
        setSearchPrivacy(Boolean(meta.visibility.search_privacy));
        setShowCookingStatus(meta.visibility.show_status !== false);
        setAllowRecipeRemix(meta.visibility.allow_remix !== false);
      }

      if (meta.preferences) {
        setMeasurementUnit(meta.preferences.measurement || "metric");
        setDefaultServings(meta.preferences.default_servings || 4);
        setLanguage(meta.preferences.language || "English (US)");
        if (Array.isArray(meta.preferences.dietary)) {
          setDietaryList(meta.preferences.dietary);
        }
        if (meta.preferences.spice_level) {
          setSpiceLevel(meta.preferences.spice_level);
        }
        if (meta.preferences.skill_level) {
          setSkillLevel(meta.preferences.skill_level);
        }
      }

      if (meta.notifications) {
        setNotifReviews(meta.notifications.reviews !== false);
        setNotifReplies(meta.notifications.replies !== false);
        setNotifSaves(meta.notifications.saves !== false);
        setNotifProfileBadge(meta.notifications.profile_badge !== false);

      }
    }

    async function loadUserData() {
      try {
        const supabase = createClient();
        // 1. Fast local session check (<5ms)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          applyUserMeta(session.user);
          setIsLoadingUser(false);
        }

        // 2. Validate with server
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && isMounted) {
          applyUserMeta(user);
        } else if (!user && isMounted) {
          router.replace("/login");
          return;
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        if (isMounted) setIsLoadingUser(false);
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectTab = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setMobileActiveTab(tabId);
    // Update url cleanly without re-rendering
    window.history.replaceState(null, "", l(`/settings?tab=${tabId}`));
  };

  const handleBackToMobileList = () => {
    setMobileActiveTab(null);
    window.history.replaceState(null, "", l("/settings"));
  };

  // Toggle Cuisine tag
  const handleToggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  // Toggle Dietary tag
  const handleToggleDietary = (item: string) => {
    setDietaryList((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  // Save changes to Supabase & localStorage
  const handleSaveAll = async (sectionName: string = "Settings") => {
    setIsSaving(true);

    const payload = {
      display_name: fullName.trim() || username.trim() || "Chef",
      full_name: fullName.trim(),
      username: username.trim(),
      email: email.trim(),
      location: location.trim(),
      avatar_url: avatarUrl.trim().startsWith("data:") ? "" : avatarUrl.trim(),
      bio: bio.trim(),
      status: status.trim(),
      interests: selectedCuisines,
      social_links: socialLinks,
      visibility: {
        private_profile: isPrivateProfile,
        search_privacy: searchPrivacy,
        show_status: showCookingStatus,
        allow_remix: allowRecipeRemix,
      },
      preferences: {
        measurement: measurementUnit,
        default_servings: defaultServings,
        language: language,
        dietary: dietaryList,
        spice_level: spiceLevel,
        skill_level: skillLevel,
      },
      notifications: {
        reviews: notifReviews,
        replies: notifReplies,
        saves: notifSaves,
        profile_badge: notifProfileBadge,

      },
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: payload,
        });
        if (error) {
          toast.error(error.message);
          setIsSaving(false);
          return;
        }
      }

      toast.success(`${sectionName} saved!`, {
        description: "Your preferences and updates are now active.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Change password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!", {
        description: "Use your new password for your next login.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully.");
      router.push("/login");
    } catch {
      toast.success("Signed out.");
      router.push("/login");
    }
  };

  // Export data
  const handleExportData = () => {
    const dataToExport = {
      user: { fullName, username, email, location, bio },
      preferences: { measurementUnit, defaultServings, dietaryList, spiceLevel },
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heygarlic-data-${username || "profile"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recipe archive exported successfully!");
  };

  const filteredTabs = SETTINGS_TABS.filter((tab) => {
    const label = getTabLabel(tab.id, t).toLowerCase();
    const desc = getTabDescription(tab.id, t).toLowerCase();
    const q = searchQuery.toLowerCase();
    return label.includes(q) || desc.includes(q) || tab.label.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Settings layout matching screenshot */}
      <div className="flex-1 w-full flex flex-col md:flex-row">
        {/* ======================================================== */}
        {/* LEFT SIDEBAR (Sticky on desktop, List on mobile)         */}
        {/* ======================================================== */}
        <aside
          className={`w-full md:w-64 lg:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border bg-background p-4 sm:p-5 flex flex-col justify-between md:sticky md:top-0 md:h-screen md:overflow-y-auto ${mobileActiveTab !== null ? "hidden md:flex" : "flex"
            }`}
        >
          <div className="flex flex-col gap-4">
            {/* Top Back Link & Mobile Header */}
            <div className="flex items-center justify-between pb-1">
              <Link
                href={l("/")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity group px-1 py-1 cursor-pointer"
              >
                <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
                <span>{t("common.backToHome")}</span>
              </Link>
              <span className="md:hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settings.title")}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                name="settings_search"
                id="settings_search_input"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                inputMode="text"
                data-1p-ignore="true"
                data-lpignore="true"
                className="w-full pl-9 pr-8 py-2.5 sm:py-2 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 focus:bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Category Header: Personal */}
            <div className="pt-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Personal
              </span>
            </div>

            {/* Nav list */}
            <nav className="flex flex-col gap-1">
              {filteredTabs.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No settings match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left active:scale-[0.99] ${isActive
                        ? "bg-muted text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-4 shrink-0" />
                        <span>{getTabLabel(tab.id, t)}</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 md:hidden shrink-0" />
                    </button>
                  );
                })
              )}
            </nav>
          </div>

          {/* Bottom Sign Out */}
          <div className="pt-4 mt-6 border-t border-border">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" />
              <span>{t("settings.signOutButton")}</span>
            </button>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* RIGHT MAIN CONTENT AREA                                  */}
        {/* ======================================================== */}
        <main
          className={`flex-1 min-w-0 p-4 sm:p-6 md:p-10 lg:p-12 max-w-4xl ${mobileActiveTab === null ? "hidden md:block" : "block"
            }`}
        >
          {/* Mobile Back Button to Settings Menu */}
          <div className="flex items-center justify-between pb-3 mb-4 sm:mb-6 border-b border-border/80 md:hidden">
            <button
              type="button"
              onClick={handleBackToMobileList}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity cursor-pointer py-1 -ml-1"
            >
              <ChevronLeft className="size-5" />
              <span>{t("settings.title")}</span>
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {getTabLabel(activeTab, t)}
            </span>
          </div>

          {/* Render Active Tab Content */}
          <ActiveTabPanel
            activeTab={activeTab}
            // Edit Profile props
            username={username}
            setUsername={setUsername}
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            location={location}
            setLocation={setLocation}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            bio={bio}
            setBio={setBio}
            status={status}
            setStatus={setStatus}
            selectedCuisines={selectedCuisines}
            onToggleCuisine={handleToggleCuisine}
            socialLinks={socialLinks}
            setSocialLinks={setSocialLinks}
            // Visibility props
            isPrivateProfile={isPrivateProfile}
            setIsPrivateProfile={setIsPrivateProfile}
            searchPrivacy={searchPrivacy}
            setSearchPrivacy={setSearchPrivacy}
            showCookingStatus={showCookingStatus}
            setShowCookingStatus={setShowCookingStatus}
            allowRecipeRemix={allowRecipeRemix}
            setAllowRecipeRemix={setAllowRecipeRemix}
            // Account props
            measurementUnit={measurementUnit}
            setMeasurementUnit={setMeasurementUnit}
            defaultServings={defaultServings}
            setDefaultServings={setDefaultServings}
            language={language}
            setLanguage={setLanguage}
            setIsDeleteModalOpen={setIsDeleteModalOpen}
            // Culinary Preferences props
            dietaryList={dietaryList}
            onToggleDietary={handleToggleDietary}
            spiceLevel={spiceLevel}
            setSpiceLevel={setSpiceLevel}
            skillLevel={skillLevel}
            setSkillLevel={setSkillLevel}
            // Notifications props
            notifReviews={notifReviews}
            setNotifReviews={setNotifReviews}
            notifReplies={notifReplies}
            setNotifReplies={setNotifReplies}
            notifSaves={notifSaves}
            setNotifSaves={setNotifSaves}
            notifProfileBadge={notifProfileBadge}
            setNotifProfileBadge={setNotifProfileBadge}


            // Security props
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            twoFactorEnabled={twoFactorEnabled}
            setTwoFactorEnabled={setTwoFactorEnabled}
            isUpdatingPassword={isUpdatingPassword}
            onUpdatePassword={handleUpdatePassword}
            onSignOut={handleSignOut}
            // Privacy props
            onExportData={handleExportData}
            // Actions
            isSaving={isSaving}
            onSave={handleSaveAll}
          />
        </main>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDeleteModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 sm:p-8 shadow-2xl z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <div className="size-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="font-heading text-xl font-normal text-foreground">
                {t("settings.deleteModalTitle")}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("settings.deleteModalDesc")}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {t("settings.cancelButton")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  toast.error("Account deletion requested. Please confirm via the email sent to your inbox.");
                }}
                className="rounded-full bg-destructive text-destructive-foreground px-5 py-2 text-xs sm:text-sm font-semibold hover:opacity-90 shadow-2xs transition-all cursor-pointer"
              >
                {t("settings.confirmDeleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "English (US)", name: "English (US)", nativeName: "English", flag: "🇺🇸", region: "United States" },
  { code: "English (UK)", name: "English (UK)", nativeName: "English", flag: "🇬🇧", region: "United Kingdom" },
  { code: "Japanese (日本語)", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", region: "Japan" },
];

// General Panel Component with custom, searchable language dropdown

function FlagIcon({ code, className = "w-4 h-2.5 rounded-2xs shrink-0 overflow-hidden shadow-2xs border border-black/10 dark:border-white/10" }: { code: string; className?: string }) {
  switch (code) {
    case "Auto detect":
      return <Globe className="size-3.5 text-sky-500 shrink-0" />;
    case "English (US)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="US Flag">
          <path fill="#bd3d44" d="M0 0h640v480H0z" />
          <path stroke="#fff" strokeWidth="37" d="M0 55.4h640M0 129.2h640M0 203.1h640M0 276.9h640M0 350.8h640M0 424.6h640" />
          <path fill="#192f5d" d="M0 0h256v258.5H0z" />
        </svg>
      );
    case "English (UK)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="UK Flag">
          <path fill="#012169" d="M0 0h640v480H0z" />
          <path fill="#fff" d="m75 0 245 180L565 0h75v50L400 240l240 180v60h-75L320 300 75 480H0v-50l240-190L0 50V0z" />
          <path fill="#c8102e" d="m424 288 216 162v30h-38L382 318zm-208-96L0 30V0h38l220 162zm0 96L0 450v30h38l220-162zm208-96L640 30V0h-38L382 162z" />
          <path fill="#fff" d="M260 0h120v480H260zM0 180h640v120H0z" />
          <path fill="#c8102e" d="M280 0h80v480H280zM0 200h640v80H0z" />
        </svg>
      );
    case "Sinhala (සිංහල)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="Sri Lanka Flag">
          <path fill="#ffbe29" d="M0 0h640v480H0z" />
          <path fill="#00563f" d="M35 35h90v410H35z" />
          <path fill="#eb7924" d="M140 35h90v410h-90z" />
          <path fill="#8d153a" d="M245 35h360v410H245z" />
          <circle cx="420" cy="240" r="45" fill="#ffbe29" />
        </svg>
      );
    case "Tamil (தமிழ்)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="India Flag">
          <path fill="#f93" d="M0 0h640v160H0z" />
          <path fill="#fff" d="M0 160h640v160H0z" />
          <path fill="#128807" d="M0 320h640v160H0z" />
          <circle cx="320" cy="240" r="48" fill="none" stroke="#000080" strokeWidth="8" />
          <circle cx="320" cy="240" r="14" fill="#000080" />
        </svg>
      );
    case "Spanish (Español)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="Spain Flag">
          <path fill="#aa151b" d="M0 0h640v120H0zm0 360h640v120H0z" />
          <path fill="#f1bf00" d="M0 120h640v240H0z" />
        </svg>
      );
    case "French (Français)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="France Flag">
          <path fill="#002654" d="M0 0h213.3v480H0z" />
          <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
          <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
        </svg>
      );
    case "German (Deutsch)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="Germany Flag">
          <path fill="#000" d="M0 0h640v160H0z" />
          <path fill="#dd0000" d="M0 160h640v160H0z" />
          <path fill="#ffce00" d="M0 320h640v160H0z" />
        </svg>
      );
    case "Italian (Italiano)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="Italy Flag">
          <path fill="#009246" d="M0 0h213.3v480H0z" />
          <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
          <path fill="#ce2b37" d="M426.7 0H640v480H426.7z" />
        </svg>
      );
    case "Japanese (日本語)":
      return (
        <svg className={`${className} bg-white`} viewBox="0 0 640 480" aria-label="Japan Flag">
          <circle cx="320" cy="240" r="144" fill="#bc002d" />
        </svg>
      );
    case "Chinese (中文)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="China Flag">
          <path fill="#de2910" d="M0 0h640v480H0z" />
          <polygon fill="#ffde00" points="100,50 115,95 160,95 125,120 140,165 100,135 60,165 75,120 40,95 85,95" />
        </svg>
      );
    case "Arabic (العربية)":
      return (
        <svg className={className} viewBox="0 0 640 480" aria-label="Arabic Flag">
          <path fill="#006c35" d="M0 0h640v480H0z" />
          <path fill="#fff" d="M180 260h280v15H180zM430 250l30 17-30 18v-35z" />
        </svg>
      );
    default:
      return <Globe className="size-3.5 text-muted-foreground shrink-0" />;
  }
}

function GeneralPanel(props: {
  language: string;
  setLanguage: (v: string) => void;
  measurementUnit?: "metric" | "imperial";
  setMeasurementUnit?: (v: "metric" | "imperial") => void;
  defaultServings?: number;
  setDefaultServings?: (v: number) => void;
  status?: string;
  setStatus?: (v: string) => void;
  isSaving?: boolean;
  onSave?: (sectionName?: string) => Promise<void>;
}) {
  const { locale, setLocale, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedLang =
    SUPPORTED_LANGUAGES.find((l) => {
      if (locale === "ja-JP") return l.code.includes("Japanese") || l.code.includes("日本語");
      if (locale === "en-GB") return l.code.includes("UK");
      return l.code.includes("US");
    }) || SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((lang) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const handleSelectLanguage = (lang: LanguageOption) => {
    let targetLocale: SupportedLocaleCode = "en-US";
    if (lang.code.includes("UK")) {
      targetLocale = "en-GB";
    } else if (
      lang.code.includes("Japanese") ||
      lang.code.includes("日本語") ||
      lang.code === "ja-JP"
    ) {
      targetLocale = "ja-JP";
    }

    props.setLanguage(lang.code);
    setLocale(targetLocale);
    props.onSave?.("Language settings");
    toast.success(`Language set to ${lang.code}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Minimal Language Setting Row */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Minimal Title & Icon */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center text-foreground/80 shrink-0">
              <Globe className="size-4.5" />
            </div>
            <h3 className="text-sm font-medium text-foreground">{t("settings.languageSetting")}</h3>
          </div>

          {/* Right: Minimal Dropdown Switch */}
          <div ref={dropdownRef} className="relative w-full sm:w-auto shrink-0">
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              className="w-full sm:w-60 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-foreground px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FlagIcon code={selectedLang.code} />
                <span className="truncate text-foreground font-medium text-xs sm:text-sm">
                  {selectedLang.code.includes("(") ? selectedLang.code : selectedLang.name}
                </span>
              </div>

              <ChevronDown
                className={`size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Dropdown Floating Popover */}
            {isOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-full sm:w-64 rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Search Bar */}
                <div className="relative mb-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    name="language_search"
                    id="language_search_input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("settings.searchLanguagesPlaceholder")}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    inputMode="text"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/80 border border-zinc-300/80 dark:border-zinc-700/80 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/50 transition-colors [&::-ms-clear]:hidden [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Languages List with Custom Sleek Scrollbar */}
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1.5 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:rgba(150,150,150,0.3)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-button]:hidden">
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map((lang) => {
                      const isSelected =
                        (locale === "ja-JP" && (lang.code.includes("Japanese") || lang.code.includes("日本語"))) ||
                        (locale === "en-GB" && lang.code.includes("UK")) ||
                        (locale === "en-US" && lang.code.includes("US")) ||
                        props.language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleSelectLanguage(lang)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs sm:text-sm transition-colors cursor-pointer ${isSelected
                            ? "bg-muted font-medium text-foreground"
                            : "text-foreground/80 hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FlagIcon code={lang.code} />
                            <span className="truncate">
                              {lang.code.includes("(") ? lang.code : lang.name}
                            </span>
                          </div>

                          {isSelected && (
                            <Check className="size-3.5 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      {t("settings.noResults")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Appearance Panel Component with icon segmented theme switch
function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const THEME_OPTIONS: Array<{
    id: ThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
      {
        id: "system",
        label: t("settings.systemTheme"),
        icon: Monitor,
      },
      {
        id: "light",
        label: t("settings.lightTheme"),
        icon: Sun,
      },
      {
        id: "dark",
        label: t("settings.darkTheme"),
        icon: Moon,
      },
    ];

  const handleSelectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    const modeLabels: Record<ThemeMode, string> = {
      system: "System theme applied",
      light: "Light theme applied",
      dark: "Dark theme applied",
    };
    toast.success(modeLabels[mode]);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Theme Card */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs transition-shadow">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Minimal Title & Icon */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center text-foreground/80 shrink-0">
              <Palette className="size-4.5" />
            </div>
            <h3 className="text-sm font-medium text-foreground">{t("settings.themeSectionTitle")}</h3>
          </div>

          {/* Right: Segmented Icon Switch */}
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 gap-0.5">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = theme === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectTheme(opt.id)}
                  title={`${opt.label} theme`}
                  aria-label={`${opt.label} theme`}
                  className={`size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${isSelected
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility to compress an uploaded image into a high-efficiency WebP Blob
function compressImageToWebPBlob(
  file: File,
  targetSize = 256,
  quality = 0.8
): Promise<{ blob: Blob; sizeKb: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file (PNG, JPG, WebP, etc.)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the chosen file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to decode the image file."));
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        // Square center-crop coordinates
        const minDim = Math.min(naturalWidth, naturalHeight);
        const sx = (naturalWidth - minDim) / 2;
        const sy = (naturalHeight - minDim) / 2;
        const size = Math.min(targetSize, minDim);

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not initialize canvas context."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const approxKb = Math.max(1, Math.round(blob.size / 1024));
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, sizeKb: approxKb, previewUrl });
            } else {
              reject(new Error("Failed to compress image to WebP."));
            }
          },
          "image/webp",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Profile Photo Uploader Component - Clean & Minimal (no drag & drop box)
function ProfilePhotoUploader({
  avatarUrl,
  setAvatarUrl,
  fullName,
}: {
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  fullName: string;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const { t } = useTranslation();

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP).");
      return;
    }

    setIsUploading(true);
    try {
      const { blob } = await compressImageToWebPBlob(file, 256, 0.8);
      setPreviewSrc(URL.createObjectURL(blob));

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || "user";
      const filePath = `${userId}/avatar-${Date.now()}.webp`;

      let finalUrl = "";
      try {
        const { data: storageData, error: storageError } = await supabase.storage
          .from("avatars")
          .upload(filePath, blob, { contentType: "image/webp", upsert: true });

        if (!storageError && storageData) {
          const { data: pubData } = supabase.storage
            .from("avatars")
            .getPublicUrl(storageData.path);
          if (pubData?.publicUrl) {
            finalUrl = pubData.publicUrl;
          }
        }
      } catch { }

      if (!finalUrl) {
        const formData = new FormData();
        formData.append("file", blob, "avatar.webp");
        formData.append("userId", userId);

        const res = await fetch("/api/avatar/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.url) finalUrl = json.url;
        }
      }

      if (finalUrl) {
        setAvatarUrl(finalUrl);
        setPreviewSrc(null);
        toast.success("Photo updated!");
      }
    } catch {
      toast.error("Failed to upload photo.");
      setPreviewSrc(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleClearPhoto = () => {
    setAvatarUrl("");
    setPreviewSrc(null);
    toast.info("Photo removed");
  };

  const displayInitial = (fullName || "C").charAt(0).toUpperCase();
  const currentImage = previewSrc || avatarUrl;

  return (
    <div className="flex items-center gap-4 pb-5 border-b border-border/60">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Avatar Circle */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        title="Click to change photo"
        className="relative size-16 sm:size-20 rounded-full overflow-hidden bg-muted/80 border border-border/80 shrink-0 flex items-center justify-center cursor-pointer group shadow-2xs hover:opacity-90 transition-opacity"
      >
        {currentImage ? (
          <img src={currentImage} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-heading text-xl sm:text-2xl text-foreground font-medium">
            {displayInitial}
          </span>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Camera className="size-3.5" />
            <span>{currentImage ? t("settings.changePhoto") : t("settings.uploadPhoto")}</span>
          </button>

          {avatarUrl && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleClearPhoto}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 hover:bg-red-50 dark:bg-zinc-800/60 dark:hover:bg-red-950/30 hover:border-red-500/40 text-foreground/90 hover:text-red-500 dark:text-zinc-200 dark:hover:text-red-400 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {t("settings.removePhoto")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Active Tab Panel Component that switches based on activeTab
function ActiveTabPanel(props: {
  activeTab: SettingsTab;
  // Edit Profile props
  username: string;
  setUsername: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  selectedCuisines: string[];
  onToggleCuisine: (c: string) => void;
  socialLinks: {
    facebook: string;
    instagram: string;
    youtube: string;
    website: string;
  };
  setSocialLinks: React.Dispatch<
    React.SetStateAction<{
      facebook: string;
      instagram: string;
      youtube: string;
      website: string;
    }>
  >;
  // Visibility props
  isPrivateProfile: boolean;
  setIsPrivateProfile: (v: boolean) => void;
  searchPrivacy: boolean;
  setSearchPrivacy: (v: boolean) => void;
  showCookingStatus: boolean;
  setShowCookingStatus: (v: boolean) => void;
  allowRecipeRemix: boolean;
  setAllowRecipeRemix: (v: boolean) => void;
  // Account props
  measurementUnit: "metric" | "imperial";
  setMeasurementUnit: (v: "metric" | "imperial") => void;
  defaultServings: number;
  setDefaultServings: (v: number) => void;
  language: string;
  setLanguage: (v: string) => void;
  setIsDeleteModalOpen: (v: boolean) => void;
  // Culinary Preferences props
  dietaryList: string[];
  onToggleDietary: (d: string) => void;
  spiceLevel: "mild" | "medium" | "hot" | "fiery";
  setSpiceLevel: (v: "mild" | "medium" | "hot" | "fiery") => void;
  skillLevel: "beginner" | "intermediate" | "advanced";
  setSkillLevel: (v: "beginner" | "intermediate" | "advanced") => void;
  // Notifications props
  notifReviews: boolean;
  setNotifReviews: (v: boolean) => void;
  notifReplies: boolean;
  setNotifReplies: (v: boolean) => void;
  notifSaves: boolean;
  setNotifSaves: (v: boolean) => void;
  notifProfileBadge: boolean;
  setNotifProfileBadge: (v: boolean) => void;


  // Security props
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  twoFactorEnabled: boolean;
  setTwoFactorEnabled: (v: boolean) => void;
  isUpdatingPassword: boolean;
  onUpdatePassword: (e: React.FormEvent) => void;
  onSignOut: () => void;
  // Privacy props
  onExportData: () => void;
  // Actions
  isSaving: boolean;
  onSave: (sectionName?: string) => Promise<void>;
}) {
  const { t, l } = useTranslation();
  const currentTabMeta =
    SETTINGS_TABS.find((t) => t.id === props.activeTab) || SETTINGS_TABS[0];
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="w-full flex flex-col">
      {/* Title & Subtitle matching reference */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {getTabLabel(props.activeTab, t)}
        </h1>
        {getTabDescription(props.activeTab, t) && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {getTabDescription(props.activeTab, t)}
          </p>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 0. GENERAL (Matches User Screenshot)                 */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "general" && (
        <GeneralPanel
          language={props.language}
          setLanguage={props.setLanguage}
          measurementUnit={props.measurementUnit}
          setMeasurementUnit={props.setMeasurementUnit}
          defaultServings={props.defaultServings}
          setDefaultServings={props.setDefaultServings}
          status={props.status}
          setStatus={props.setStatus}
          isSaving={props.isSaving}
          onSave={props.onSave}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 0.5. APPEARANCE (Light/Dark High Contrast)           */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "appearance" && <AppearancePanel />}

      {/* ---------------------------------------------------- */}
      {/* 1. EDIT PROFILE (Matches Image 3)                    */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "edit-profile" && (
        <div className="bg-card rounded-2xl border border-border/70 p-5 sm:p-7 shadow-2xs flex flex-col gap-5 sm:gap-6">
          {/* Minimal Avatar Uploader */}
          <ProfilePhotoUploader
            avatarUrl={props.avatarUrl}
            setAvatarUrl={props.setAvatarUrl}
            fullName={props.fullName}
          />

          {/* Form Fields: 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Username */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t("settings.usernameLabel")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={props.username}
                onChange={(e) => props.setUsername(e.target.value)}
                placeholder="e.g. nimesha_chef"
                required
                className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t("settings.fullNameLabel")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={props.fullName}
                onChange={(e) => props.setFullName(e.target.value)}
                placeholder="e.g. Nimesha Perera"
                required
                className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t("settings.emailAddressLabel")} <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={props.email}
                onChange={(e) => props.setEmail(e.target.value)}
                placeholder="e.g. nimesha@example.com"
                required
                className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {t("settings.locationLabel")}
              </label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={props.location}
                  onChange={(e) => props.setLocation(e.target.value)}
                  placeholder="e.g. Colombo, Sri Lanka"
                  className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground block">
                {t("settings.bioLabel")}
              </label>
              <span className="text-[11px] text-muted-foreground">
                {props.bio.length}/160
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={160}
              value={props.bio}
              onChange={(e) => props.setBio(e.target.value)}
              placeholder={t("settings.bioPlaceholder")}
              className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs resize-none leading-relaxed"
            />
          </div>

          {/* Action Footer Buttons (Cancel & Save Changes) */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                toast.info("Changes canceled.");
              }}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
            >
              {t("settings.cancelButton")}
            </button>
            <button
              type="button"
              disabled={props.isSaving}
              onClick={() => props.onSave("Profile details")}
              className="px-5 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {props.isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("settings.savingButton")}</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{t("settings.saveChangesButton")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. PROFILE VISIBILITY (Matches Image 1)              */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "visibility" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Minimal Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.visibilitySectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.visibilitySectionSubtitle")}
            </p>
          </div>

          {/* Visibility Options List */}
          <div className="flex flex-col divide-y divide-border/50">
            {/* 1. Private profile */}
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Lock className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.privateProfileTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.privateProfileDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.isPrivateProfile}
                onChange={props.setIsPrivateProfile}
                id="private-profile-switch"
              />
            </div>

            {/* 2. Search privacy */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Globe className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.searchPrivacyTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.searchPrivacyDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.searchPrivacy}
                onChange={props.setSearchPrivacy}
                id="search-privacy-switch"
              />
            </div>

            {/* 3. Cooking activity & status */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.chefBadgeTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.chefBadgeDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.showCookingStatus}
                onChange={props.setShowCookingStatus}
                id="activity-status-switch"
              />
            </div>

            {/* 4. Recipe remixes */}
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <UtensilsCrossed className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.recipeRemixesTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.recipeRemixesDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.allowRecipeRemix}
                onChange={props.setAllowRecipeRemix}
                id="recipe-remix-switch"
              />
            </div>
          </div>

          {/* Action Bar (Reset & Save) */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                props.setIsPrivateProfile(false);
                props.setSearchPrivacy(false);
                props.setShowCookingStatus(true);
                props.setAllowRecipeRemix(true);
                toast.info("Visibility reset to defaults.");
              }}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
            >
              {t("settings.resetButton")}
            </button>
            <button
              type="button"
              disabled={props.isSaving}
              onClick={() => props.onSave("Visibility settings")}
              className="px-5 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {props.isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("settings.savingButton")}</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{t("settings.saveButton")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. ACCOUNT MANAGEMENT                                */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "account" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.accountSectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("settings.accountSectionSubtitle")}
            </p>
          </div>

          {/* Primary Email */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                <User className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {t("settings.accountEmailTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {props.email || "No email on file"}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-3.5" />
              <span>{t("settings.verifiedBadge")}</span>
            </span>
          </div>

          {/* Danger Zone */}
          <div className="pt-5 border-t border-border/60">
            <div className="p-4 rounded-xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    {t("settings.deleteAccountTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.deleteAccountDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => props.setIsDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {t("settings.deleteAccountButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. CULINARY PREFERENCES (Refine Recommendations)     */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "preferences" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.preferencesSectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("settings.preferencesSectionSubtitle")}
            </p>
          </div>

          {/* 1. Kitchen Measurement Units (Moved from Account) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                <Scale className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {t("settings.measurementUnitsTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.measurementUnitsDesc")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg pt-1">
              <button
                type="button"
                onClick={() => props.setMeasurementUnit("metric")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${props.measurementUnit === "metric"
                  ? "border-foreground bg-muted/70 dark:bg-zinc-800 ring-1 ring-foreground/20 font-medium"
                  : "border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
              >
                <div>
                  <span className="text-xs sm:text-sm font-medium text-foreground block">
                    {t("settings.metricSystemTitle")}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {t("settings.metricSystemDesc")}
                  </span>
                </div>
                {props.measurementUnit === "metric" && (
                  <Check className="size-4 text-foreground shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => props.setMeasurementUnit("imperial")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${props.measurementUnit === "imperial"
                  ? "border-foreground bg-muted/70 dark:bg-zinc-800 ring-1 ring-foreground/20 font-medium"
                  : "border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
              >
                <div>
                  <span className="text-xs sm:text-sm font-medium text-foreground block">
                    {t("settings.imperialSystemTitle")}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {t("settings.imperialSystemDesc")}
                  </span>
                </div>
                {props.measurementUnit === "imperial" && (
                  <Check className="size-4 text-foreground shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Default Serving Size (Moved from Account) */}
          <div className="pt-5 border-t border-border/60 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                <UtensilsCrossed className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {t("settings.defaultServingTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.defaultServingDesc")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[1, 2, 4, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => props.setDefaultServings(num)}
                  className={`size-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${props.defaultServings === num
                    ? "bg-foreground text-background shadow-2xs font-semibold"
                    : "border border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground"
                    }`}
                >
                  {num}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-1.5">
                {t("settings.servingsUnit")}
              </span>
            </div>
          </div>

          {/* 3. Dietary Lifestyle & Allergies */}
          <div className="pt-5 border-t border-border/60 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {t("settings.dietarySectionTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.dietarySectionDesc")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {DIETARY_OPTIONS.map((diet) => {
                const isSelected = props.dietaryList.includes(diet);
                return (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => props.onToggleDietary(diet)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${isSelected
                      ? "bg-foreground text-background shadow-2xs font-semibold"
                      : "border border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground"
                      }`}
                  >
                    {t(`settings.diet_${diet.toLowerCase().replace(/[^a-z]/g, "")}`) || diet}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Spice Tolerance Level */}
          <div className="pt-5 border-t border-border/60 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {t("settings.spiceToleranceSectionTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.spiceToleranceSectionDesc")}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl pt-1">
              {[
                { id: "mild", label: t("settings.spiceMild"), icon: "🌱", desc: t("settings.spiceMildDesc") },
                { id: "medium", label: t("settings.spiceMedium"), icon: "🌶️", desc: t("settings.spiceMediumDesc") },
                { id: "hot", label: t("settings.spiceHot"), icon: "🌶️🌶️", desc: t("settings.spiceHotDesc") },
                { id: "fiery", label: t("settings.spiceFiery"), icon: "🔥", desc: t("settings.spiceFieryDesc") },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => props.setSpiceLevel(lvl.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${props.spiceLevel === lvl.id
                    ? "border-foreground bg-muted/70 dark:bg-zinc-800 ring-1 ring-foreground/20 font-medium"
                    : "border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                >
                  <span className="text-lg mb-1">{lvl.icon}</span>
                  <span className="text-xs font-bold text-foreground">
                    {lvl.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {lvl.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Cooking Experience Level */}
          <div className="pt-5 border-t border-border/60 flex flex-col gap-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {t("settings.cookingExperienceSectionTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.cookingExperienceSectionDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                {
                  id: "beginner",
                  label: t("settings.skillBeginner"),
                  desc: t("settings.skillBeginnerDesc"),
                },
                {
                  id: "intermediate",
                  label: t("settings.skillIntermediate"),
                  desc: t("settings.skillIntermediateDesc"),
                },
                {
                  id: "advanced",
                  label: t("settings.skillAdvanced"),
                  desc: t("settings.skillAdvancedDesc"),
                },
              ].map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => props.setSkillLevel(sk.id as any)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${props.skillLevel === sk.id
                    ? "border-foreground bg-muted/70 dark:bg-zinc-800 ring-1 ring-foreground/20 font-medium"
                    : "border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-foreground block">
                      {sk.label}
                    </span>
                    {props.skillLevel === sk.id && (
                      <Check className="size-3.5 text-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {sk.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={props.isSaving}
              onClick={() => props.onSave("Preferences")}
              className="px-5 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {props.isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("settings.savingButton")}</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{t("settings.savePreferencesButton")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. NOTIFICATIONS                                     */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "notifications" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Minimal Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.notificationsSectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.notificationsSectionSubtitle")}
            </p>
          </div>

          {/* Activity Alerts List */}
          <div className="flex flex-col divide-y divide-border/50">
            {/* 1. Recipe Reviews */}
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <Star className="size-4.5 fill-amber-500/20" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.notifReviewsTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.notifReviewsDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.notifReviews}
                onChange={props.setNotifReviews}
                id="notif-reviews-switch"
              />
            </div>

            {/* 2. Review Replies */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                  <MessageSquare className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.notifRepliesTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.notifRepliesDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.notifReplies}
                onChange={props.setNotifReplies}
                id="notif-replies-switch"
              />
            </div>

            {/* 3. Recipe Saves */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <Bookmark className="size-4.5 fill-emerald-500/20" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.notifSavesTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.notifSavesDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.notifSaves}
                onChange={props.setNotifSaves}
                id="notif-saves-switch"
              />
            </div>

            {/* 4. Profile Unread Dot Indicator */}
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <Bell className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.notifBadgeTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.notifBadgeDesc")}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={props.notifProfileBadge}
                onChange={props.setNotifProfileBadge}
                id="notif-badge-switch"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border/70 flex items-center justify-end">
            <button
              type="button"
              disabled={props.isSaving}
              onClick={() => props.onSave("Notification preferences")}
              className="px-5 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {props.isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("settings.savingButton")}</span>
                </>
              ) : (
                <span>{t("settings.savePreferencesButton")}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. SECURITY & LOGIN                                  */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "security" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.securitySectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("settings.securitySectionSubtitle")}
            </p>
          </div>

          {/* Change Password Section */}
          <form onSubmit={props.onUpdatePassword} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                <KeyRound className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {t("settings.changePasswordTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.changePasswordDesc")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl pt-1">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  {t("settings.newPasswordLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={props.newPassword}
                    onChange={(e) => props.setNewPassword(e.target.value)}
                    placeholder={t("settings.newPasswordPlaceholder")}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 pr-10 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  {t("settings.confirmPasswordLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={props.confirmPassword}
                    onChange={(e) => props.setConfirmPassword(e.target.value)}
                    placeholder={t("settings.confirmPasswordPlaceholder")}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-3.5 pr-10 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password match helper indicator */}
            {props.newPassword && props.confirmPassword && (
              <div className="max-w-xl">
                {props.newPassword === props.confirmPassword ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                    <Check className="size-3.5" /> {t("settings.passwordsMatch")}
                  </p>
                ) : (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> {t("settings.passwordsDoNotMatch")}
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  props.isUpdatingPassword ||
                  !props.newPassword ||
                  props.newPassword.length < 6 ||
                  props.newPassword !== props.confirmPassword
                }
                className="px-5 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {props.isUpdatingPassword ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t("settings.updatingPassword")}</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>{t("settings.updatePasswordButton")}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Two-Factor Authentication (2FA) */}
          <div className="pt-5 border-t border-border/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.twoFactorTitle")}
                  </h4>
                  {props.twoFactorEnabled ? (
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {t("settings.twoFactorActive")}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                      {t("settings.twoFactorOff")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.twoFactorDesc")}
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={props.twoFactorEnabled}
              onChange={(val) => {
                props.setTwoFactorEnabled(val);
                toast.info(val ? "2FA enabled for this account." : "2FA disabled.");
              }}
              id="two-factor-switch"
            />
          </div>

          {/* Active Browser Sessions */}
          <div className="pt-5 border-t border-border/60 flex flex-col gap-3.5">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {t("settings.activeSessionsTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.activeSessionsDesc")}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-100/60 dark:bg-zinc-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/80 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Laptop className="size-4.5" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-medium text-foreground block">
                    {t("settings.currentDevice")}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1.5 mt-0.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("settings.activeNow")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={props.onSignOut}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-destructive/10 hover:border-destructive/40 text-destructive text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <LogOut className="size-3.5" />
                <span>{t("settings.logoutButton")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. PRIVACY AND DATA                                  */}
      {/* ---------------------------------------------------- */}
      {props.activeTab === "privacy" && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1 pb-4 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground">
              {t("settings.privacySectionTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("settings.privacySectionSubtitle")}
            </p>
          </div>

          <div className="flex flex-col divide-y divide-border/60">
            {/* 1. Download Data */}
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Download className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.exportArchiveTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.exportArchiveDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={props.onExportData}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Download className="size-3.5" />
                <span>{t("settings.exportJsonButton")}</span>
              </button>
            </div>

            {/* 2. Search History */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Search className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.searchHistoryTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.searchHistoryDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("heygarlic_recent_searches");
                  } catch { }
                  toast.success("Search history cleared!");
                }}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100/70 hover:bg-destructive/10 hover:border-destructive/40 text-foreground/90 hover:text-destructive dark:text-zinc-200 dark:hover:text-red-400 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Trash2 className="size-3.5" />
                <span>{t("settings.clearHistoryButton")}</span>
              </button>
            </div>

            {/* 3. Privacy Policy */}
            <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-foreground/80 shrink-0">
                  <Lock className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {t("settings.privacyPolicyTitle")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.privacyPolicyDesc")}
                  </p>
                </div>
              </div>
              <Link
                href={l("/privacy")}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <span>{t("settings.readPolicyButton")}</span>
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full size-8 border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
