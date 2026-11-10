/**
 * Central Taxonomy & Single Source of Truth for Hey Garlic Categories & Facets
 * Used across Home (featured 24), Search faceted filters, Recipe Creation, and Edit forms.
 */

export type CategoryGroupType =
  | "dish_type"
  | "meal_type"
  | "cuisine"
  | "dietary"
  | "cooking_method";

export interface RecipeCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  group_type: CategoryGroupType;
  is_featured: boolean;
  sort_order: number;
  badge?: string;
  description?: string;
}

export interface CategoryGroupMeta {
  type: CategoryGroupType;
  label: string;
  description: string;
}

export const CATEGORY_GROUPS: CategoryGroupMeta[] = [
  {
    type: "meal_type",
    label: "Meal Type",
    description: "Breakfast, Lunch, Dinner, Snacks & Drinks",
  },
  {
    type: "dish_type",
    label: "Dish Type",
    description: "Curries, Pasta, Pizza, Soups, Bowls & more",
  },
  {
    type: "cuisine",
    label: "Cuisine",
    description: "Sri Lankan, Italian, Asian, Mexican & Global traditions",
  },
  {
    type: "dietary",
    label: "Dietary",
    description: "Vegetarian, Vegan, Gluten-Free, Keto & Health choices",
  },
  {
    type: "cooking_method",
    label: "Cooking Method",
    description: "Baking, Grilling, Air Fryer & Quick prep",
  },
];

export const CATEGORIES: RecipeCategory[] = [
  // ---------------------------------------------------------------------------
  // Top 24 Curated Categories (Displayed with Icons on the Home Page Grid)
  // ---------------------------------------------------------------------------
  {
    id: "curries",
    name: "Curries",
    slug: "curries",
    image: "/category/curries.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 1,
  },
  {
    id: "pasta-noodles",
    name: "Pasta & Noodles",
    slug: "pasta-noodles",
    image: "/category/pasta-noodles.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 2,
  },
  {
    id: "rice-dishes",
    name: "Rice Dishes",
    slug: "rice-dishes",
    image: "/category/rice-dishes.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 3,
  },
  {
    id: "breakfast",
    name: "Breakfast",
    slug: "breakfast",
    image: "/category/breakfast.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 4,
  },
  {
    id: "lunch",
    name: "Lunch",
    slug: "lunch",
    image: "/category/lunch.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 5,
  },
  {
    id: "dinner",
    name: "Dinner",
    slug: "dinner",
    image: "/category/dinner.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 6,
  },
  {
    id: "dessert",
    name: "Dessert",
    slug: "dessert",
    image: "/category/dessert.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 7,
  },
  {
    id: "snack",
    name: "Snack",
    slug: "snack",
    image: "/category/snack.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 8,
  },
  {
    id: "drink",
    name: "Drink",
    slug: "drink",
    image: "/category/drink.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 9,
  },
  {
    id: "baking",
    name: "Baking",
    slug: "baking",
    image: "/category/baking.webp",
    group_type: "cooking_method",
    is_featured: true,
    sort_order: 10,
  },
  {
    id: "seafood",
    name: "Seafood",
    slug: "seafood",
    image: "/category/seafood.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 11,
  },
  {
    id: "soups-stews",
    name: "Soups & Stews",
    slug: "soups-stews",
    image: "/category/soups-stews.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 12,
  },
  {
    id: "fresh-salads",
    name: "Fresh Salads",
    slug: "fresh-salads",
    image: "/category/fresh-salads.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 13,
  },
  {
    id: "vegetarian",
    name: "Vegetarian",
    slug: "vegetarian",
    image: "/category/vegetarian.webp",
    group_type: "dietary",
    is_featured: true,
    sort_order: 14,
  },
  {
    id: "sauces-dips",
    name: "Sauces & Dips",
    slug: "sauces-dips",
    image: "/category/sauces-dips.webp",
    group_type: "cooking_method",
    is_featured: true,
    sort_order: 15,
  },
  {
    id: "grill-bbq",
    name: "Grill & BBQ",
    slug: "grill-bbq",
    image: "/category/grill-bbq.webp",
    group_type: "cooking_method",
    is_featured: true,
    sort_order: 16,
  },
  {
    id: "burgers-sandwiches",
    name: "Burgers & Sandwiches",
    slug: "burgers-sandwiches",
    image: "/category/burgers-sandwiches.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 17,
  },
  {
    id: "pizza",
    name: "Pizza",
    slug: "pizza",
    image: "/category/pizza.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 18,
  },
  {
    id: "street-food",
    name: "Street Food",
    slug: "street-food",
    image: "/category/street-food.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 19,
  },
  {
    id: "smoothies-shakes",
    name: "Smoothies & Shakes",
    slug: "smoothies-shakes",
    image: "/category/smoothies-shakes.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 20,
  },
  {
    id: "ice-cream-frozen",
    name: "Ice Cream & Frozen",
    slug: "ice-cream-frozen",
    image: "/category/ice-cream-frozen.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 21,
  },
  {
    id: "egg-dishes",
    name: "Egg Dishes",
    slug: "egg-dishes",
    image: "/category/egg-dishes.webp",
    group_type: "dish_type",
    is_featured: true,
    sort_order: 22,
  },
  {
    id: "appetizers",
    name: "Appetizers",
    slug: "appetizers",
    image: "/category/appetizers.webp",
    group_type: "meal_type",
    is_featured: true,
    sort_order: 23,
  },
  {
    id: "healthy-bowls",
    name: "Healthy Bowls",
    slug: "healthy-bowls",
    image: "/category/healthy-bowls.webp",
    group_type: "dietary",
    is_featured: true,
    sort_order: 24,
  },

  // ---------------------------------------------------------------------------
  // Additional Global Cuisines (In Search Filters & Recipe Creation)
  // ---------------------------------------------------------------------------
  {
    id: "sri-lankan",
    name: "Sri Lankan",
    slug: "sri-lankan",
    image: "/category/curries.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 100,
  },
  {
    id: "italian",
    name: "Italian",
    slug: "italian",
    image: "/category/pasta-noodles.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 101,
  },
  {
    id: "asian",
    name: "Asian",
    slug: "asian",
    image: "/category/rice-dishes.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 102,
  },
  {
    id: "indian",
    name: "Indian",
    slug: "indian",
    image: "/category/curries.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 103,
  },
  {
    id: "mexican",
    name: "Mexican",
    slug: "mexican",
    image: "/category/street-food.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 104,
  },
  {
    id: "american",
    name: "American",
    slug: "american",
    image: "/category/burgers-sandwiches.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 105,
  },
  {
    id: "japanese",
    name: "Japanese",
    slug: "japanese",
    image: "/category/rice-dishes.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 106,
  },
  {
    id: "thai",
    name: "Thai",
    slug: "thai",
    image: "/category/rice-dishes.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 107,
  },
  {
    id: "mediterranean",
    name: "Mediterranean",
    slug: "mediterranean",
    image: "/category/fresh-salads.webp",
    group_type: "cuisine",
    is_featured: false,
    sort_order: 108,
  },

  // ---------------------------------------------------------------------------
  // Additional Dietary Options
  // ---------------------------------------------------------------------------
  {
    id: "vegan",
    name: "Vegan",
    slug: "vegan",
    image: "/category/fresh-salads.webp",
    group_type: "dietary",
    is_featured: false,
    sort_order: 200,
  },
  {
    id: "gluten-free",
    name: "Gluten-Free",
    slug: "gluten-free",
    image: "/category/healthy-bowls.webp",
    group_type: "dietary",
    is_featured: false,
    sort_order: 201,
  },
  {
    id: "keto",
    name: "Keto",
    slug: "keto",
    image: "/category/grill-bbq.webp",
    group_type: "dietary",
    is_featured: false,
    sort_order: 202,
  },
  {
    id: "halal",
    name: "Halal",
    slug: "halal",
    image: "/category/curries.webp",
    group_type: "dietary",
    is_featured: false,
    sort_order: 203,
  },

  // ---------------------------------------------------------------------------
  // Additional Cooking Methods & Prep Styles
  // ---------------------------------------------------------------------------
  {
    id: "quick-easy",
    name: "Quick & Easy",
    slug: "quick-easy",
    image: "/category/breakfast.webp",
    group_type: "cooking_method",
    is_featured: false,
    sort_order: 300,
  },
  {
    id: "air-fryer",
    name: "Air Fryer",
    slug: "air-fryer",
    image: "/category/grill-bbq.webp",
    group_type: "cooking_method",
    is_featured: false,
    sort_order: 301,
  },
  {
    id: "meal-prep",
    name: "Meal Prep",
    slug: "meal-prep",
    image: "/category/healthy-bowls.webp",
    group_type: "cooking_method",
    is_featured: false,
    sort_order: 302,
  },
  {
    id: "slow-cooker",
    name: "Slow Cooker",
    slug: "slow-cooker",
    image: "/category/soups-stews.webp",
    group_type: "cooking_method",
    is_featured: false,
    sort_order: 303,
  },
];

