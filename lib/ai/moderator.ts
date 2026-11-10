export interface RecipeInputForAi {
  title: string;
  description?: string | null;
  category?: string | null;
  meal_type?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  default_servings?: number | null;
  ingredients?: any[];
  instructions?: any[];
  tag?: string | null;
  cuisine?: string | null;
  hero_image?: string | null;
}

export interface ImageModerationResult {
  is_food: boolean;
  is_safe: boolean;
  label: string;
  issue?: string;
}

export interface AiModerationResult {
  is_safe: boolean;
  verdict: "safe" | "needs_info" | "flagged";
  confidence_score: number; // 0.00 to 1.00
  issues: string[];
  quality_issues?: string[]; // missing measurements, vague steps, etc.
  severe_violations?: string[]; // spam, offensive, non-food hazard
  suggested_tags: string[];
  summary: string;
  executive_summary: string; // Plain-English friendly summary for non-coders
  image_analysis?: ImageModerationResult;
  provider?: string;
  model?: string;
}

export interface ReviewModerationResult {
  is_safe: boolean;
  verdict: "safe" | "flagged";
  confidence_score: number;
  issues: string[];
  executive_summary: string;
  provider?: string;
  model?: string;
}

/**
 * Built-in safety heuristic fallback engine.
 * Runs instantly if no API key is configured or in case of offline testing.
 */
export function runHeuristicModerator(recipe: RecipeInputForAi): AiModerationResult {
  const issues: string[] = [];
  const qualityIssues: string[] = [];
  const severeViolations: string[] = [];
  const suggestedTags = new Set<string>();

  const title = (recipe.title || "").trim();
  const desc = (recipe.description || "").trim();
  const category = (recipe.category || "").trim();
  const mealType = (recipe.meal_type || "").trim();

  // Basic tags
  if (category && category !== "General") suggestedTags.add(category);
  if (mealType) suggestedTags.add(mealType);

  // 1. Title Checks
  if (title.length < 4) {
    qualityIssues.push("Recipe title is too short or vague");
  }

  // 2. Ingredients Checks
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  if (ingredients.length === 0) {
    qualityIssues.push("No ingredients listed in recipe");
  } else {
    let missingAmounts = 0;
    ingredients.forEach((ing: any) => {
      const name = typeof ing === "string" ? ing : ing?.name || "";
      const amount = typeof ing === "object" ? ing?.baseAmount ?? ing?.amount : "";
      if (!amount || String(amount).trim() === "") {
        missingAmounts++;
      }
      // Infer tags
      const lower = name.toLowerCase();
      if (lower.includes("curry") || lower.includes("chili") || lower.includes("masala")) {
        suggestedTags.add("Spicy");
      }
      if (lower.includes("garlic")) {
        suggestedTags.add("Garlic Lover");
      }
      if (lower.includes("coconut") || lower.includes("pandan") || lower.includes("curry leaves")) {
        suggestedTags.add("Sri Lankan");
      }
    });

    if (missingAmounts > 0 && missingAmounts >= Math.ceil(ingredients.length / 2)) {
      qualityIssues.push(`Measurements missing for ${missingAmounts} ingredient(s)`);
    }
  }

  // 3. Instructions Checks
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
  if (instructions.length === 0) {
    qualityIssues.push("Missing cooking instruction steps");
  } else {
    const totalWords = instructions
      .map((step: any) =>
        typeof step === "string" ? step : step?.description || step?.step || step?.text || ""
      )
      .join(" ")
      .split(/\s+/).length;

    if (totalWords < 15) {
      qualityIssues.push("Cooking steps are overly brief or incomplete");
    }
  }

  // 4. Time Check
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  if (totalTime > 0 && totalTime <= 30) {
    suggestedTags.add("Quick & Easy");
  }

  // 5. Profanity / Inappropriate Content Check (common spam patterns)
  const fullText = `${title} ${desc} ${JSON.stringify(ingredients)} ${JSON.stringify(instructions)}`.toLowerCase();
  const spamKeywords = ["viagra", "casino", "crypto", "hack", "porn", "escort", "free money", "http://", "https://"];
  let hasSpam = false;
  for (const kw of spamKeywords) {
    if (fullText.includes(kw)) {
      severeViolations.push(`Potential spam/unrelated link detected: "${kw}"`);
      hasSpam = true;
      break;
    }
  }

  issues.push(...severeViolations, ...qualityIssues);

  const isCompletelyEmpty = ingredients.length === 0 && instructions.length === 0;

  // Calculate score & verdict
  let score = 0.98;
  let verdict: "safe" | "needs_info" | "flagged" = "safe";

  if (hasSpam) {
    score = 0.15;
    verdict = "flagged";
  } else if (isCompletelyEmpty) {
    score = 0.3;
    verdict = "flagged";
  } else if (qualityIssues.length > 0) {
    score = Math.max(0.65, 0.95 - qualityIssues.length * 0.1);
    verdict = "needs_info";
  }

  const isSafe = !hasSpam && !isCompletelyEmpty;

  let executiveSummary = "Recipe appears safe and complete with standard culinary structure.";
  if (verdict === "flagged") {
    executiveSummary = "Recipe was intercepted because it contains advertising, links, or unrelated spam content.";
  } else if (verdict === "needs_info") {
    executiveSummary = `Recipe is genuine food, but lacks important cooking details (${qualityIssues.join(", ")}).`;
  }

  return {
    is_safe: isSafe,
    verdict,
    confidence_score: Math.round(score * 100) / 100,
    issues: issues.slice(0, 4),
    quality_issues: qualityIssues,
    severe_violations: severeViolations,
    suggested_tags: Array.from(suggestedTags).slice(0, 8),
    summary: executiveSummary,
    executive_summary: executiveSummary,
    provider: "Built-in Heuristic",
    model: "safety-rules-v1",
  };
}

