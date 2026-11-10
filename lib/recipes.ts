export interface Ingredient {
  name: string;
  baseAmount: number; // base quantity for defaultServings (e.g. 200)
  unit: string; // "g", "cloves", "tbsp", "cup", etc.
  icon: string; // emoji or icon tag
  notes?: string;
  group?: string; // Optional section / group title (e.g. "For the Pasta", "For the Sauce")
}

export interface InstructionStep {
  stepNumber: number;
  title: string;
  description: string;
  image: string;
  sectionTitle?: string;
}

export interface DetailedRecipe {
  id: string;
  title: string;
  heroImage: string;
  tag: string; // e.g. "Quick & Easy"
  dietaryTag?: string; // e.g. "Vegetarian"
  description: string;
  cookTime: number; // in minutes
  prepTime?: number; // in minutes
  rating: number;
  reviewsCount: number;
  defaultServings: number;
  category: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  author: {
    name: string;
    handle: string;
  };
  tip: string;
  tags?: string[];
  isPublished?: boolean;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const DETAILED_RECIPES: Record<string, DetailedRecipe> = {
  "creamy-garlic-parmesan-pasta": {
    id: "creamy-garlic-parmesan-pasta",
    title: "Creamy Garlic Parmesan Pasta",
    heroImage: "/recipes/creamy-pasta-hero.jpg",
    tag: "Quick & Easy",
    dietaryTag: "Vegetarian",
    description:
      "A rich and creamy pasta dish with the perfect balance of garlic and parmesan. Simple ingredients, big flavor — ready in just 20 minutes!",
    cookTime: 20,
    prepTime: 5,
    rating: 4.9,
    reviewsCount: 124,
    defaultServings: 2,
    category: "Pasta",
    mealType: "Dinner",
    author: {
      name: "Hey Garlic Kitchen",
      handle: "@heygarlic",
    },
    tip: "For a richer flavor, use freshly grated parmesan and don't skip the parsley — it adds a beautiful freshness!",
    tags: ["Quick & Easy", "Vegetarian", "Pasta"],
    isPublished: true,
    ingredients: [
      {
        name: "Pasta (fettuccine or spaghetti)",
        baseAmount: 200,
        unit: "g",
        icon: "🍝",
        group: "For the Pasta",
      },
      {
        name: "Garlic (minced)",
        baseAmount: 4,
        unit: "cloves",
        icon: "🧄",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Unsalted butter",
        baseAmount: 2,
        unit: "tbsp",
        icon: "🧈",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Cooking cream",
        baseAmount: 1,
        unit: "cup (240 ml)",
        icon: "🥣",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Parmesan cheese (grated)",
        baseAmount: 0.5,
        unit: "cup",
        icon: "🧀",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Salt",
        baseAmount: 0,
        unit: "to taste",
        icon: "🧂",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Black pepper",
        baseAmount: 0,
        unit: "to taste",
        icon: "🫙",
        group: "For the Creamy Garlic Sauce",
      },
      {
        name: "Fresh parsley (chopped)",
        baseAmount: 2,
        unit: "tbsp",
        icon: "🌿",
        group: "For the Creamy Garlic Sauce",
      },
    ],
    instructions: [
      {
        stepNumber: 1,
        title: "Cook the pasta",
        description:
          "Bring a large pot of salted water to a boil. Cook the pasta according to package instructions until al dente. Drain and set aside.",
        image: "/recipes/pasta-step-1.jpg",
      },
      {
        stepNumber: 2,
        title: "Sauté the garlic",
        description:
          "In a large skillet, melt the butter over medium heat. Add minced garlic and cook for 1–2 minutes until fragrant (don't let it brown).",
        image: "/recipes/pasta-step-2.jpg",
      },
      {
        stepNumber: 3,
        title: "Add cream and cheese",
        description:
          "Pour in the cooking cream and bring to a gentle simmer. Stir in the parmesan cheese, salt and pepper. Cook for 3–4 minutes until the sauce thickens slightly.",
        image: "/recipes/pasta-step-3.jpg",
      },
      {
        stepNumber: 4,
        title: "Combine",
        description:
          "Add the cooked pasta to the sauce and toss well until every strand is coated.",
        image: "/recipes/pasta-step-4.jpg",
      },
      {
        stepNumber: 5,
        title: "Serve",
        description:
          "Top with fresh parsley and extra parmesan if desired. Serve warm and enjoy!",
        image: "/recipes/pasta-step-5.jpg",
      },
    ],
  },

  "one-pan-lemon-chicken": {
    id: "one-pan-lemon-chicken",
    title: "One-Pan Lemon Herb Chicken",
    heroImage: "/recipes/lemon-chicken.jpg",
    tag: "High Protein",
    dietaryTag: "Gluten-free",
    description:
      "Tender chicken cutlets seared in a bright, savory garlic and lemon butter pan sauce. Fast, healthy, and cleanup is a breeze!",
    cookTime: 35,
    prepTime: 10,
    rating: 4.8,
    reviewsCount: 98,
    defaultServings: 2,
    category: "Chicken",
    mealType: "Dinner",
    author: {
      name: "Chef Marco",
      handle: "@marcocooks",
    },
    tip: "Deglaze the skillet with a splash of chicken broth or lemon juice to release all the rich caramelized flavor from the pan bottom.",
    ingredients: [
      { name: "Chicken breasts (halved)", baseAmount: 2, unit: "pieces", icon: "🍗" },
      { name: "Fresh lemon juice & zest", baseAmount: 1, unit: "whole lemon", icon: "🍋" },
      { name: "Garlic cloves (crushed)", baseAmount: 3, unit: "cloves", icon: "🧄" },
      { name: "Extra virgin olive oil", baseAmount: 2, unit: "tbsp", icon: "🫒" },
      { name: "Fresh rosemary & thyme", baseAmount: 1, unit: "tbsp", icon: "🌿" },
      { name: "Sea salt & black pepper", baseAmount: 0, unit: "to taste", icon: "🧂" },
    ],
    instructions: [
      {
        stepNumber: 1,
        title: "Season the chicken",
        description:
          "Pat chicken dry with paper towels. Season both sides generously with salt, cracked pepper, and fresh herbs.",
        image: "/recipes/lemon-chicken.jpg",
      },
      {
        stepNumber: 2,
        title: "Sear until golden",
        description:
          "Heat olive oil in a heavy skillet over medium-high heat. Sear chicken for 5-6 minutes per side until beautifully browned.",
        image: "/recipes/pasta-step-2.jpg",
      },
      {
        stepNumber: 3,
        title: "Simmer in garlic lemon sauce",
        description:
          "Add crushed garlic, lemon slices, and juice. Reduce heat and simmer until the internal temperature reaches 165°F (74°C).",
        image: "/recipes/lemon-chicken.jpg",
      },
    ],
  },

  "roasted-tomato-soup": {
    id: "roasted-tomato-soup",
    title: "Roasted Garlic Tomato Soup",
    heroImage: "/recipes/tomato-soup.jpg",
    tag: "Comfort Food",
    dietaryTag: "Vegan",
    description:
      "Slow-roasted Roma tomatoes and sweet caramelized garlic blended into a soothing, silky soup with fresh sweet basil.",
    cookTime: 30,
    prepTime: 10,
    rating: 4.7,
    reviewsCount: 86,
    defaultServings: 2,
    category: "Vegetarian",
    mealType: "Lunch",
    author: {
      name: "Hey Garlic Kitchen",
      handle: "@heygarlic",
    },
    tip: "Roasting the garlic in their skins prevents them from burning and concentrates their natural sweet nutty flavor.",
    ingredients: [
      { name: "Ripe Roma tomatoes", baseAmount: 800, unit: "g", icon: "🍅" },
      { name: "Whole garlic head", baseAmount: 1, unit: "head", icon: "🧄" },
      { name: "Vegetable broth", baseAmount: 2, unit: "cups", icon: "🥣" },
      { name: "Fresh sweet basil leaves", baseAmount: 0.5, unit: "cup", icon: "🌿" },
      { name: "Olive oil", baseAmount: 2, unit: "tbsp", icon: "🫒" },
      { name: "Sea salt and cracked pepper", baseAmount: 0, unit: "to taste", icon: "🧂" },
    ],
    instructions: [
      {
        stepNumber: 1,
        title: "Roast the tomatoes and garlic",
        description:
          "Place halved tomatoes and the garlic head on a baking sheet. Drizzle with olive oil and roast at 400°F (200°C) for 25 minutes.",
        image: "/recipes/tomato-soup.jpg",
      },
      {
        stepNumber: 2,
        title: "Blend until smooth",
        description:
          "Squeeze roasted garlic cloves into a blender with the tomatoes and warm vegetable broth. Blend until velvety smooth.",
        image: "/recipes/tomato-soup.jpg",
      },
      {
        stepNumber: 3,
        title: "Garnish & serve",
        description:
          "Pour into bowls, swirl with a dash of olive oil or coconut cream, and top with torn fresh basil leaves.",
        image: "/recipes/tomato-soup.jpg",
      },
    ],
  },

  "spicy-garlic-noodles": {
    id: "spicy-garlic-noodles",
    title: "Spicy Garlic Sesame Noodles",
    heroImage: "/recipes/garlic-noodles.jpg",
    tag: "Quick & Easy",
    dietaryTag: "Vegan",
    description:
      "Chewy noodles smothered in a fiery chili garlic oil, toasted sesame seeds, dark soy sauce, and crispy scallions.",
    cookTime: 15,
    prepTime: 5,
    rating: 4.9,
    reviewsCount: 210,
    defaultServings: 2,
    category: "Pasta",
    mealType: "Dinner",
    author: {
      name: "Suki Lin",
      handle: "@sukicooks",
    },
    tip: "Pour hot sizzling oil directly over the minced garlic and chili flakes to unleash maximum aroma instantly.",
    ingredients: [
      { name: "Wheat or ramen noodles", baseAmount: 200, unit: "g", icon: "🍜" },
      { name: "Garlic (finely minced)", baseAmount: 5, unit: "cloves", icon: "🧄" },
      { name: "Chili oil & flakes", baseAmount: 2, unit: "tbsp", icon: "🌶️" },
      { name: "Soy sauce & dark soy", baseAmount: 2, unit: "tbsp", icon: "🥢" },
      { name: "Toasted sesame oil & seeds", baseAmount: 1, unit: "tbsp", icon: "🌱" },
      { name: "Fresh green scallions", baseAmount: 2, unit: "stalks", icon: "🥬" },
    ],
    instructions: [
      {
        stepNumber: 1,
        title: "Boil noodles",
        description:
          "Cook noodles in boiling water until bouncy and chewy (about 4 minutes). Drain and rinse briefly with cold water.",
        image: "/recipes/pasta-step-1.jpg",
      },
      {
        stepNumber: 2,
        title: "Prepare hot chili oil base",
        description:
          "In a heatproof bowl, combine minced garlic, chili flakes, and scallions. Pour sizzling hot sesame oil over top.",
        image: "/recipes/pasta-step-2.jpg",
      },
      {
        stepNumber: 3,
        title: "Toss and enjoy",
        description:
          "Whisk in soy sauce, toss with noodles until well coated, and garnish with sesame seeds.",
        image: "/recipes/garlic-noodles.jpg",
      },
    ],
  },
};

import { FALLBACK_RECIPES } from "./sampleRecipes";

export function getRecipeById(id?: string | null): DetailedRecipe | null {
  if (!id) return null;
  if (DETAILED_RECIPES[id]) {
    return DETAILED_RECIPES[id];
  }
  return null;
}

export function getFallbackRecipeById(id?: string | null): DetailedRecipe | null {
  if (!id) return null;
  const sample = FALLBACK_RECIPES.find((r) => r.slug === id || r.id === id);
  if (!sample) return null;

  return {
    id: sample.slug || sample.id,
    title: sample.title,
    heroImage: sample.image,
    tag: sample.tags?.[0] || "Quick & Easy",
    dietaryTag: sample.dietary?.[0],
    description: `A delicious homemade ${sample.title} prepared in just ${sample.cookTime} minutes. Simple ingredients, great flavor.`,
    cookTime: sample.cookTime,
    prepTime: 10,
    rating: sample.rating,
    reviewsCount: sample.reviewsCount || 10,
    defaultServings: 2,
    category: sample.category,
    mealType: sample.mealType,
    author: {
      name: sample.author?.name || "Hey Garlic Kitchen",
      handle: sample.author?.username ? `@${sample.author.username}` : "@heygarlic",
    },
    tip: "Serve freshly cooked for the best taste!",
    tags: sample.tags,
    isPublished: true,
    ingredients: sample.ingredients.map((ing) => ({
      name: ing,
      baseAmount: 1,
      unit: "portion",
      icon: "🥘",
    })),
    instructions: [
      {
        stepNumber: 1,
        title: "Prep Ingredients",
        description: `Gather and prepare the fresh ingredients: ${sample.ingredients.slice(0, 3).join(", ")}.`,
        image: sample.image,
      },
      {
        stepNumber: 2,
        title: "Cook & Simmer",
        description: `Cook and season carefully until golden, fragrant, and cooked through.`,
        image: "",
      },
      {
        stepNumber: 3,
        title: "Garnish & Serve",
        description: `Transfer to serving plates, garnish with fresh herbs, and enjoy warm!`,
        image: "",
      },
    ],
  };
}

export function getCustomRecipe(id: string): DetailedRecipe | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("heygarlic_custom_recipes");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed[id]) {
        return parsed[id];
      }
    }
  } catch {}
  return null;
}

export function saveCustomRecipe(recipe: DetailedRecipe): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("heygarlic_custom_recipes");
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[recipe.id] = recipe;
    localStorage.setItem("heygarlic_custom_recipes", JSON.stringify(parsed));
  } catch {}
}