/**
 * Clean list of all official category names for form selects
 */
export const CATEGORY_NAMES: string[] = CATEGORIES.map((cat) => cat.name);

/**
 * The 24 Featured Categories for the Home Page
 */
export function getFeaturedCategories(): RecipeCategory[] {
  return CATEGORIES.filter((c) => c.is_featured).sort(
    (a, b) => a.sort_order - b.sort_order
  );
}

/**
 * Filter categories by taxonomy group type
 */
export function getCategoriesByGroup(
  group: CategoryGroupType
): RecipeCategory[] {
  return CATEGORIES.filter((c) => c.group_type === group);
}

/**
 * Grouped dictionary for faceted drawers and selectors
 */
export function getGroupedCategories(): Record<
  CategoryGroupType,
  RecipeCategory[]
> {
  return {
    meal_type: getCategoriesByGroup("meal_type"),
    dish_type: getCategoriesByGroup("dish_type"),
    cuisine: getCategoriesByGroup("cuisine"),
    dietary: getCategoriesByGroup("dietary"),
    cooking_method: getCategoriesByGroup("cooking_method"),
  };
}

/**
 * Lookup a category object by slug (case-insensitive)
 */
export function getCategoryBySlug(slug: string): RecipeCategory | undefined {
  if (!slug) return undefined;
  const clean = slug.trim().toLowerCase();
  return CATEGORIES.find((c) => c.slug.toLowerCase() === clean);
}

/**
 * Lookup a category object by name or slug (case-insensitive)
 */
export function getCategoryByName(
  nameOrSlug: string
): RecipeCategory | undefined {
  if (!nameOrSlug) return undefined;
  const clean = nameOrSlug.trim().toLowerCase();
  return CATEGORIES.find(
    (c) => c.name.toLowerCase() === clean || c.slug.toLowerCase() === clean
  );
}

/**
 * Returns a fallback category image for a given category name or slug
 */
export function getCategoryDefaultImage(categoryNameOrSlug?: string): string {
  if (!categoryNameOrSlug) return "/category/curries.webp";
  const found = getCategoryByName(categoryNameOrSlug);
  return found?.image || "/category/curries.webp";
}
