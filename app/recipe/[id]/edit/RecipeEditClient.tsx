"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Image as ImageIcon,
  Save,
  Clock,
  Lightbulb,
  ChevronUp,
  X,
  Upload,
  Loader2,
  AlertTriangle,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecipeById,
  getFallbackRecipeById,
  DETAILED_RECIPES,
  getCustomRecipe,
  saveCustomRecipe,
  DetailedRecipe,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";
import {
  saveRecipeAction,
  getRecipeDetailAction,
  deleteRecipeAction,
} from "@/app/actions/recipes";
import { useAuth } from "@/context/AuthContext";
import { compressImageToWebP } from "@/lib/compress";
import {
  CATEGORY_NAMES,
  getCategoriesByGroup,
  getCategoryDefaultImage,
} from "@/lib/categories";
import { clearClientCache } from "@/lib/clientCache";
import { useTranslation } from "@/lib/i18n/context";

// 6-dot grip icon matching the mockup
function GripIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 24"
      fill="currentColor"
      className="size-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 select-none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="5" cy="5" r="1.5" />
      <circle cx="11" cy="5" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
      <circle cx="5" cy="19" r="1.5" />
      <circle cx="11" cy="19" r="1.5" />
    </svg>
  );
}

// Hand-drawn double hearts "♡ ♡" doodle beside Steps card
function HeartsDoodle() {
  return (
    <div
      className="hidden lg:flex flex-col items-center gap-0.5 text-foreground/80 absolute -right-8 xl:-right-10 top-10 pointer-events-none select-none z-10"
      aria-hidden="true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="-rotate-12"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rotate-6 -translate-x-1"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </div>
  );
}

// Hand-drawn spark rays "\ | /" doodle above Save Changes button
function SparkDoodle() {
  return (
    <div
      className="absolute -top-3.5 right-6 sm:right-8 pointer-events-none select-none text-foreground z-10"
      aria-hidden="true"
    >
      <svg
        width="28"
        height="18"
        viewBox="0 0 28 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M3 15L8 9" />
        <path d="M14 14L14 3" />
        <path d="M25 15L20 9" />
      </svg>
    </div>
  );
}

// Helper to parse single-line natural language ingredient text (e.g. "2kg sugar", "salt to taste", "4 cloves garlic")
export function parseIngredientText(raw: string): {
  name: string;
  amount: number;
  unit: string;
  rawText: string;
} {
  const text = (raw || "").trim();
  if (!text) return { name: "", amount: 0, unit: "", rawText: "" };

  const UNITS = [
    "kg", "g", "mg", "lb", "lbs", "oz",
    "cup", "cups", "tbsp", "tbs", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons",
    "clove", "cloves",
    "ml", "l", "liter", "liters",
    "pinch", "pinches", "dash", "dashes",
    "piece", "pieces", "slice", "slices",
    "stalk", "stalks", "can", "cans", "bunch", "bunches",
    "handful", "handfuls", "sprig", "sprigs"
  ];

  // Check special descriptors like "to taste", "to tast", "as needed", "for garnish", "optional"
  const specialUnitMatches: { regex: RegExp; unit: string }[] = [
    { regex: /\b(to taste|to tast)\b/i, unit: "to taste" },
    { regex: /\b(as needed)\b/i, unit: "as needed" },
    { regex: /\b(for garnish)\b/i, unit: "for garnish" },
    { regex: /\b(optional)\b/i, unit: "optional" },
  ];

  for (const item of specialUnitMatches) {
    if (item.regex.test(text)) {
      const name = text
        .replace(item.regex, "")
        .replace(/^[,\s-]+|[,\s-]+$/g, "")
        .trim();
      return {
        name: name || text,
        amount: 0,
        unit: item.unit,
        rawText: text,
      };
    }
  }

  // Regex to extract leading number (integer, decimal, or fraction like 1/2 or 1 1/2)
  const fractionOrNumRegex =
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/i;
  const matchA = text.match(fractionOrNumRegex);

  if (matchA) {
    const numStr = matchA[1].trim();
    const potentialUnit = (matchA[2] || "").trim().toLowerCase();
    const name = matchA[3].trim();

    // Convert fraction/number to numeric
    let amount = 0;
    if (numStr.includes("/")) {
      if (numStr.includes(" ")) {
        const [whole, frac] = numStr.split(" ");
        const [n, d] = frac.split("/");
        amount = parseFloat(whole) + parseFloat(n) / parseFloat(d);
      } else {
        const [n, d] = numStr.split("/");
        amount = parseFloat(n) / parseFloat(d);
      }
    } else {
      amount = parseFloat(numStr) || 0;
    }

    if (potentialUnit && UNITS.includes(potentialUnit)) {
      return {
        name,
        amount,
        unit: potentialUnit,
        rawText: text,
      };
    } else if (potentialUnit) {
      return {
        name: `${potentialUnit} ${name}`.trim(),
        amount,
        unit: "pieces",
        rawText: text,
      };
    } else {
      return {
        name,
        amount,
        unit: "",
        rawText: text,
      };
    }
  }

  // Pattern B: "2 eggs" or "4 apples" (number followed by name, no unit)
  const numOnlyMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (numOnlyMatch) {
    return {
      name: numOnlyMatch[2].trim(),
      amount: parseFloat(numOnlyMatch[1]) || 0,
      unit: "pieces",
      rawText: text,
    };
  }

  // Fallback: No quantity detected (e.g. "Salt", "Parsley", "Fresh basil")
  return {
    name: text,
    amount: 0,
    unit: "",
    rawText: text,
  };
}

// Convert existing structured ingredient to single-line text
function formatIngredientToRaw(
  name: string,
  amount?: string | number,
  unit?: string
): string {
  const cleanName = (name || "").trim();
  const num =
    typeof amount === "number"
      ? amount > 0
        ? String(amount)
        : ""
      : (amount || "").trim();
  const cleanUnit = (unit || "").trim();

  if (!cleanName && !num && !cleanUnit) return "";

  if (cleanUnit.toLowerCase() === "to taste") {
    return cleanName ? `${cleanName} to taste` : "to taste";
  }
  if (cleanUnit.toLowerCase() === "as needed") {
    return cleanName ? `${cleanName} as needed` : "as needed";
  }
  if (cleanUnit.toLowerCase() === "for garnish") {
    return cleanName ? `${cleanName} for garnish` : "for garnish";
  }
  if (cleanUnit.toLowerCase() === "optional") {
    return cleanName ? `${cleanName} (optional)` : "optional";
  }

  if (num && cleanUnit && cleanUnit !== "pieces") {
    return `${num}${cleanUnit.length <= 2 ? cleanUnit : " " + cleanUnit} ${cleanName}`.trim();
  }

  if (num) {
    return `${num} ${cleanName}`.trim();
  }

  if (cleanUnit) {
    return `${cleanName} (${cleanUnit})`.trim();
  }

  return cleanName;
}

// Capitalize first character helper
function capitalizeFirstLetter(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Auto-formats ingredient text to standard format (e.g. "sugar 2kg" -> "2kg Sugar", "garlic 4 cloves" -> "4 cloves Garlic")
export function normalizeIngredientLine(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  const UNITS = [
    "kg", "g", "mg", "lb", "lbs", "oz",
    "cup", "cups", "tbsp", "tbs", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons",
    "clove", "cloves",
    "ml", "l", "liter", "liters",
    "pinch", "pinches", "dash", "dashes",
    "piece", "pieces", "slice", "slices",
    "stalk", "stalks", "can", "cans", "bunch", "bunches",
    "handful", "handfuls", "sprig", "sprigs"
  ];

  // Extract trailing parenthetical notes, e.g. "(minced)", "(grated)", "(chopped)"
  let coreText = trimmed;
  let note = "";
  const noteMatch = coreText.match(/\s*(\([^)]+\))\s*$/);
  if (noteMatch) {
    note = noteMatch[1];
    coreText = coreText.slice(0, noteMatch.index).trim();
  }

  // Check special descriptors like "to taste", "as needed", "for garnish", "optional"
  const specialPatterns = [
    { regex: /\b(to taste|to tast)\b/i, unit: "to taste" },
    { regex: /\b(as needed)\b/i, unit: "as needed" },
    { regex: /\b(for garnish)\b/i, unit: "for garnish" },
    { regex: /\b(optional)\b/i, unit: "optional" },
  ];
  for (const item of specialPatterns) {
    if (item.regex.test(coreText)) {
      const name = coreText
        .replace(item.regex, "")
        .replace(/^[,\s-]+|[,\s-]+$/g, "")
        .trim();
      const capName = capitalizeFirstLetter(name);
      return capName
        ? `${capName} ${item.unit}${note ? " " + note : ""}`
        : `${capitalizeFirstLetter(item.unit)}${note ? " " + note : ""}`;
    }
  }

  const formatAmountUnit = (amountStr: string, unitStr?: string) => {
    const u = (unitStr || "").trim();
    if (!u) return amountStr;
    const isShortUnit = u.length <= 2; // e.g. kg, g, ml, lb, oz
    return isShortUnit ? `${amountStr}${u.toLowerCase()}` : `${amountStr} ${u.toLowerCase()}`;
  };

  // Trailing quantity & unit (e.g. "sugar 2kg", "sugar 2 kg", "garlic 4 cloves", "eggs 2", "salt 1/2 tsp")
  const trailingRegex =
    /^(.+?)\s*[-:]?\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/i;
  const trailingMatch = coreText.match(trailingRegex);

  if (trailingMatch) {
    const namePart = trailingMatch[1].trim();
    const amountPart = trailingMatch[2].trim();
    const unitPart = (trailingMatch[3] || "").trim().toLowerCase();

    // If unit is recognized or empty (e.g. "eggs 2")
    if (!unitPart || UNITS.includes(unitPart)) {
      const formattedAmount = formatAmountUnit(amountPart, unitPart);
      const formattedName = capitalizeFirstLetter(namePart);
      return `${formattedAmount} ${formattedName}${note ? " " + note : ""}`.trim();
    }
  }

  // Leading quantity & unit (e.g. "2kg sugar", "4 cloves garlic", "2 eggs", "200g pasta")
  const leadingRegex =
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*[-:]?\s*(.+)$/i;
  const leadingMatch = coreText.match(leadingRegex);

  if (leadingMatch) {
    const amountPart = leadingMatch[1].trim();
    const potentialUnit = (leadingMatch[2] || "").trim().toLowerCase();
    const namePart = leadingMatch[3].trim();

    if (potentialUnit && UNITS.includes(potentialUnit)) {
      const formattedAmount = formatAmountUnit(amountPart, potentialUnit);
      const formattedName = capitalizeFirstLetter(namePart);
      return `${formattedAmount} ${formattedName}${note ? " " + note : ""}`.trim();
    } else if (potentialUnit) {
      const formattedName = capitalizeFirstLetter(`${potentialUnit} ${namePart}`);
      return `${amountPart} ${formattedName}${note ? " " + note : ""}`.trim();
    } else {
      const formattedName = capitalizeFirstLetter(namePart);
      return `${amountPart} ${formattedName}${note ? " " + note : ""}`.trim();
    }
  }

  // Fallback: Capitalize first letter and preserve note
  const formattedName = capitalizeFirstLetter(coreText);
  return note ? `${formattedName} ${note}` : formattedName;
}

