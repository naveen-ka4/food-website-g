/**
 * Comprehensive Zod validation schemas for Hey Garlic
 * All user inputs must pass through these schemas for security
 */

import { z } from "zod";

// ==============================================================================
// COMMON VALIDATORS & SANITIZERS
// ==============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png", "image/jpg"];

export const sanitizeText = (val: string): string =>
  val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();

// Base string with trimming
const sanitizedString = z.string().trim();

// Safe username: alphanumeric, underscores, hyphens, 2-30 chars
const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(30, "Username cannot exceed 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens");

// Safe email validation
const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

// Strong password: min 6 chars, at least one letter and one number
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password is too long")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// URL validation (optional)
const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .max(2048, "URL is too long")
  .optional()
  .or(z.literal(""));

// ==============================================================================
// AUTHENTICATION SCHEMAS
// ==============================================================================

export const signUpSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    location: sanitizedString.max(100, "Location is too long").optional(),
    termsAccepted: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ==============================================================================
// PROFILE SCHEMAS
// ==============================================================================

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  full_name: sanitizedString.min(1).max(100, "Name is too long").optional(),
  bio: sanitizedString.max(500, "Bio cannot exceed 500 characters").optional(),
  tagline: sanitizedString.max(100, "Tagline cannot exceed 100 characters").optional(),
  status: sanitizedString.max(50, "Status cannot exceed 50 characters").optional(),
  location: sanitizedString.max(100, "Location is too long").optional(),
  avatar_url: urlSchema,
  interests: z.array(sanitizedString.max(50)).max(10, "Maximum 10 interests allowed").optional(),
  socialLinks: z
    .object({
      website: urlSchema,
      instagram: sanitizedString.max(100).optional(),
      facebook: sanitizedString.max(100).optional(),
      youtube: sanitizedString.max(100).optional(),
      twitter: sanitizedString.max(100).optional(),
    })
    .optional(),
});

// ==============================================================================
// RECIPE SCHEMAS
// ==============================================================================

const ingredientSchema = z.object({
  id: z.string().optional(),
  name: sanitizedString.min(1, "Ingredient name is required").max(200),
  amount: sanitizedString.max(50).optional(),
  unit: sanitizedString.max(20).optional(),
  notes: sanitizedString.max(200).optional(),
});

const instructionStepSchema = z.object({
  id: z.string().optional(),
  step: z.number().int().min(1).max(100),
  instruction: sanitizedString.min(1, "Instruction text is required").max(1000),
  timing: z.number().int().min(0).max(7200).optional(), // max 2 hours per step
  image: urlSchema.optional(),
});

export const createRecipeSchema = z.object({
  title: sanitizedString
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: sanitizedString.max(1000, "Description cannot exceed 1000 characters").optional(),
  hero_image: urlSchema,
  category: sanitizedString.min(1, "Category is required").max(50),
  meal_type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]),
  cuisine: sanitizedString.max(50).optional(),
  dietary_tag: sanitizedString.max(50).optional(),
  tag: sanitizedString.max(50).optional(),
  tags: z.array(sanitizedString.max(50)).max(20, "Maximum 20 tags allowed").optional(),
  tip: sanitizedString.max(500).optional(),
  cook_time: z.number().int().min(1, "Cooking time must be at least 1 minute").max(1440), // max 24 hours
  prep_time: z.number().int().min(0).max(1440).optional(),
  default_servings: z.number().int().min(1).max(100),
  ingredients: z
    .array(ingredientSchema)
    .min(1, "At least one ingredient is required")
    .max(100, "Maximum 100 ingredients allowed"),
  instructions: z
    .array(instructionStepSchema)
    .min(1, "At least one instruction step is required")
    .max(50, "Maximum 50 steps allowed"),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  is_published: z.boolean().default(false),
});

export const updateRecipeSchema = createRecipeSchema.partial().extend({
  id: z.string().uuid("Invalid recipe ID"),
});

// ==============================================================================
// REVIEW & COMMENT SCHEMAS
// ==============================================================================