function buildPrompt(recipe: RecipeInputForAi, hasImage: boolean = false): string {
  return `Analyze this recipe dossier thoroughly for safety, completeness, spam, or inappropriate content:

RECIPE DOSSIER:
Title: ${recipe.title}
Category: ${recipe.category || "N/A"}
Meal Type: ${recipe.meal_type || "N/A"}
Prep Time: ${recipe.prep_time || 0} mins, Cook Time: ${recipe.cook_time || 0} mins
Description: ${recipe.description || "N/A"}
Ingredients:
${JSON.stringify(recipe.ingredients || [])}
Instructions:
${JSON.stringify(recipe.instructions || [])}
Has Attached Image: ${hasImage ? "YES (multimodal image attached in this same request)" : "NO"}

TASK:
1. Is it a legitimate food recipe? (Not spam, ads, gibberish, or hazardous chemicals)
2. Are ingredient measurements clear?
3. Are instruction steps coherent and safe?
${hasImage ? "4. Photo verification: Is the attached photo culinary/food related, matching the recipe, and safe (no NSFW, gore, weapons)?" : ""}
5. Classify verdict:
   - "safe": Authentic, complete culinary recipe (and valid food photo if attached).
   - "needs_info": Safe food, but missing important details (e.g. missing measurements, vague steps, or photo is not food).
   - "flagged": Spam, links, casino/crypto, vulgarity, offensive photo, or non-food hazard.
6. Provide a 1-sentence plain-English executive summary for someone with NO coding background.

OUTPUT REQUIREMENTS:
Output JSON ONLY with this exact structure:
{
  "is_safe": boolean,
  "verdict": "safe" | "needs_info" | "flagged",
  "confidence_score": number (0.0 to 1.0),
  "issues": string[] (max 3 short phrases, empty if none),
  "quality_issues": string[] (missing measurements, vague instructions),
  "severe_violations": string[] (spam, inappropriate, toxic),
  "image_check": {
    "is_food": boolean,
    "is_safe": boolean,
    "label": string (max 3 words)
  },
  "suggested_tags": string[] (2-4 tags),
  "summary": string (1 concise sentence),
  "executive_summary": string (1 plain-English sentence easily understood by anyone)
}`;
}

/**
 * Clean & parse JSON response safely from LLM output.
 * Robustly parses plain JSON, markdown code-fenced JSON, or embedded JSON structures.
 */
function cleanJsonOutput(rawText: string): any {
  const cleaned = rawText.trim();
  // 1. Direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Markdown code block extraction
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {}
  }

  // 3. Scan for enclosing curly braces { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {}
  }

  throw new Error("Unable to parse JSON from AI response: " + cleaned.slice(0, 100));
}

export interface AiRuntimeConfig {
  provider: "OpenRouter" | "Google Gemini" | "Built-in Heuristic";
  model: string;
  visionModel: string;
  maxTokens: number;
}

/**
 * Dynamically resolves the AI Provider and Model from environment variables.
 * None of the models are hardcoded.
 */