// Helper to split bulk text into individual ingredient lines by comma or newline
export function splitIngredientsText(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/,(?![^(]*\))/))
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface IngredientSection {
  id: string;
  title: string;
  items: string[];
}

interface StepItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  image?: string;
  timerMinutes?: number;
  tip?: string;
  showTimerInput?: boolean;
  showTipInput?: boolean;
}

export interface StepSection {
  id: string;
  title: string;
  steps: StepItem[];
}

function reindexStepSections(secs: StepSection[]): StepSection[] {
  let counter = 1;
  return secs.map((sec) => ({
    ...sec,
    steps: sec.steps.map((st) => ({
      ...st,
      stepNumber: counter++,
    })),
  }));
}

export interface RecipeSnapshot {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  heroImage: string;
  sections: IngredientSection[];
  stepSections: StepSection[];
  mobileWizardStep: 1 | 2 | 3;
}

export default function RecipeEditClient({
  initialId,
  isNew = false,
}: {
  initialId?: string;
  isNew?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t, l } = useTranslation();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(l("/login"));
    }
  }, [isAuthLoading, user, router, l]);

  const isNewRecipe =
    isNew || initialId === "new" || params?.id === "new";

  const recipeId =
    initialId || (params?.id as string) || "creamy-garlic-parmesan-pasta";

  const originalRecipe: DetailedRecipe =
    getRecipeById(recipeId) ||
    getFallbackRecipeById(recipeId) ||
    DETAILED_RECIPES["creamy-garlic-parmesan-pasta"];

  // Form states matching mockup
  const [title, setTitle] = useState(isNewRecipe ? "" : "Creamy Garlic Parmesan Pasta");
  const [description, setDescription] = useState(
    isNewRecipe
      ? ""
      : "A rich and creamy pasta dish with the perfect balance of garlic and parmesan. Simple ingredients, big flavor — ready in just 20 minutes!"
  );
  const [prepTime, setPrepTime] = useState(isNewRecipe ? 10 : 10);
  const [cookTime, setCookTime] = useState(isNewRecipe ? 20 : 10);
  const [servings, setServings] = useState(2);
  const [category, setCategory] = useState<string>("Curries");
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert">("Dinner");
  const [cuisine, setCuisine] = useState<string>("");
  const [dietaryTag, setDietaryTag] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, "").trim();
    if (!clean) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) {
      toast.error("You can add up to 10 tags per recipe.");
      return;
    }
    setTags((prev) => [...prev, clean]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };
  const [heroImage, setHeroImage] = useState(isNewRecipe ? "" : "/recipes/creamy-pasta-hero.jpg");
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File input ref for hero image
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const stepImageInputRef = useRef<HTMLInputElement>(null);
  const [activeStepUploadId, setActiveStepUploadId] = useState<string | null>(
    null
  );

  // Ingredient sections state with line-by-line items list
  const [sections, setSections] = useState<IngredientSection[]>(
    isNewRecipe
      ? [
        {
          id: "sec-1",
          title: "",
          items: [""],
        },
      ]
      : [
        {
          id: "sec-1",
          title: "",
          items: [
            "200g Pasta (fettuccine or spaghetti)",
            "4 cloves Garlic (minced)",
            "2 tbsp Unsalted butter",
            "1 cup Parmesan cheese (grated)",
            "Salt to taste",
            "Black pepper to taste",
            "2 tbsp Fresh parsley (chopped)",
          ],
        },
      ]
  );
  const [mobileWizardStep, setMobileWizardStep] = useState<1 | 2 | 3>(1);

  // Ingredient Edit / Manage mode and Drag-and-drop reordering state
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ secIdx: number; itemIdx: number } | null>(null);

  // Move ingredient item within a section (for drag & drop and mobile up/down buttons)
  const handleMoveIngredient = (secIdx: number, fromIdx: number, toIdx: number) => {
    if (
      toIdx < 0 ||
      toIdx >= (sections[secIdx]?.items.length || 0) ||
      fromIdx === toIdx
    ) {
      return;
    }
    commitSnapshotImmediately();
    setSections((prev) => {
      const copy = [...prev];
      const sec = copy[secIdx];
      if (!sec) return prev;
      const items = [...sec.items];
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      copy[secIdx] = { ...sec, items };
      return copy;
    });
  };

  // Undo / Redo history state across tabs
  const [past, setPast] = useState<RecipeSnapshot[]>([]);
  const [future, setFuture] = useState<RecipeSnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);
  const lastCommittedRef = useRef<RecipeSnapshot | null>(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isLoadedRef = useRef(false);

  // Confirmation modal dialog state for delete/clear actions
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "Delete"
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  // Step Sections state
  const [stepSections, setStepSections] = useState<StepSection[]>(
    isNewRecipe
      ? [
        {
          id: "step-sec-1",
          title: "",
          steps: [
            {
              id: "step-1",
              stepNumber: 1,
              title: "",
              description: "",
            },
          ],
        },
      ]
      : [
        {
          id: "step-sec-1",
          title: "",
          steps: [
            {
              id: "step-1",
              stepNumber: 1,
              title: "Cook the pasta",
              description:
                "Bring a large pot of salted water to a boil. Cook the pasta according to package instructions until al dente. Drain and set aside.",
            },
          ],
        },
      ]
  );

  // Load custom recipe from Supabase or localStorage on client mount if available
  useEffect(() => {
    if (isNewRecipe) {
      isLoadedRef.current = true;
      return;
    }

    let isMounted = true;

    async function loadRecipeData() {
      // 1. Try loading from Supabase DB
      try {
        const dbRecipe = await getRecipeDetailAction(recipeId);
        if (dbRecipe && isMounted) {
          // Strict Ownership Check: Only the author can edit their recipe
          if (dbRecipe.user_id && user && dbRecipe.user_id !== user.id) {
            toast.error("You can only edit recipes that you created.");
            router.replace(l(`/recipe/${recipeId}`));
            return;
          }

          setTitle(dbRecipe.title || "");
          setDescription(dbRecipe.description || "");
          setPrepTime(dbRecipe.prep_time ?? 10);
          setCookTime(dbRecipe.cook_time ?? 20);
          setServings(dbRecipe.default_servings ?? 2);
          if (dbRecipe.hero_image) setHeroImage(dbRecipe.hero_image);
          if (dbRecipe.category) setCategory(dbRecipe.category);
          if (dbRecipe.meal_type) setMealType(dbRecipe.meal_type as any);
          if (dbRecipe.cuisine) setCuisine(dbRecipe.cuisine);
          if (dbRecipe.dietary_tag) setDietaryTag(dbRecipe.dietary_tag);
          if (Array.isArray(dbRecipe.tags)) setTags(dbRecipe.tags);

          if (Array.isArray(dbRecipe.ingredients) && dbRecipe.ingredients.length > 0) {
            const groupsMap: Record<string, string[]> = {};
            dbRecipe.ingredients.forEach((ing: any) => {
              const grp = ing.group || "";
              if (!groupsMap[grp]) groupsMap[grp] = [];
              const formatted = formatIngredientToRaw(ing.name, ing.baseAmount, ing.unit);
              if (formatted) groupsMap[grp].push(formatted);
            });
            const loadedSections: IngredientSection[] = Object.entries(groupsMap).map(
              ([grpTitle, itemsList], sIdx) => ({
                id: `sec-${sIdx + 1}`,
                title: grpTitle,
                items: itemsList.length > 0 ? itemsList : [""],
              })
            );
            if (loadedSections.length > 0) setSections(loadedSections);
          }

          if (Array.isArray(dbRecipe.instructions) && dbRecipe.instructions.length > 0) {
            const secMap: Record<string, StepItem[]> = {};
            dbRecipe.instructions.forEach((inst: any, idx: number) => {
              const secName = inst.sectionTitle || "";
              if (!secMap[secName]) secMap[secName] = [];
              secMap[secName].push({
                id: `step-${idx + 1}`,
                stepNumber: inst.stepNumber || idx + 1,
                title: inst.title || `Step ${idx + 1}`,
                description: inst.description || "",
                image: inst.image || "",
              });
            });
            const loadedStepSecs: StepSection[] = Object.entries(secMap).map(
              ([secTitle, stepList], sIdx) => ({
                id: `step-sec-${sIdx + 1}`,
                title: secTitle,
                steps: stepList,
              })
            );
            if (loadedStepSecs.length > 0) setStepSections(reindexStepSections(loadedStepSecs));
          }

          const timer = setTimeout(() => {
            isLoadedRef.current = true;
          }, 600);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        // Fallback to local
      }

      // 2. Fallback to localStorage or mock DETAILED_RECIPES
      const saved = getCustomRecipe(recipeId);
      const source = saved || originalRecipe;
      if (source && isMounted) {
        setTitle(source.title || "");
        setDescription(source.description || "");
        setPrepTime(source.prepTime ?? 10);
        setCookTime(source.cookTime ?? 10);
        setServings(source.defaultServings || 2);
        if (source.heroImage) setHeroImage(source.heroImage);
        if (source.category) setCategory(source.category);
        if (source.mealType) setMealType(source.mealType as any);
        if ((source as any).cuisine) setCuisine((source as any).cuisine);
        if (source.dietaryTag) setDietaryTag(source.dietaryTag);
        if (Array.isArray(source.tags)) setTags(source.tags);

        if (source.ingredients && source.ingredients.length > 0) {
          const groupsMap: Record<string, string[]> = {};
          source.ingredients.forEach((ing) => {
            const grp = ing.group || "";
            if (!groupsMap[grp]) groupsMap[grp] = [];
            const formatted = formatIngredientToRaw(
              ing.name,
              ing.baseAmount,
              ing.unit
            );
            if (formatted) groupsMap[grp].push(formatted);
          });

          const initialSections: IngredientSection[] = Object.entries(
            groupsMap
          ).map(([grpTitle, itemsList], sIdx) => ({
            id: `sec-${sIdx + 1}`,
            title: grpTitle,
            items: itemsList.length > 0 ? itemsList : [""],
          }));

          if (initialSections.length > 0) {
            setSections(initialSections);
          }
        }

        if (source.instructions && source.instructions.length > 0) {
          const secMap: Record<string, StepItem[]> = {};
          source.instructions.forEach((inst, idx) => {
            const secName = inst.sectionTitle || "";
            if (!secMap[secName]) secMap[secName] = [];
            secMap[secName].push({
              id: `step-${idx + 1}`,
              stepNumber: inst.stepNumber || idx + 1,
              title: inst.title || `Step ${idx + 1}`,
              description: inst.description || "",
              image: inst.image || "",
            });
          });

          const loadedSecs: StepSection[] = Object.entries(secMap).map(
            ([secTitle, stepList], sIdx) => ({
              id: `step-sec-${sIdx + 1}`,
              title: secTitle,
              steps: stepList,
            })
          );

          if (loadedSecs.length > 0) {
            setStepSections(reindexStepSections(loadedSecs));
          }
        }
      }

      const timer = setTimeout(() => {
        isLoadedRef.current = true;
      }, 600);
      return () => clearTimeout(timer);
    }

    loadRecipeData();

    return () => {
      isMounted = false;
    };
  }, [recipeId, originalRecipe, isNewRecipe]);

  // Debounced Auto-save Effect while typing
  useEffect(() => {
    if (!isLoadedRef.current) return;

    setAutoSaveStatus("saving");
    const debounceTimer = setTimeout(() => {
      try {
        const flatIngredients = sections.flatMap((sec) => {
          return sec.items
            .map((raw) => parseIngredientText(raw))
            .filter((parsed) => parsed.name.trim().length > 0)
            .map((parsed) => ({
              name: parsed.name.trim(),
              baseAmount: parsed.amount,
              unit: parsed.unit.trim(),
              icon: "🧄",
              group: sec.title.trim() || undefined,
            }));
        });

        let currentStepNumber = 1;
        const flatInstructions = stepSections.flatMap((sec) =>
          sec.steps
            .filter((s) => s.description.trim().length > 0 || s.title.trim().length > 0)
            .map((s) => ({
              stepNumber: currentStepNumber++,
              title: s.title.trim() || `Step ${currentStepNumber - 1}`,
              description: s.description.trim(),
              image: s.image || "",
              sectionTitle: sec.title.trim() || undefined,
            }))
        );

        const updatedRecipe: DetailedRecipe = {
          ...originalRecipe,
          tag: originalRecipe.tag || "Quick & Easy",
          id: recipeId,
          title: title.trim() || "Untitled Recipe",
          description: description.trim(),
          heroImage,
          prepTime: Number(prepTime) || 10,
          cookTime: Number(cookTime) || 10,
          defaultServings: Number(servings) || 2,
          ingredients: flatIngredients.length > 0 ? flatIngredients : originalRecipe.ingredients,
          instructions: flatInstructions.length > 0 ? flatInstructions : originalRecipe.instructions,
        };

        saveCustomRecipe(updatedRecipe);

        try {
          localStorage.setItem(
            `recipe-draft-${recipeId}`,
            JSON.stringify({
              sections,
              stepSections,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          // ignore
        }

        setAutoSaveStatus("saved");
        const now = new Date();
        setLastSavedTime(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}`
        );
      } catch (err) {
        setAutoSaveStatus("idle");
      }
    }, 1200);

    return () => clearTimeout(debounceTimer);
  }, [
    title,
    description,
    prepTime,
    cookTime,
    servings,
    heroImage,
    sections,
    stepSections,
    recipeId,
    originalRecipe,
  ]);

  // Helper to construct current snapshot across all tabs
  const takeCurrentSnapshot = useCallback((): RecipeSnapshot => {
    return {
      title,
      description,
      prepTime,
      cookTime,
      servings,
      heroImage,
      sections: JSON.parse(JSON.stringify(sections)),
      stepSections: JSON.parse(JSON.stringify(stepSections)),
      mobileWizardStep,
    };
  }, [
    title,
    description,
    prepTime,
    cookTime,
    servings,
    heroImage,
    sections,
    stepSections,
    mobileWizardStep,
  ]);

  // Immediately commit current state to past history before a mutation
  const commitSnapshotImmediately = useCallback(() => {
    if (!isLoadedRef.current || isApplyingHistoryRef.current) return;
    const currentSnap = takeCurrentSnapshot();
    if (lastCommittedRef.current) {
      const prevJson = JSON.stringify(lastCommittedRef.current);
      const currJson = JSON.stringify(currentSnap);
      if (prevJson !== currJson) {
        setPast((prev) => [...prev.slice(-30), lastCommittedRef.current!]);
        setFuture([]);
        lastCommittedRef.current = currentSnap;
      }
    } else {
      lastCommittedRef.current = currentSnap;
    }
  }, [takeCurrentSnapshot]);

  // History tracking effect for user input across tabs
  useEffect(() => {
    if (!isLoadedRef.current) {
      lastCommittedRef.current = takeCurrentSnapshot();
      return;
    }

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentSnap = takeCurrentSnapshot();
      if (lastCommittedRef.current) {
        const prevJson = JSON.stringify(lastCommittedRef.current);
        const currJson = JSON.stringify(currentSnap);
        if (prevJson !== currJson) {
          setPast((prev) => [...prev.slice(-30), lastCommittedRef.current!]);
          setFuture([]);
          lastCommittedRef.current = currentSnap;
        }
      } else {
        lastCommittedRef.current = currentSnap;
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    title,
    description,
    prepTime,
    cookTime,
    servings,
    heroImage,
    sections,
    stepSections,
    mobileWizardStep,
    takeCurrentSnapshot,
  ]);

  // Undo action across tabs
  const handleUndo = useCallback(() => {
    if (past.length === 0) return;

    const currentSnap = takeCurrentSnapshot();
    const previousSnap = past[past.length - 1];
    const newPast = past.slice(0, -1);

    isApplyingHistoryRef.current = true;
    lastCommittedRef.current = previousSnap;

    setPast(newPast);
    setFuture((prev) => [currentSnap, ...prev.slice(0, 30)]);

    setTitle(previousSnap.title);
    setDescription(previousSnap.description);
    setPrepTime(previousSnap.prepTime);
    setCookTime(previousSnap.cookTime);
    setServings(previousSnap.servings);
    setHeroImage(previousSnap.heroImage);
    setSections(previousSnap.sections);
    setStepSections(previousSnap.stepSections);
    setMobileWizardStep(previousSnap.mobileWizardStep);

    toast.info("Undo: Reverted change", { duration: 1500 });
  }, [past, takeCurrentSnapshot]);

  // Redo action across tabs
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;

    const currentSnap = takeCurrentSnapshot();
    const nextSnap = future[0];
    const newFuture = future.slice(1);

    isApplyingHistoryRef.current = true;
    lastCommittedRef.current = nextSnap;

    setFuture(newFuture);
    setPast((prev) => [...prev.slice(-30), currentSnap]);

    setTitle(nextSnap.title);
    setDescription(nextSnap.description);
    setPrepTime(nextSnap.prepTime);
    setCookTime(nextSnap.cookTime);
    setServings(nextSnap.servings);
    setHeroImage(nextSnap.heroImage);
    setSections(nextSnap.sections);
    setStepSections(nextSnap.stepSections);
    setMobileWizardStep(nextSnap.mobileWizardStep);

    toast.info("Redo: Restored change", { duration: 1500 });
  }, [future, takeCurrentSnapshot]);

  // Global Keyboard shortcuts: Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (!e.shiftKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          handleUndo();
        } else if (
          e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z")
        ) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Hero image upload handler
  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      commitSnapshotImmediately();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setHeroImage(reader.result);
          toast.success("Recipe photo updated!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Step image upload handler
  const handleStepImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeStepUploadId) {
      commitSnapshotImmediately();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const newImg = reader.result;
          setStepSections((prev) =>
            prev.map((sec) => ({
              ...sec,
              steps: sec.steps.map((st) =>
                st.id === activeStepUploadId ? { ...st, image: newImg } : st
              ),
            }))
          );
          toast.success("Step photo attached!");
          setActiveStepUploadId(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new section
  const handleAddSection = () => {
    commitSnapshotImmediately();
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        title: "",
        items: [""],
      },
    ]);
  };

  // Remove section
  const handleRemoveSection = (sectionIndex: number) => {
    if (sections.length <= 1) {
      toast.error("At least one ingredient section is required");
      return;
    }
    commitSnapshotImmediately();
    setSections((prev) => prev.filter((_, idx) => idx !== sectionIndex));
  };

  // Update Section Title
  const handleUpdateSectionTitle = (sectionIndex: number, title: string) => {
    setSections((prev) => {
      const copy = [...prev];
      if (!copy[sectionIndex]) return prev;
      copy[sectionIndex] = { ...copy[sectionIndex], title };
      return copy;
    });
  };

  // Add new ingredient item to section
  const handleAddIngredientItem = (
    sectionIndex: number,
    insertAtIdx?: number
  ) => {
    commitSnapshotImmediately();
    setSections((prev) => {
      const copy = [...prev];
      const sec = copy[sectionIndex];
      if (!sec) return prev;
      const newItems = [...sec.items];
      const targetIdx =
        typeof insertAtIdx === "number" ? insertAtIdx : newItems.length;
      newItems.splice(targetIdx, 0, "");
      copy[sectionIndex] = { ...sec, items: newItems };
      return copy;
    });

    setTimeout(() => {
      const targetIdx =
        typeof insertAtIdx === "number"
          ? insertAtIdx
          : sections[sectionIndex]?.items.length || 0;
      const inputEl = document.getElementById(
        `ingredient-${sectionIndex}-${targetIdx}`
      ) as HTMLInputElement | null;
      if (inputEl) inputEl.focus();
    }, 50);
  };

  // Update ingredient item value (with multi-line paste splitting)
  const handleUpdateIngredientItem = (
    sectionIndex: number,
    itemIndex: number,
    value: string
  ) => {
    if (value.includes("\n") || value.includes("\r")) {
      const rawLines = value
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (rawLines.length > 1) {
        const formattedLines = rawLines.map(normalizeIngredientLine);
        setSections((prev) => {
          const copy = [...prev];
          const sec = copy[sectionIndex];
          if (!sec) return prev;
          const newItems = [...sec.items];
          newItems.splice(itemIndex, 1, ...formattedLines);
          copy[sectionIndex] = { ...sec, items: newItems };
          return copy;
        });
        return;
      }
    }

    setSections((prev) => {
      const copy = [...prev];
      const sec = copy[sectionIndex];
      if (!sec) return prev;
      const newItems = [...sec.items];
      newItems[itemIndex] = value;
      copy[sectionIndex] = { ...sec, items: newItems };
      return copy;
    });
  };

  // Auto-format ingredient item on blur (e.g. "sugar 2kg" -> "2kg Sugar")
  const handleAutoFormatIngredientItem = (
    sectionIndex: number,
    itemIndex: number
  ) => {
    setSections((prev) => {
      const copy = [...prev];
      const sec = copy[sectionIndex];
      if (!sec || typeof sec.items[itemIndex] !== "string") return prev;
      const raw = sec.items[itemIndex];
      const formatted = normalizeIngredientLine(raw);
      if (formatted !== raw) {
        const newItems = [...sec.items];
        newItems[itemIndex] = formatted;
        copy[sectionIndex] = { ...sec, items: newItems };
        return copy;
      }
      return prev;
    });
  };

  // Keydown handler for ingredient item (Enter adds next line and auto-formats; Backspace on empty deletes)
  const handleKeyDownIngredientItem = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    sectionIndex: number,
    itemIndex: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentVal = sections[sectionIndex]?.items[itemIndex] || "";
      const formatted = normalizeIngredientLine(currentVal);

      setSections((prev) => {
        const copy = [...prev];
        const sec = copy[sectionIndex];
        if (!sec) return prev;
        const newItems = [...sec.items];
        newItems[itemIndex] = formatted;
        newItems.splice(itemIndex + 1, 0, "");
        copy[sectionIndex] = { ...sec, items: newItems };
        return copy;
      });

      setTimeout(() => {
        const nextInput = document.getElementById(
          `ingredient-${sectionIndex}-${itemIndex + 1}`
        ) as HTMLElement | null;
        if (nextInput) nextInput.focus();
      }, 50);
    } else if (
      e.key === "Backspace" &&
      (e.currentTarget.value === "" || e.currentTarget.value.length === 0)
    ) {
      if (sections[sectionIndex]?.items.length > 1) {
        e.preventDefault();
        handleRemoveIngredientItem(sectionIndex, itemIndex);
        const prevIdx = Math.max(0, itemIndex - 1);
        setTimeout(() => {
          const prevInput = document.getElementById(
            `ingredient-${sectionIndex}-${prevIdx}`
          ) as HTMLElement | null;
          if (prevInput) prevInput.focus();
        }, 50);
      }
    }
  };

  // Remove single ingredient item
  const handleRemoveIngredientItem = (
    sectionIndex: number,
    itemIndex: number
  ) => {
    commitSnapshotImmediately();
    setSections((prev) => {
      const copy = [...prev];
      const sec = copy[sectionIndex];
      if (!sec) return prev;
      if (sec.items.length <= 1) {
        copy[sectionIndex] = { ...sec, items: [""] };
        return copy;
      }
      const newItems = sec.items.filter((_, idx) => idx !== itemIndex);
      copy[sectionIndex] = { ...sec, items: newItems };
      return copy;
    });
  };

  // Clear all ingredient items in a section
  const handleClearSectionItems = (sectionIndex: number) => {
    commitSnapshotImmediately();
    setSections((prev) => {
      const copy = [...prev];
      if (!copy[sectionIndex]) return prev;
      copy[sectionIndex] = { ...copy[sectionIndex], items: [""] };
      return copy;
    });
    toast.info("Ingredients cleared");
  };

  // Add new Step Section
  const handleAddStepSection = () => {
    commitSnapshotImmediately();
    setStepSections((prev) => {
      const newSec: StepSection = {
        id: `step-sec-${Date.now()}`,
        title: "",
        steps: [
          {
            id: `step-${Date.now()}`,
            stepNumber: 0,
            title: "",
            description: "",
          },
        ],
      };
      return reindexStepSections([...prev, newSec]);
    });
    toast.success("New step section added!");
  };

  // Remove Step Section
  const handleRemoveStepSection = (secIdx: number) => {
    if (stepSections.length <= 1) {
      toast.error("At least one step section is required");
      return;
    }
    commitSnapshotImmediately();
    setStepSections((prev) => {
      return reindexStepSections(prev.filter((_, idx) => idx !== secIdx));
    });
    toast.info("Step section removed");
  };

  // Update Step Section Title
  const handleUpdateStepSectionTitle = (secIdx: number, title: string) => {
    setStepSections((prev) => {
      const copy = [...prev];
      if (!copy[secIdx]) return prev;
      copy[secIdx] = { ...copy[secIdx], title };
      return copy;
    });
  };

  // Add new step (into a specific section or the last section)
  const handleAddStep = (secIdx?: number) => {
    commitSnapshotImmediately();
    setStepSections((prev) => {
      const copy = [...prev];
      const targetIdx =
        typeof secIdx === "number" && copy[secIdx] ? secIdx : copy.length - 1;
      const targetSec = copy[targetIdx];
      if (!targetSec) return prev;
      const newStep: StepItem = {
        id: `step-${Date.now()}`,
        stepNumber: 0,
        title: "",
        description: "",
      };
      copy[targetIdx] = {
        ...targetSec,
        steps: [...targetSec.steps, newStep],
      };
      return reindexStepSections(copy);
    });
  };

  // Remove step from a specific section
  const handleRemoveStep = (secIdx: number, stepIdx: number) => {
    commitSnapshotImmediately();
    setStepSections((prev) => {
      const totalSteps = prev.reduce((acc, s) => acc + s.steps.length, 0);
      if (totalSteps <= 1) {
        const copy = [...prev];
        if (copy[0] && copy[0].steps[0]) {
          copy[0].steps[0] = {
            ...copy[0].steps[0],
            title: "",
            description: "",
            image: "",
            showTimerInput: false,
            showTipInput: false,
          };
        }
        toast.info("Step cleared");
        return copy;
      }

      const copy = [...prev];
      const targetSec = copy[secIdx];
      if (!targetSec) return prev;

      const remainingSteps = targetSec.steps.filter((_, idx) => idx !== stepIdx);
      if (remainingSteps.length === 0 && copy.length > 1) {
        return reindexStepSections(copy.filter((_, idx) => idx !== secIdx));
      }

      copy[secIdx] = {
        ...targetSec,
        steps:
          remainingSteps.length > 0
            ? remainingSteps
            : [
              {
                id: `step-${Date.now()}`,
                stepNumber: 0,
                title: "",
                description: "",
              },
            ],
      };
      return reindexStepSections(copy);
    });
    toast.info("Step deleted");
  };

  // Update step field
  const handleUpdateStep = (
    secIdx: number,
    stepIdx: number,
    field: keyof StepItem,
    value: any
  ) => {
    setStepSections((prev) => {
      const copy = [...prev];
      if (!copy[secIdx] || !copy[secIdx].steps[stepIdx]) return prev;
      const stepsCopy = [...copy[secIdx].steps];
      stepsCopy[stepIdx] = {
        ...stepsCopy[stepIdx],
        [field]: value,
      };
      copy[secIdx] = {
        ...copy[secIdx],
        steps: stepsCopy,
      };
      return copy;
    });
  };

  // Save changes handler (supports either Save as Draft or Publish)
  const handleSave = async (shouldPublish: boolean) => {
    if (!title.trim()) {
      toast.error("Please enter a recipe title");
      return;
    }

    if (title.length > 100) {
      toast.error("Title must be 100 characters or less");
      return;
    }

    if (description.length > 1000) {
      toast.error("Description must be 1,000 characters or less");
      return;
    }

    // Flatten ingredients from all sections by parsing items
    const flatIngredients = sections.flatMap((sec) => {
      return sec.items
        .map((raw) => parseIngredientText(raw))
        .filter((parsed) => parsed.name.trim().length > 0)
        .map((parsed) => ({
          name: parsed.name.trim(),
          baseAmount: parsed.amount,
          unit: parsed.unit.trim(),
          icon: "🧄",
          group: sec.title.trim() || undefined,
        }));
    });

    // Flatten instructions across all step sections
    let currentStepNumber = 1;
    const flatInstructions = stepSections.flatMap((sec) =>
      sec.steps
        .filter((s) => s.description.trim().length > 0 || s.title.trim().length > 0)
        .map((s) => ({
          stepNumber: currentStepNumber++,
          title: s.title.trim() || `Step ${currentStepNumber - 1}`,
          description: s.description.trim(),
          image: s.image || "",
          sectionTitle: sec.title.trim() || undefined,
        }))
    );

    if (shouldPublish) {
      if (flatIngredients.length === 0) {
        toast.error("Please add at least one ingredient to publish.");
        return;
      }
      if (flatInstructions.length === 0) {
        toast.error("Please provide description for at least one step to publish.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let finalHeroImageUrl = heroImage || "";

      // Upload hero image if new file was selected
      if (heroImageFile) {
        try {
          const compressedFile = await compressImageToWebP(heroImageFile);
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const fileExt = compressedFile.name.split(".").pop() || "webp";
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("recipe-images")
              .upload(filePath, compressedFile, {
                cacheControl: "3600",
                upsert: true,
                contentType: "image/webp",
              });

            if (!uploadError) {
              const {
                data: { publicUrl },
              } = supabase.storage.from("recipe-images").getPublicUrl(filePath);
              finalHeroImageUrl = publicUrl;
            } else {
              console.warn("Storage upload error:", uploadError);
            }
          }
        } catch (uploadErr) {
          console.warn("Image upload error:", uploadErr);
        }
      }

      if (!finalHeroImageUrl) {
        finalHeroImageUrl = getCategoryDefaultImage(category);
      }

      const saveResult = await saveRecipeAction({
        id: isNewRecipe ? undefined : recipeId,
        title: title.trim(),
        description: description.trim(),
        heroImage: finalHeroImageUrl,
        category,
        mealType,
        cuisine: cuisine || undefined,
        dietaryTag: dietaryTag || undefined,
        tags: tags.length > 0 ? tags : undefined,
        cookTime: Number(cookTime) || 20,
        prepTime: Number(prepTime) || 10,
        defaultServings: Number(servings) || 2,
        ingredients: flatIngredients,
        instructions: flatInstructions,
        isPublished: shouldPublish,
      });

      if (!saveResult.success) {
        toast.error(saveResult.error || "Failed to save recipe. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Save to local custom recipes as secondary cache
      try {
        const updatedRecipe: DetailedRecipe = {
          ...originalRecipe,
          tag: (tags && tags[0]) || originalRecipe.tag || "Quick & Easy",
          id: saveResult.slug || saveResult.recipeId || recipeId,
          title: title.trim(),
          description: description.trim(),
          heroImage: finalHeroImageUrl,
          prepTime: Number(prepTime) || 10,
          cookTime: Number(cookTime) || 20,
          defaultServings: Number(servings) || 2,
          category,
          mealType,
          dietaryTag: dietaryTag || undefined,
          tags: tags.length > 0 ? tags : undefined,
          ingredients: flatIngredients,
          instructions: flatInstructions,
          isPublished: shouldPublish,
        };
        saveCustomRecipe(updatedRecipe);
      } catch (e) {
        // ignore
      }

      clearClientCache();
      toast.success(
        shouldPublish
          ? "Recipe published successfully! 🎉"
          : "Recipe saved as draft! 📝"
      );

      setTimeout(() => {
        router.push(l("/profile?tab=recipes"));
      }, 400);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save recipe. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Delete recipe handler with confirmation modal
  const handleDeleteRecipe = () => {
    if (!recipeId || isNewRecipe) return;
    requestConfirm(
      "Delete Recipe",
      `Are you sure you want to permanently delete "${title || "this recipe"}"? This action cannot be undone.`,
      async () => {
        setIsSubmitting(true);
        try {
          const res = await deleteRecipeAction(recipeId);
          if (res.success) {
            clearClientCache();
            toast.success("Recipe deleted successfully");
            router.push(l("/profile?tab=recipes"));
          } else {
            toast.error(res.error || "Failed to delete recipe");
            setIsSubmitting(false);
          }
        } catch {
          toast.error("Failed to delete recipe");
          setIsSubmitting(false);
        }
      },
      "Delete Recipe"
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] dark:bg-[#121212] text-[#1A1A1A] dark:text-[#EAEAEA] transition-colors duration-200">
      {/* Hidden file inputs for image upload */}
      <input
        type="file"
        ref={heroImageInputRef}
        onChange={handleHeroImageChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={stepImageInputRef}
        onChange={handleStepImageChange}
        accept="image/*"
        className="hidden"
      />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Header: Back Link, Undo & Redo, and Auto-save Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 sm:pb-6 select-none">
          <Link
            href={l("/profile?tab=recipes")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground hover:underline transition-all"
          >
            <ArrowLeft className="size-3.5" />
            <span>{t("recipeEdit.backToRecipe")}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop / Tablet Undo & Redo Controls */}
            <div className="inline-flex items-center bg-[#FAF9F5] dark:bg-neutral-900 border border-[#D5D0C5] dark:border-neutral-800 rounded-full p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleUndo}
                disabled={past.length === 0}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-foreground disabled:opacity-35 disabled:cursor-not-allowed hover:not-disabled:bg-neutral-200/60 dark:hover:not-disabled:bg-neutral-800 transition-all cursor-pointer"
              >
                <Undo2 className="size-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <div className="w-[1px] h-3.5 bg-neutral-300 dark:bg-neutral-700 mx-0.5" />
              <button
                type="button"
                onClick={handleRedo}
                disabled={future.length === 0}
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-foreground disabled:opacity-35 disabled:cursor-not-allowed hover:not-disabled:bg-neutral-200/60 dark:hover:not-disabled:bg-neutral-800 transition-all cursor-pointer"
              >
                <Redo2 className="size-3.5" />
                <span className="hidden sm:inline">Redo</span>
              </button>
            </div>

            {/* Auto-save Status Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[#D5D0C5] dark:border-neutral-800 bg-[#FAF9F5] dark:bg-neutral-900 shadow-2xs">
              {autoSaveStatus === "saving" ? (
                <>
                  <Loader2 className="size-3 animate-spin text-amber-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Saving draft...</span>
                </>
              ) : autoSaveStatus === "saved" ? (
                <>
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {lastSavedTime ? `Auto-saved at ${lastSavedTime}` : "Auto-saved"}
                  </span>
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {lastSavedTime ? `Auto-saved at ${lastSavedTime}` : "Auto-save active"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Step-by-Step Wizard Stepper (Mobile Only) */}
        <div className="flex lg:hidden items-center justify-between gap-2 pb-5 select-none w-full">
          {[
            { step: 1 as const, title: "1. Details" },
            { step: 2 as const, title: "2. Ingredients" },
            { step: 3 as const, title: "3. Steps" },
          ].map((item) => {
            const isActive = mobileWizardStep === item.step;
            const isDone = mobileWizardStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  setMobileWizardStep(item.step);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex-1 py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer border transition-all ${isActive
                  ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                  : isDone
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-[#FAF9F5] dark:bg-neutral-900/60 text-neutral-400 dark:text-neutral-500 border-[#D5D0C5] dark:border-neutral-700 hover:text-foreground"
                  }`}
              >
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Responsive Layout: Custom stacked order on mobile, 2-column grid on desktop */}
        <div className="w-full flex flex-col gap-6 sm:gap-7 lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-12 lg:items-start items-stretch">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Hero Photo & Ingredients                    */}
          {/* ======================================================== */}
          <div className="contents lg:block lg:space-y-6 sm:lg:space-y-7">
            {/* 1. Hero Photo Box (Mobile Step 1) */}
            <div
              className={`order-1 lg:order-0 relative aspect-4/3 w-full rounded-3xl overflow-hidden border border-[#D5D0C5] dark:border-neutral-700 bg-[#EFECE3] dark:bg-neutral-900 shadow-sm group ${mobileWizardStep === 1 ? "block" : "hidden lg:block"
                }`}
            >
              {heroImage ? (
                <>
                  <Image
                    src={heroImage}
                    alt={title || "Recipe photo"}
                    fill
                    priority
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-102"
                  />

                  {/* Clear Photo Button in Top Right */}
                  <button
                    type="button"
                    onClick={() => {
                      setHeroImage("");
                      setHeroImageFile(null);
                      toast.info("Removed recipe photo");
                    }}
                    className="absolute top-3.5 right-3.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 z-10"
                  >
                    <Trash2 className="size-3 text-red-500" />
                    Remove
                  </button>

                  {/* Center Change Image Button */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                      type="button"
                      onClick={() => heroImageInputRef.current?.click()}
                      className="pointer-events-auto px-5 py-3.5 rounded-2xl bg-[#E8E1D5]/90 dark:bg-neutral-800/90 backdrop-blur-md border border-[#D5D0C5]/80 dark:border-neutral-700 text-foreground hover:bg-[#DDD5C7] dark:hover:bg-neutral-700 shadow-sm flex flex-col items-center justify-center gap-1 text-xs font-semibold cursor-pointer transition-all active:scale-95 select-none"
                    >
                      <ImageIcon className="size-6 text-foreground stroke-[1.8]" />
                      <span>Change Image</span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => heroImageInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none"
                >
                  <div className="size-16 rounded-2xl bg-[#E8E1D5] dark:bg-neutral-800 border border-[#D5D0C5] dark:border-neutral-700 flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
                    <Upload className="size-7 text-neutral-600 dark:text-neutral-300" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Upload Recipe Cover Photo
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed">
                    Tap to upload photo (automatically compressed to WebP &lt; 100 KB)
                  </span>
                </div>
              )}
            </div>

            {/* 5. Ingredients Section(s) (Mobile Step 2) */}
            <div
              className={`order-5 lg:order-0 w-full space-y-6 pt-1 lg:pt-0 ${mobileWizardStep === 2 ? "block" : "hidden lg:block"
                }`}
            >
              {sections.map((sec, secIdx) => {
                const hasItems = sec.items.some((it) => it.trim().length > 0);

                return (
                  <div key={sec.id} className="space-y-3.5">
                    {/* Ingredients Header */}
                    <div className="flex items-center justify-between gap-2 pt-1 pb-0.5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-1">
                          Ingredients <span className="text-[#E15B50]">*</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Edit / Done Toggle Button */}
                        {sec.items.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSectionIdx(
                                editingSectionIdx === secIdx ? null : secIdx
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95 select-none ${editingSectionIdx === secIdx
                              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-black shadow-xs"
                              : "text-neutral-600 dark:text-neutral-300 bg-neutral-200/50 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-[#D5D0C5]/60 dark:border-neutral-700"
                              }`}
                          >
                            {editingSectionIdx === secIdx ? (
                              <>
                                <Check className="size-3.5 stroke-[2.5]" />
                                <span>Done</span>
                              </>
                            ) : (
                              <>
                                <SlidersHorizontal className="size-3" />
                                <span>Edit</span>
                              </>
                            )}
                          </button>
                        )}

                        {hasItems && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirm(
                                "Clear section ingredients?",
                                "Are you sure you want to clear all ingredients in this section? This cannot be undone.",
                                () => handleClearSectionItems(secIdx),
                                "Clear"
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200/80 cursor-pointer transition-all active:scale-95 select-none"
                          >
                            <Trash2 className="size-3" />
                            <span>Clear</span>
                          </button>
                        )}

                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirm(
                                "Remove section?",
                                `Are you sure you want to remove the section "${sec.title || `Section ${secIdx + 1}`}" and its ingredients?`,
                                () => handleRemoveSection(secIdx),
                                "Remove Section"
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer transition-all active:scale-95 select-none shrink-0"
                          >
                            <Trash2 className="size-3.5 text-red-500 dark:text-red-400" />
                            <span>Remove Section</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Title Input (if multiple sections exist or non-empty) */}
                    {(sections.length > 1 || sec.title) && (
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) =>
                          handleUpdateSectionTitle(
                            secIdx,
                            e.target.value.slice(0, 100)
                          )
                        }
                        placeholder="Section heading (e.g. For the Sauce, For the Garnish)"
                        className="w-full rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-4 py-2.5 text-sm text-foreground font-semibold placeholder:text-neutral-400 placeholder:font-normal focus:outline-none focus:border-foreground/70 transition-colors shadow-2xs"
                      />
                    )}

                    {/* Line-by-line ingredient inputs */}
                    <div className="space-y-3 pt-0.5">
                      {sec.items.map((item, itemIdx) => {
                        const isEditing = editingSectionIdx === secIdx;
                        const isDraggingThis =
                          draggedItem?.secIdx === secIdx &&
                          draggedItem?.itemIdx === itemIdx;

                        return (
                          <div
                            key={`${sec.id}-line-${itemIdx}`}
                            draggable={isEditing}
                            onDragStart={() =>
                              setDraggedItem({ secIdx, itemIdx })
                            }
                            onDragOver={(e) => {
                              if (isEditing) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedItem && draggedItem.secIdx === secIdx) {
                                handleMoveIngredient(
                                  secIdx,
                                  draggedItem.itemIdx,
                                  itemIdx
                                );
                              }
                              setDraggedItem(null);
                            }}
                            onDragEnd={() => setDraggedItem(null)}
                            className={`flex flex-col gap-2 p-1 sm:p-0 rounded-2xl sm:rounded-none group/line animate-in fade-in-50 duration-150 transition-all ${isDraggingThis ? "opacity-40 scale-98" : ""
                              } ${isEditing
                                ? "bg-[#FAF9F5]/70 dark:bg-neutral-900/50 sm:bg-transparent dark:sm:bg-transparent border border-[#D5D0C5]/80 dark:border-neutral-700/80 sm:border-0 p-2 sm:p-0"
                                : ""
                              }`}
                          >
                            {/* Main Ingredient Row: Badge + Textarea + (Desktop edit tools) */}
                            <div className="flex items-start gap-2.5 sm:gap-3 w-full">
                              {/* Desktop Edit Tools (Grip & Arrows): visible on sm screens, hidden on mobile */}
                              {isEditing && (
                                <div className="hidden sm:flex items-center gap-0.5 shrink-0 pt-3 select-none">
                                  <div
                                    className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-foreground"
                                    title="Drag to reorder"
                                  >
                                    <GripIcon />
                                  </div>

                                  <div className="flex flex-col">
                                    <button
                                      type="button"
                                      disabled={itemIdx === 0}
                                      onClick={() =>
                                        handleMoveIngredient(
                                          secIdx,
                                          itemIdx,
                                          itemIdx - 1
                                        )
                                      }
                                      className="p-0.5 text-neutral-400 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ChevronUp className="size-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={itemIdx === sec.items.length - 1}
                                      onClick={() =>
                                        handleMoveIngredient(
                                          secIdx,
                                          itemIdx,
                                          itemIdx + 1
                                        )
                                      }
                                      className="p-0.5 text-neutral-400 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ChevronDown className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Line Number Badge */}
                              <div className="size-9 sm:size-10 rounded-2xl bg-[#EBE7DC] dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 select-none border border-[#D5D0C5]/70 dark:border-neutral-700/70 shadow-2xs mt-1.5">
                                {itemIdx + 1}
                              </div>

                              {/* Auto-growing Textarea Input (comfortably fits 2 to 3 lines) with 100 char limit */}
                              <div className="relative flex-1">
                                <textarea
                                  id={`ingredient-${secIdx}-${itemIdx}`}
                                  rows={2}
                                  maxLength={100}
                                  value={item}
                                  onChange={(e) => {
                                    handleUpdateIngredientItem(
                                      secIdx,
                                      itemIdx,
                                      e.target.value.slice(0, 100)
                                    );
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
                                  }}
                                  onBlur={() =>
                                    handleAutoFormatIngredientItem(secIdx, itemIdx)
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDownIngredientItem(e, secIdx, itemIdx)
                                  }
                                  placeholder="e.g. 2kg Sugar, 4 cloves Garlic, or Salt to taste"
                                  className="w-full rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-lg text-foreground placeholder:text-neutral-400 focus:outline-none focus:border-foreground/70 transition-all font-medium shadow-2xs resize-none overflow-hidden min-h-[68px] sm:min-h-[76px] leading-relaxed"
                                />
                                {item.length >= 80 && (
                                  <div className="text-right text-[10px] text-neutral-400 font-normal pr-2 pt-0.5">
                                    {item.length} / 100
                                  </div>
                                )}
                              </div>

                              {/* Desktop Delete Line Button (hidden on mobile, visible on sm:flex) */}
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveIngredientItem(secIdx, itemIdx)
                                  }
                                  className="hidden sm:flex size-10 sm:size-11 rounded-2xl items-center justify-center text-red-500 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/60 transition-all cursor-pointer shrink-0 select-none active:scale-95 mt-1.5"
                                  title="Remove ingredient"
                                >
                                  <Trash2 className="size-4 sm:size-4.5" />
                                </button>
                              )}
                            </div>

                            {/* Mobile Tools Strip UNDER the input box (box ekata yatin) */}
                            {isEditing && (
                              <div className="flex sm:hidden items-center justify-between pl-11 pr-1 pt-0.5 pb-1 select-none animate-in fade-in-50 duration-150">
                                {/* Mobile Reorder Tools */}
                                <div className="inline-flex items-center gap-1.5 bg-white dark:bg-neutral-800 border border-[#D5D0C5] dark:border-neutral-700 rounded-xl px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs">
                                  <div className="flex items-center gap-1 text-neutral-500 pr-1.5 border-r border-[#D5D0C5]/80 dark:border-neutral-700">
                                    <GripIcon className="size-3" />
                                    <span className="text-[11px] font-medium">Reorder</span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={itemIdx === 0}
                                    onClick={() =>
                                      handleMoveIngredient(
                                        secIdx,
                                        itemIdx,
                                        itemIdx - 1
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="size-3.5" />
                                    <span className="text-[11px] font-semibold">Up</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={itemIdx === sec.items.length - 1}
                                    onClick={() =>
                                      handleMoveIngredient(
                                        secIdx,
                                        itemIdx,
                                        itemIdx + 1
                                      )
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
                                    title="Move Down"
                                  >
                                    <ChevronDown className="size-3.5" />
                                    <span className="text-[11px] font-semibold">Down</span>
                                  </button>
                                </div>

                                {/* Mobile Delete Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveIngredientItem(secIdx, itemIdx)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer active:scale-95 shadow-2xs transition-all"
                                >
                                  <Trash2 className="size-3.5 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Ingredient Button inside section */}
                    <div className="pt-1.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAddIngredientItem(secIdx)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-2xl border border-dashed border-[#C8C2B5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 hover:bg-[#EBE7DC] dark:hover:bg-neutral-800 text-xs sm:text-sm font-semibold text-foreground transition-all cursor-pointer shadow-2xs active:scale-98 select-none"
                      >
                        <Plus className="size-4 stroke-[2.2]" />
                        <span>Add Ingredient</span>
                      </button>

                      <span className="text-xs text-neutral-400 select-none hidden sm:inline">
                        Press{" "}
                        <kbd className="px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[11px] font-mono">
                          Enter
                        </kbd>{" "}
                        to add next line
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Button for Left Column: Section + */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 hover:bg-[#EBE7DC] dark:hover:bg-neutral-800 px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 select-none"
                >
                  Section +
                </button>
              </div>

              {/* Mobile Step 2 Navigation: Back to Details & Next to Steps */}
              <div className="flex lg:hidden items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileWizardStep(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground py-3.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all shadow-2xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileWizardStep(3);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 rounded-full bg-[#1E1E1E] dark:bg-white text-white dark:text-black py-3.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
                >
                  <span>Next: Steps</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Details, Times, Steps & Save/Cancel        */}
          {/* ======================================================== */}
          <div className="contents lg:block lg:space-y-6 sm:lg:space-y-7 relative">
            {/* 2. Recipe Title Input (Mobile Step 1) */}
            <div
              className={`order-2 lg:order-0 w-full space-y-2 ${mobileWizardStep === 1 ? "block" : "hidden lg:block"
                }`}
            >
              <label className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1">
                Recipe Title <span className="text-[#E15B50]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                maxLength={100}
                placeholder="Title: e.g. My classic chocolate chip cookies"
                className="w-full rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-lg text-foreground placeholder:text-neutral-400 focus:outline-none focus:border-foreground/70 transition-all font-medium shadow-2xs"
              />
              <div className="text-right text-xs text-neutral-400 font-normal">
                {title.length} / 100 Character
              </div>
            </div>

            {/* 3. Description Textarea (Mobile Step 1) */}
            <div
              className={`order-3 lg:order-0 w-full space-y-2 ${mobileWizardStep === 1 ? "block" : "hidden lg:block"
                }`}
            >
              <label className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1">
                Description <span className="text-[#E15B50]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                maxLength={1000}
                rows={7}
                placeholder="Share a little more about this dish. What or who inspired you to cook it? What makes it special to you?"
                className="w-full rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 p-4 sm:p-5 text-sm sm:text-base text-foreground placeholder:text-neutral-400 focus:outline-none focus:border-foreground/70 resize-none min-h-[170px] sm:min-h-[185px] leading-relaxed transition-all shadow-2xs"
              />
              <div className="text-right text-xs text-neutral-400 font-normal">
                {description.length} / 1000 Character
              </div>
            </div>

            {/* 4. Prep Time, Cook Time, Servings Row (Mobile Step 1) */}
            <div
              className={`order-4 lg:order-0 w-full grid grid-cols-3 gap-3 sm:gap-4 ${mobileWizardStep === 1 ? "grid" : "hidden lg:grid"
                }`}
            >
              {/* Prep Time */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Prep Time
                </label>
                <div className="flex items-center justify-between rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base shadow-2xs">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={prepTime}
                    onChange={(e) =>
                      setPrepTime(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-12 bg-transparent text-foreground font-medium focus:outline-none"
                  />
                  <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 select-none font-medium">
                    min
                  </span>
                </div>
              </div>

              {/* Cook Time */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Cook Time
                </label>
                <div className="flex items-center justify-between rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base shadow-2xs">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={cookTime}
                    onChange={(e) =>
                      setCookTime(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-12 bg-transparent text-foreground font-medium focus:outline-none"
                  />
                  <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 select-none font-medium">
                    min
                  </span>
                </div>
              </div>

              {/* Servings Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Servings
                </label>
                <div className="relative">
                  <select
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 2)}
                    className="w-full appearance-none rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground font-medium focus:outline-none cursor-pointer shadow-2xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "person" : "people"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-4 text-neutral-500 dark:text-neutral-400 absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 5. Faceted Taxonomy & Categorization (Mobile Step 1) */}
            <div
              className={`order-4 lg:order-0 w-full space-y-3.5 ${mobileWizardStep === 1 ? "block" : "hidden lg:block"
                }`}
            >
              {/* Row A: Dish Category & Meal Type */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Dish Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground font-medium focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {CATEGORY_NAMES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 text-neutral-500 dark:text-neutral-400 absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Meal Type */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Meal Type
                  </label>
                  <div className="relative">
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as any)}
                      className="w-full appearance-none rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground font-medium focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 text-neutral-500 dark:text-neutral-400 absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row B: Cuisine & Dietary (Optional Facets) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Cuisine */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Cuisine <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground font-medium focus:outline-none cursor-pointer shadow-2xs"
                    >
                      <option value="">Any / General Cuisine</option>
                      {getCategoriesByGroup("cuisine").map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 text-neutral-500 dark:text-neutral-400 absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Dietary */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    Dietary <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={dietaryTag}
                      onChange={(e) => setDietaryTag(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground font-medium focus:outline-none cursor-pointer shadow-2xs"
                    >
                      <option value="">None / Standard</option>
                      {getCategoriesByGroup("dietary").map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 text-neutral-500 dark:text-neutral-400 absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row C: Custom Community Tags / Hashtags */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Hash className="size-3.5 text-muted-foreground" />
                    <span>Tags &amp; Keywords</span>
                    <span className="text-xs font-normal text-muted-foreground">(e.g. #AirFryer, #Spicy)</span>
                  </label>
                  <span className="text-2xs text-muted-foreground">{tags.length}/10</span>
                </div>

                {/* Active Tag Chips */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-neutral-200/80 dark:bg-neutral-800 text-foreground border border-neutral-300/60 dark:border-neutral-700"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="p-0.5 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="Type tag and press Enter (e.g. Kottu, OnePot, Crispy)..."
                    className="flex-1 rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-3.5 sm:px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="px-4 py-2.5 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-2xs text-muted-foreground mr-1">Suggestions:</span>
                  {["Spicy", "Quick & Easy", "Comfort Food", "Air Fryer", "One Pot", "Meal Prep", "Budget Friendly"]
                    .filter((s) => !tags.includes(s))
                    .slice(0, 5)
                    .map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddTag(sug)}
                        className="text-2xs px-2.5 py-1 rounded-full border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors cursor-pointer select-none"
                      >
                        + {sug}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Mobile Step 1 Next Button (Go to Ingredients) */}
            <div
              className={`order-5 lg:order-0 w-full pt-2 ${mobileWizardStep === 1 ? "flex lg:hidden" : "hidden"
                }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMobileWizardStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full rounded-full bg-[#1E1E1E] dark:bg-white text-white dark:text-black py-4 px-6 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                <span>Next: Ingredients</span>
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* 6. Steps Container (Mobile Step 3) */}
            <div
              className={`order-6 lg:order-0 w-full space-y-3 relative ${mobileWizardStep === 3 ? "block" : "hidden lg:block"
                }`}
            >
              <label className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-0.5">
                Steps <span className="text-[#E15B50]">*</span>
              </label>

              {/* Double Hearts Doodle beside Steps */}
              <HeartsDoodle />

              {/* Step Sections and Step Cards List */}
              <div className="space-y-6">
                {stepSections.map((sec, secIdx) => (
                  <div key={sec.id} className="space-y-3.5">
                    {/* Step Section Header (visible if multiple sections exist or if sec.title has text) */}
                    {(stepSections.length > 1 || sec.title) && (
                      <div className="flex items-center justify-between gap-2.5 pt-1">
                        <input
                          type="text"
                          value={sec.title}
                          maxLength={80}
                          onChange={(e) =>
                            handleUpdateStepSectionTitle(
                              secIdx,
                              e.target.value.slice(0, 80)
                            )
                          }
                          placeholder={`Section ${secIdx + 1} heading (e.g. For the Sauce)`}
                          className="flex-1 rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 px-4 py-2 text-xs sm:text-sm text-foreground font-semibold placeholder:text-neutral-400 placeholder:font-normal focus:outline-none focus:border-foreground/70 transition-colors shadow-2xs"
                        />
                        {stepSections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirm(
                                "Remove Step Section?",
                                `Are you sure you want to remove the section "${sec.title || `Section ${secIdx + 1}`}" and its steps?`,
                                () => handleRemoveStepSection(secIdx),
                                "Remove Section"
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer transition-all active:scale-95 select-none shrink-0"
                          >
                            <Trash2 className="size-3 text-red-500 dark:text-red-400" />
                            <span>Remove Section</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Step Cards inside this section */}
                    <div className="space-y-4">
                      {sec.steps.map((st, sIdx) => (
                        <div
                          key={st.id}
                          className="rounded-2xl sm:rounded-3xl border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/40 p-4 sm:p-5 relative space-y-3 shadow-2xs"
                        >
                          {/* Header: Step Number & Delete Step Action */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="size-7 rounded-full bg-[#1A1A1A] dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs sm:text-sm select-none shadow-2xs">
                                {st.stepNumber}
                              </span>
                              <span className="font-semibold text-foreground text-sm sm:text-base">
                                Step {st.stepNumber}
                              </span>
                            </div>

                            {/* Delete Step with CONFIRMATION PROMPT */}
                            <button
                              type="button"
                              onClick={() => {
                                requestConfirm(
                                  `Delete Step ${st.stepNumber}?`,
                                  `Are you sure you want to delete Step ${st.stepNumber}${st.title ? ` ("${st.title}")` : ""}? Any text and photos for this step will be deleted.`,
                                  () => handleRemoveStep(secIdx, sIdx),
                                  "Delete Step"
                                );
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer transition-all active:scale-95 select-none"
                            >
                              <Trash2 className="size-3 text-red-500 dark:text-red-400" />
                              <span>Delete Step</span>
                            </button>
                          </div>

                          {/* Step Title Input with 80 character limit */}
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={st.title}
                              maxLength={80}
                              onChange={(e) =>
                                handleUpdateStep(
                                  secIdx,
                                  sIdx,
                                  "title",
                                  e.target.value.slice(0, 80)
                                )
                              }
                              placeholder="Step headline (e.g. Cook the pasta)"
                              className="w-full rounded-xl sm:rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800/80 px-4 py-2.5 sm:py-3 text-sm sm:text-base text-foreground placeholder:text-neutral-400 focus:outline-none focus:border-foreground/70 transition-colors font-medium shadow-2xs"
                            />
                            <div className="text-right text-xs text-neutral-400 font-normal pr-1">
                              {st.title.length} / 80 Character
                            </div>
                          </div>

                          {/* Step Description Textarea */}
                          <textarea
                            value={st.description}
                            onChange={(e) =>
                              handleUpdateStep(
                                secIdx,
                                sIdx,
                                "description",
                                e.target.value.slice(0, 1000)
                              )
                            }
                            maxLength={1000}
                            rows={7}
                            placeholder="Describe the cooking actions for this step in detail..."
                            className="w-full rounded-xl sm:rounded-2xl border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4 text-sm sm:text-base text-foreground placeholder:text-neutral-400 focus:outline-none focus:border-foreground/70 resize-none min-h-[160px] sm:min-h-[175px] leading-relaxed transition-colors shadow-2xs"
                          />

                          {/* Character Counter */}
                          <div className="text-right text-xs text-neutral-400 font-normal">
                            {st.description.length} / 1000 Character
                          </div>

                          {/* Optional Attached Photo Preview */}
                          {Boolean(st.image && st.image.trim()) && st.image && (
                            <div className="relative w-24 aspect-4/3 rounded-xl overflow-hidden border border-[#D5D0C5] dark:border-neutral-700">
                              <Image
                                src={st.image}
                                alt={`Step ${st.stepNumber}`}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  requestConfirm(
                                    "Remove step photo?",
                                    `Are you sure you want to remove the photo from Step ${st.stepNumber}?`,
                                    () => handleUpdateStep(secIdx, sIdx, "image", ""),
                                    "Remove Photo"
                                  );
                                }}
                                className="absolute top-1.5 right-1.5 size-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer active:scale-95"
                                title="Remove step photo"
                              >
                                <X className="size-3 stroke-[2.5]" />
                              </button>
                            </div>
                          )}

                          {/* Optional Timer Input Inline */}
                          {st.showTimerInput && (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-200/40 dark:bg-neutral-800/50">
                              <Clock className="size-4 text-foreground shrink-0" />
                              <span className="text-xs text-foreground font-medium">
                                Timer:
                              </span>
                              <input
                                type="number"
                                min="1"
                                max="240"
                                value={st.timerMinutes || 5}
                                onChange={(e) =>
                                  handleUpdateStep(
                                    secIdx,
                                    sIdx,
                                    "timerMinutes",
                                    parseInt(e.target.value) || 5
                                  )
                                }
                                className="w-16 rounded-lg border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-foreground text-center focus:outline-none"
                              />
                              <span className="text-xs text-neutral-500">minutes</span>
                            </div>
                          )}

                          {/* Optional Tip Input Inline */}
                          {st.showTipInput && (
                            <div className="p-2 rounded-xl bg-neutral-200/40 dark:bg-neutral-800/50 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                <Lightbulb className="size-3.5 text-amber-500 shrink-0" />
                                <span>Chef Tip:</span>
                              </div>
                              <input
                                type="text"
                                value={st.tip || ""}
                                onChange={(e) =>
                                  handleUpdateStep(secIdx, sIdx, "tip", e.target.value)
                                }
                                placeholder="Helpful technique or variation..."
                                className="w-full rounded-lg border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-foreground placeholder:text-neutral-400 focus:outline-none"
                              />
                            </div>
                          )}

                          {/* 3 Step Action Icon Buttons matching mockup: Image, Timer, Tip */}
                          <div className="flex items-center gap-2.5 pt-1">
                            {/* Image Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepUploadId(st.id);
                                stepImageInputRef.current?.click();
                              }}
                              className="size-9 rounded-xl border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-[#EBE7DC] dark:hover:bg-neutral-700 flex items-center justify-center text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Add photo for this step"
                            >
                              <ImageIcon className="size-4" />
                            </button>

                            {/* Timer Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStep(
                                  secIdx,
                                  sIdx,
                                  "showTimerInput",
                                  !st.showTimerInput
                                )
                              }
                              className={`size-9 rounded-xl border border-[#D5D0C5] dark:border-neutral-700 flex items-center justify-center text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 ${st.showTimerInput
                                ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-black"
                                : "bg-white dark:bg-neutral-800 hover:bg-[#EBE7DC] dark:hover:bg-neutral-700"
                                }`}
                              title="Set step timer"
                            >
                              <Clock className="size-4" />
                            </button>

                            {/* Tip Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStep(
                                  secIdx,
                                  sIdx,
                                  "showTipInput",
                                  !st.showTipInput
                                )
                              }
                              className={`size-9 rounded-xl border border-[#D5D0C5] dark:border-neutral-700 flex items-center justify-center text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 ${st.showTipInput
                                ? "bg-amber-500 text-white"
                                : "bg-white dark:bg-neutral-800 hover:bg-[#EBE7DC] dark:hover:bg-neutral-700"
                                }`}
                              title="Add chef tip"
                            >
                              <Lightbulb className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Button to add step to this specific section if multiple sections exist */}
                    {stepSections.length > 1 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddStep(secIdx)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-foreground py-1 px-3.5 rounded-full border border-dashed border-[#D5D0C5] dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 transition-all cursor-pointer select-none"
                        >
                          <Plus className="size-3" />
                          <span>Add Step to this section</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Buttons below Step Card: Section + and Add Step + */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddStepSection}
                  className="rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 hover:bg-[#EBE7DC] dark:hover:bg-neutral-800 px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 select-none flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Section +</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStep(stepSections.length - 1)}
                  className="rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900/60 hover:bg-[#EBE7DC] dark:hover:bg-neutral-800 px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 select-none flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Add Step +</span>
                </button>
              </div>

              {/* Mobile Step 3 Back to Ingredients Button */}
              <div className="flex lg:hidden pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileWizardStep(2);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground py-2.5 px-4 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all shadow-2xs"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Ingredients</span>
                </button>
              </div>
            </div>

            {/* 7. Bottom Save Changes and Cancel Buttons (Mobile Step 3 & Desktop) */}
            <div
              className={`order-7 lg:order-0 w-full relative pt-5 sm:pt-7 ${mobileWizardStep === 3 ? "block" : "hidden lg:block"
                }`}
            >
              {/* Spark doodle rays above Save Changes button */}
              <SparkDoodle />

              {/* Action Buttons: Save as Draft and Publish Recipe */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {/* Save as Draft Button */}
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 rounded-full border border-[#B8B0A2] dark:border-neutral-700 bg-[#FAF9F5] dark:bg-neutral-900 hover:bg-[#EBE7DC] dark:hover:bg-neutral-800 text-foreground py-3.5 sm:py-4 px-6 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 transition-all disabled:opacity-50 select-none"
                >
                  <Clock className="size-4 text-neutral-500 dark:text-neutral-400" />
                  <span>{isSubmitting ? "..." : t("recipeEdit.saveDraftButton")}</span>
                </button>

                {/* Publish Recipe Button */}
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 rounded-full bg-[#1E1E1E] hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black py-3.5 sm:py-4 px-6 font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer shadow-md active:scale-98 transition-all disabled:opacity-50 select-none"
                >
                  <Save className="size-4.5" />
                  <span>{isSubmitting ? "..." : t("recipeEdit.publishButton")}</span>
                </button>
              </div>

              {/* Delete Recipe Button (Destructive with confirmation) */}
              {!isNewRecipe && (
                <button
                  type="button"
                  onClick={handleDeleteRecipe}
                  disabled={isSubmitting}
                  className="w-full rounded-full border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 py-3 px-6 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all mt-3 select-none disabled:opacity-50"
                >
                  <Trash2 className="size-4 stroke-[2]" />
                  <span>{t("recipeEdit.deleteRecipe")}</span>
                </button>
              )}

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => router.push(l("/profile?tab=recipes"))}
                className="w-full rounded-full border border-transparent hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 py-3 px-6 font-medium text-xs sm:text-sm flex items-center justify-center cursor-pointer active:scale-98 transition-all mt-2 select-none"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>


        {/* Custom Confirmation Modal for Delete/Clear Destructive Actions */}
        {confirmDialog?.isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setConfirmDialog(null)}
          >
            <div
              className="w-full max-w-sm sm:max-w-md rounded-3xl border border-[#D5D0C5] dark:border-neutral-800 bg-[#FAF9F5] dark:bg-[#1A1A1A] p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Icon + Title */}
              <div className="flex items-start gap-3.5">
                <div className="size-11 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              {/* Actions: Cancel and Confirm */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-[#D5D0C5] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground hover:bg-[#EAE5D9]/60 dark:hover:bg-neutral-700 transition-all cursor-pointer select-none active:scale-95"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    action();
                  }}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5 stroke-[2.2]" />
                  <span>{confirmDialog.confirmText || t("recipeEdit.deleteRecipe")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