export const createReviewSchema = z.object({
  recipe_id: z.string().uuid("Invalid recipe ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: sanitizedString
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review cannot exceed 2000 characters")
    .optional(),
});

export const createReplySchema = z.object({
  review_id: z.string().uuid("Invalid review ID"),
  recipe_id: z.string().uuid("Invalid recipe ID"),
  comment: sanitizedString
    .min(1, "Reply cannot be empty")
    .max(1000, "Reply cannot exceed 1000 characters"),
});

// ==============================================================================
// SEARCH & FILTER SCHEMAS
// ==============================================================================

export const searchQuerySchema = z.object({
  q: sanitizedString.max(200, "Search query is too long").optional(),
  category: sanitizedString.max(50).optional(),
  cuisine: sanitizedString.max(50).optional(),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]).optional(),
  dietary: z.array(sanitizedString.max(50)).max(10).optional(),
  cookTime: z.enum(["under-15", "15-30", "30-60", "60-plus"]).optional(),
  difficulty: z.enum(["Easy", "Medium", "Advanced"]).optional(),
  rating: z.number().min(1).max(5).optional(),
  sortBy: z.enum(["popular", "rating", "time", "newest"]).default("popular"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ==============================================================================
// FILE UPLOAD SCHEMAS
// ==============================================================================

export const imageUploadSchema = z.object({
  file: z.any()
    .refine((file) => file?.size <= MAX_FILE_SIZE, "File size must be less than 5MB")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only WebP, JPEG, and PNG images are allowed"
    ),
  type: z.enum(["recipe", "avatar", "step"]).default("recipe"),
});

// ==============================================================================
// SOCIAL SCHEMAS
// ==============================================================================

export const followUserSchema = z.object({
  following_id: z.string().uuid("Invalid user ID"),
});

export const createBoardSchema = z.object({
  name: sanitizedString.min(1, "Board name is required").max(100, "Board name is too long"),
  description: sanitizedString.max(500, "Description is too long").optional(),
  recipe_ids: z.array(z.string().uuid()).max(500, "Maximum 500 recipes per board").optional(),
});

export const updateBoardSchema = createBoardSchema.partial().extend({
  id: z.string().uuid("Invalid board ID"),
});

// ==============================================================================
// TYPE EXPORTS
// ==============================================================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type FollowUserInput = z.infer<typeof followUserSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

// ==============================================================================
// VALIDATION HELPERS
// ==============================================================================

/**
 * Validates data against a Zod schema and returns typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 */
export function validateData<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  const issues = (result.error as any).issues || (result.error as any).errors || [];
  issues.forEach((error: any) => {
    const path = error.path.join(".");
    errors[path] = error.message;
  });

  return { success: false, errors };
}

/**
 * Simple validation that throws on error
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws Error with validation message
 */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

// ==============================================================================
// SEARCH & DISCOVERY SCHEMAS
// ==============================================================================

export const searchRecipesSchema = z.object({
  query: z.string().max(200, "Search query too long").optional(),
  categories: z.array(z.string().max(50)).max(10).optional(),
  cuisines: z.array(z.string().max(50)).max(10).optional(),
  mealTypes: z.array(z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"])).max(5).optional(),
  dietary: z.array(z.string().max(50)).max(10).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxCookTime: z.number().min(0).max(999).optional(),
  difficulty: z.enum(["Easy", "Medium", "Advanced"]).optional(),
  includeIngredients: z.string().max(500).optional(),
  excludeIngredients: z.string().max(500).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const autocompleteSchema = z.object({
  query: sanitizedString.min(1, "Query is required").max(100, "Query too long"),
  limit: z.number().min(1).max(20).default(10),
});

export const savedSearchSchema = z.object({
  filterName: sanitizedString
    .min(1, "Filter name is required")
    .max(100, "Filter name is too long"),
  searchQuery: sanitizedString.max(200).optional(),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    cuisines: z.array(z.string()).optional(),
    mealTypes: z.array(z.string()).optional(),
    dietary: z.array(z.string()).optional(),
    cookingTime: z.string().optional(),
    difficulty: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    includeIngredients: z.string().optional(),
    excludeIngredients: z.string().optional(),
  }),
  isNotificationEnabled: z.boolean().default(false),
});

export const recordSearchSchema = z.object({
  query: sanitizedString.max(200).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  resultsCount: z.number().min(0).default(0),
  sessionId: z.string().optional(),
  clickedRecipeId: z.string().uuid().optional(),
});
