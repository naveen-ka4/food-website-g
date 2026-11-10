/**
 * Free Heuristic Bad Content & Anti-Spam Filter (Tier 1 Guard)
 * 100% Free, runs locally on VPS CPU in 0-1ms without consuming any external AI tokens.
 * Detects pornography, adult content, gambling, scam keywords, and telegram/whatsapp spam links.
 */

export interface FreeFilterInput {
  title: string;
  description?: string | null;
  category?: string | null;
  tag?: string | null;
  ingredients?: any[];
  instructions?: any[];
  hero_image?: string | null;
}

export interface FreeFilterResult {
  passed: boolean;
  isSevereViolation: boolean;
  issues: string[];
  executiveSummary: string;
}

// 1. Adult, Pornography & Sexually Explicit Regex Patterns
const ADULT_PATTERNS = [
  /\b(?:porn|porno|pornographic|xvideos|pornhub|xxx|nsfw|onlyfans|escort|camgirl|erotic|nude|nudity|naked|boobs|penis|vagina|dildo|hentai|milf|incest|blowjob|hardcore sex|sex video)\b/i,
  /\b(?:adult content|strip club|erotic massage|hookup site|casual sex)\b/i,
];

// 2. Gambling, Casino & Financial Scam Patterns
const GAMBLING_SCAM_PATTERNS = [
  /\b(?:casino|slot gacor|judi online|bet365|roulette|poker online|online betting|baccarat|sportsbook)\b/i,
  /\b(?:free bitcoin|crypto giveaway|earn \$\d+ daily|make money fast|forex signal|binary option|get rich quick|investment scheme)\b/i,
];

// 3. Unauthorized External Channels, Group Invites & URL Shorteners
const SPAM_LINK_PATTERNS = [
  /\b(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+]+/i,
  /\b(?:https?:\/\/)?(?:chat\.whatsapp\.com|wa\.me)\/[a-zA-Z0-9_+]+/i,
  /\b(?:https?:\/\/)?(?:discord\.gg)\/[a-zA-Z0-9]+/i,
  /\b(?:https?:\/\/)?(?:bit\.ly|tinyurl\.com|cutt\.ly|goo\.gl|is\.gd|ow\.ly|buff\.ly|rb\.gy)\/[a-zA-Z0-9]+/i,
];

// 4. Repeated Spam / Keyboard Mash Pattern (e.g. "aaaaaaaaaaaa", "$$$$$$$$$$$$")
const REPETITION_PATTERN = /(.)\1{9,}/;

/**
 * Runs high-speed zero-token heuristic content filtering.
 */
export function runFreeContentFilter(input: FreeFilterInput): FreeFilterResult {
  const issues: string[] = [];

  const title = (input.title || "").trim();
  const desc = (input.description || "").trim();
  const category = (input.category || "").trim();
  const tag = (input.tag || "").trim();

  // Extract ingredients text
  const ingredientsList = Array.isArray(input.ingredients) ? input.ingredients : [];
  const ingredientsText = ingredientsList
    .map((item) => (typeof item === "string" ? item : `${item?.name || ""} ${item?.amount || ""}`))
    .join(" ");

  // Extract instructions text
  const instructionsList = Array.isArray(input.instructions) ? input.instructions : [];
  const instructionsText = instructionsList
    .map((step) => (typeof step === "string" ? step : `${step?.title || ""} ${step?.description || step?.text || ""}`))
    .join(" ");

  // Combined full recipe text corpus
  const corpus = `${title} ${desc} ${category} ${tag} ${ingredientsText} ${instructionsText}`;

  // 1. Adult / Porn Check
  for (const pattern of ADULT_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push("Adult or sexually explicit content detected");
      break;
    }
  }

  // 2. Gambling / Scam Check
  for (const pattern of GAMBLING_SCAM_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push("Gambling, casino, or financial scam content detected");
      break;
    }
  }

  // 3. Spam Links / Telegram & WhatsApp Invites Check
  for (const pattern of SPAM_LINK_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push("Unauthorized external group or link detected (Telegram/WhatsApp/Shortener)");
      break;
    }
  }

  // Also check raw non-culinary URLs in instructions or description
  if (/https?:\/\/[^\s]+/i.test(`${desc} ${instructionsText}`)) {
    const rawMatch = `${desc} ${instructionsText}`.match(/https?:\/\/[^\s]+/i)?.[0] || "";
    // Ignore internal or harmless image hosts if any, flag general external links
    if (!rawMatch.includes("heygarlic") && !rawMatch.includes("supabase")) {
      if (!issues.some((i) => i.includes("link"))) {
        issues.push("External promotional link detected in recipe body");
      }
    }
  }

  // 4. Repetition / Abuse Pattern
  if (REPETITION_PATTERN.test(corpus)) {
    issues.push("Repetitive spam text or keyboard mash detected");
  }

  // 5. Image URL sanity check (if provided)
  const heroImage = (input.hero_image || "").trim();
  if (heroImage) {
    const lowerImg = heroImage.toLowerCase();
    if (
      lowerImg.endsWith(".exe") ||
      lowerImg.endsWith(".bat") ||
      lowerImg.endsWith(".sh") ||
      lowerImg.endsWith(".php") ||
      lowerImg.endsWith(".js")
    ) {
      issues.push("Malicious file format specified for hero photo");
    }
  }

  const isSevereViolation = issues.length > 0;
  const passed = !isSevereViolation;

  let executiveSummary = "Recipe text passed heuristic security checks.";
  if (isSevereViolation) {
    executiveSummary = `Recipe intercepted by Free Filter: ${issues.join("; ")}.`;
  }

  return {
    passed,
    isSevereViolation,
    issues,
    executiveSummary,
  };
}