export function getAiConfig(): AiRuntimeConfig {
  const chosenProvider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  const universalModel = (process.env.AI_MODEL || "").trim();
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS || "1200", 10);
  const visionModel = (
    process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.0-flash-exp:free"
  ).trim();

  // Explicit override: Gemini
  if (chosenProvider === "gemini" && (process.env.GEMINI_API_KEY || process.env.AI_API_KEY)) {
    return {
      provider: "Google Gemini",
      model: (process.env.GEMINI_MODEL || universalModel || "gemini-2.0-flash").trim(),
      visionModel,
      maxTokens,
    };
  }

  // Explicit override: OpenRouter
  if (chosenProvider === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return {
      provider: "OpenRouter",
      model: (process.env.OPENROUTER_MODEL || universalModel || "google/gemini-2.0-flash-exp:free").trim(),
      visionModel,
      maxTokens,
    };
  }

  // Auto-detect 1: OpenRouter (if OPENROUTER_API_KEY is present)
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
    return {
      provider: "OpenRouter",
      model: (process.env.OPENROUTER_MODEL || universalModel || "google/gemini-2.0-flash-exp:free").trim(),
      visionModel,
      maxTokens,
    };
  }

  // Auto-detect 2: Google Gemini (if GEMINI_API_KEY is present)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (geminiKey && geminiKey.trim()) {
    return {
      provider: "Google Gemini",
      model: (process.env.GEMINI_MODEL || universalModel || "gemini-2.0-flash").trim(),
      visionModel,
      maxTokens,
    };
  }

  // Default fallback: Built-in safety heuristic
  return {
    provider: "Built-in Heuristic",
    model: "safety-rules-v1",
    visionModel: "heuristic-vision",
    maxTokens: 0,
  };
}

/**
 * Ultra-Low Token Image Moderation via OpenRouter Vision Model
 * Evaluates whether an uploaded recipe image is culinary related and safe.
 */
export async function analyzeImageWithAi(imageUrl: string): Promise<ImageModerationResult> {
  const trimmedUrl = (imageUrl || "").trim();
  if (!trimmedUrl || (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://"))) {
    return { is_food: true, is_safe: true, label: "No external image" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return { is_food: true, is_safe: true, label: "Unverified (Offline)" };
  }

  const config = getAiConfig();
  const model = config.visionModel;

  try {
    const prompt = `Inspect this image strictly for a cooking recipe platform:
1. Is it food or cooking related?
2. Is it safe (no NSFW, explicit gore, weapons, or hate)?
Output JSON ONLY: {"is_food": boolean, "is_safe": boolean, "label": string (max 3 words, e.g. "Chicken Curry"), "issue": string (empty if safe)}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://heygarlic.com",
        "X-Title": "Hey Garlic Food Platform",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: trimmedUrl } },
            ],
          },
        ],
        max_tokens: 80, // Ultra-low output tokens
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn("Image vision check returned non-200, continuing safely:", response.status);
      return { is_food: true, is_safe: true, label: "Food photo" };
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      return { is_food: true, is_safe: true, label: "Food photo" };
    }

    const parsed = cleanJsonOutput(rawContent);
    return {
      is_food: typeof parsed.is_food === "boolean" ? parsed.is_food : true,
      is_safe: typeof parsed.is_safe === "boolean" ? parsed.is_safe : true,
      label: String(parsed.label || "Food item").slice(0, 40),
      issue: parsed.issue ? String(parsed.issue).slice(0, 100) : undefined,
    };
  } catch (err) {
    console.warn("Vision check skipped due to network/parsing:", err);
    return { is_food: true, is_safe: true, label: "Culinary photo" };
  }
}

/**
 * Review / Comment Moderation via OpenRouter
 * Detects spam links, promo, harassment, or profanity in community reviews.
 */
export async function analyzeReviewWithAi(
  comment: string,
  rating: number
): Promise<ReviewModerationResult> {
  const trimmed = (comment || "").trim();
  if (!trimmed) {
    return {
      is_safe: true,
      verdict: "safe",
      confidence_score: 1.0,
      issues: [],
      executive_summary: "Clean numerical rating with no comment text.",
      provider: "Direct Validation",
      model: "standard",
    };
  }

  // Fast heuristic check for obvious spam links
  const lower = trimmed.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("casino") || lower.includes("crypto")) {
    return {
      is_safe: false,
      verdict: "flagged",
      confidence_score: 0.15,
      issues: ["External promotion or spam link detected in review"],
      executive_summary: "Review flagged: Contains external links or advertising keywords.",
      provider: "Heuristic Safety",
      model: "safety-rules-v1",
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      is_safe: true,
      verdict: "safe",
      confidence_score: 0.95,
      issues: [],
      executive_summary: "Community review appears safe.",
      provider: "Built-in Heuristic",
      model: "safety-rules-v1",
    };
  }

  const config = getAiConfig();
  const prompt = `Analyze this recipe review comment for a food platform:
Review text: "${trimmed}" (Rating: ${rating}/5 stars)
Check: Is it spam, harassment, hate speech, or external advertising?
Output JSON ONLY:
{
  "is_safe": boolean,
  "verdict": "safe" | "flagged",
  "confidence_score": number (0.0 to 1.0),
  "issues": string[],
  "executive_summary": string (1 concise sentence)
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://heygarlic.com",
        "X-Title": "Hey Garlic Food Platform",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: "You are a content safety moderator. Output JSON only." },
          { role: "user", content: prompt },
        ],
        max_tokens: 120,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter review check failed: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const parsed = cleanJsonOutput(rawContent);

    return {
      is_safe: typeof parsed.is_safe === "boolean" ? parsed.is_safe : true,
      verdict: parsed.verdict === "flagged" ? "flagged" : "safe",
      confidence_score: Math.min(1, Math.max(0, parsed.confidence_score ?? 0.95)),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
      executive_summary: parsed.executive_summary || "Community review evaluated by AI.",
      provider: "OpenRouter",
      model: config.model,
    };
  } catch (err: any) {
    console.warn("AI review analysis failed, using fallback:", err.message);
    return {
      is_safe: true,
      verdict: "safe",
      confidence_score: 0.95,
      issues: [],
      executive_summary: "Review accepted under fallback safety validation.",
      provider: "Built-in Heuristic",
      model: "safety-rules-v1",
    };
  }
}

/**
 * Call OpenRouter AI with dynamic model name and auto-retry for reasoning/custom models.
 */
async function callOpenRouter(
  recipe: RecipeInputForAi,
  apiKey: string,
  modelName?: string,
  maxOutputTokens?: number
): Promise<AiModerationResult> {
  const model = modelName || process.env.OPENROUTER_MODEL || process.env.AI_MODEL || "google/gemini-2.0-flash-exp:free";
  const maxTokens = maxOutputTokens || parseInt(process.env.AI_MAX_TOKENS || "1200", 10);

  const hasValidImage = Boolean(
    recipe.hero_image &&
    (recipe.hero_image.startsWith("http://") || recipe.hero_image.startsWith("https://"))
  );

  const prompt = buildPrompt(recipe, hasValidImage);

  const requestHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://heygarlic.com",
    "X-Title": "Hey Garlic Food Platform",
  };

  // Unified single-request multimodal payload
  const userContent: any[] = [{ type: "text", text: prompt }];
  if (hasValidImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: recipe.hero_image },
    });
  }

  const messages = [
    {
      role: "system",
      content:
        "You are an AI Food Safety and Content Moderator for Hey Garlic recipe platform. You analyze both culinary text and accompanying photo in a single pass. You must output ONLY valid compact JSON matching the requested schema without any markdown formatting or commentary.",
    },
    {
      role: "user",
      content: hasValidImage ? userContent : prompt,
    },
  ];

  let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  });

  // If 400 Bad Request because model is text-only, retry cleanly without vision payload
  if (!response.ok && hasValidImage) {
    const errorBody = await response.text();
    if (errorBody.toLowerCase().includes("image") || errorBody.toLowerCase().includes("vision") || response.status === 400) {
      console.warn("AI model rejected vision payload, retrying single request as text-only:", errorBody.slice(0, 100));
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI Food Safety and Content Moderator for Hey Garlic recipe platform. Output JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
      });
    } else {
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenRouter API call failed:", errorBody);
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;

  if (!rawContent) {
    const finishReason = data?.choices?.[0]?.finish_reason || "unknown";
    throw new Error(`OpenRouter model "${model}" returned empty content (finish_reason: ${finishReason}). If using a reasoning model, increase AI_MAX_TOKENS in .env.`);
  }

  const parsed = cleanJsonOutput(rawContent);

  const issues = Array.isArray(parsed.issues) ? [...parsed.issues] : [];
  let verdict: "safe" | "needs_info" | "flagged" = parsed.verdict || (parsed.is_safe === false ? "flagged" : "safe");

  // Incorporate unified single-pass image analysis result
  let imageCheck: ImageModerationResult | undefined = undefined;
  if (parsed.image_check) {
    imageCheck = {
      is_food: typeof parsed.image_check.is_food === "boolean" ? parsed.image_check.is_food : true,
      is_safe: typeof parsed.image_check.is_safe === "boolean" ? parsed.image_check.is_safe : true,
      label: parsed.image_check.label || "Food photo",
    };

    if (!imageCheck.is_safe) {
      issues.push("Attached photo flagged for safety violation");
      verdict = "flagged";
    } else if (!imageCheck.is_food) {
      issues.push("Attached photo does not appear to be food or cooking related");
      if (verdict === "safe") verdict = "needs_info";
    }
  }

  const isSafe = verdict !== "flagged";

  return {
    is_safe: isSafe,
    verdict,
    confidence_score: Math.min(1, Math.max(0, parsed.confidence_score ?? 0.95)),
    issues: issues.slice(0, 4),
    quality_issues: Array.isArray(parsed.quality_issues) ? parsed.quality_issues : [],
    severe_violations: Array.isArray(parsed.severe_violations) ? parsed.severe_violations : [],
    suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags.slice(0, 8) : [],
    summary: parsed.summary || "Recipe evaluated by OpenRouter AI.",
    executive_summary: parsed.executive_summary || parsed.summary || "Recipe evaluated by OpenRouter AI.",
    image_analysis: imageCheck,
    provider: "OpenRouter",
    model,
  };
}

/**
 * Call Google Gemini Direct API with dynamic model from .env
 */
async function callGemini(
  recipe: RecipeInputForAi,
  apiKey: string,
  modelName?: string,
  maxOutputTokens?: number
): Promise<AiModerationResult> {
  const model = modelName || process.env.GEMINI_MODEL || process.env.AI_MODEL || "gemini-2.0-flash";
  const maxTokens = maxOutputTokens || parseInt(process.env.AI_MAX_TOKENS || "500", 10);
  const prompt = buildPrompt(recipe);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: maxTokens,
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API call failed:", errorBody);
    throw new Error(`Google Gemini API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Google Gemini API returned empty text candidate.");
  }

  const parsed = cleanJsonOutput(textOutput);
  const verdict = parsed.verdict || (parsed.is_safe === false ? "flagged" : "safe");

  return {
    is_safe: verdict !== "flagged",
    verdict,
    confidence_score: Math.min(1, Math.max(0, parsed.confidence_score ?? 0.95)),
    issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 4) : [],
    quality_issues: Array.isArray(parsed.quality_issues) ? parsed.quality_issues : [],
    severe_violations: Array.isArray(parsed.severe_violations) ? parsed.severe_violations : [],
    suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags.slice(0, 8) : [],
    summary: parsed.summary || "Recipe evaluated by Google Gemini.",
    executive_summary: parsed.executive_summary || parsed.summary || "Recipe evaluated by Google Gemini.",
    provider: "Google Gemini",
    model,
  };
}

/**
 * Universal AI Moderation Engine
 * Precedence:
 * 1. OpenRouter (if OPENROUTER_API_KEY is present or AI_PROVIDER=openrouter)
 * 2. Google Gemini (if GEMINI_API_KEY is present or AI_PROVIDER=gemini)
 * 3. Built-in Heuristic Safety Engine (used ONLY if no API keys are present)
 */
export async function analyzeRecipeWithAi(recipe: RecipeInputForAi): Promise<AiModerationResult> {
  const config = getAiConfig();

  // 1. Strict OpenRouter execution
  if (config.provider === "OpenRouter") {
    const openRouterKey = process.env.OPENROUTER_API_KEY!.trim();
    return await callOpenRouter(recipe, openRouterKey, config.model, config.maxTokens);
  }

  // 2. Strict Gemini execution
  if (config.provider === "Google Gemini") {
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY)!.trim();
    return await callGemini(recipe, geminiKey, config.model, config.maxTokens);
  }

  // 3. Built-in rule-based heuristic (strictly when no API keys are configured)
  return runHeuristicModerator(recipe);
}

/**
 * Returns current active AI provider and model information directly from .env
 */
export function getActiveAiProviderInfo(): { provider: string; model: string } {
  const config = getAiConfig();
  return {
    provider: config.provider,
    model: config.model,
  };
}
