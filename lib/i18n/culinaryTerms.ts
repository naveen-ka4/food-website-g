/**
 * Authentic British Culinary Terminology Mapping
 * Converts American culinary terms to standard British English equivalents
 * when browsing the UK edition (en-GB).
 */

export const CULINARY_UK_MAPPING: Record<string, string> = {
  // Vegetables & Herbs
  "eggplant": "aubergine",
  "eggplants": "aubergines",
  "zucchini": "courgette",
  "zucchinis": "courgettes",
  "cilantro": "coriander",
  "fresh cilantro": "fresh coriander",
  "arugula": "rocket",
  "scallion": "spring onion",
  "scallions": "spring onions",
  "green onion": "spring onion",
  "green onions": "spring onions",
  "bell pepper": "pepper",
  "bell peppers": "peppers",
  "snow peas": "mangetout",
  "fava beans": "broad beans",
  "rutabaga": "swede",
  "beet": "beetroot",
  "beets": "beetroots",

  // Dairy & Baking
  "heavy cream": "double cream",
  "heavy whipping cream": "double cream",
  "whipping cream": "double cream",
  "half-and-half": "single cream",
  "powdered sugar": "icing sugar",
  "confectioners' sugar": "icing sugar",
  "all-purpose flour": "plain flour",
  "graham cracker": "digestive biscuit",
  "graham crackers": "digestive biscuits",
  "baking soda": "bicarbonate of soda",
  "cornstarch": "cornflour",
  "cookie": "biscuit",
  "cookies": "biscuits",
  "frosting": "icing",

  // Meat & Seafood
  "ground beef": "minced beef",
  "ground meat": "mince",
  "ground pork": "minced pork",
  "ground turkey": "minced turkey",
  "ground chicken": "minced chicken",
  "shrimp": "prawns",
  "canadian bacon": "back bacon",

  // Equipment & Methods
  "baking sheet": "baking tray",
  "sheet pan": "baking tray",
  "skillet": "frying pan",
  "cast iron skillet": "cast iron frying pan",
  "broil": "grill",
  "broiler": "grill",
  "broiled": "grilled",
  "plastic wrap": "cling film",
  "aluminum foil": "tin foil",
};

/**
 * Localizes an ingredient string when viewing in UK English
 * E.g., "1 large eggplant" -> "1 large aubergine"
 */
export function localizeIngredientName(name: string, locale: string): string {
  if (locale !== "en-GB" || !name) return name;

  let localized = name;
  // Sort keys by length descending so multi-word terms (e.g. "heavy whipping cream") match before "cream"
  const sortedTerms = Object.keys(CULINARY_UK_MAPPING).sort(
    (a, b) => b.length - a.length
  );

  for (const usTerm of sortedTerms) {
    const ukTerm = CULINARY_UK_MAPPING[usTerm];
    const regex = new RegExp(`\\b${usTerm}\\b`, "gi");
    if (regex.test(localized)) {
      localized = localized.replace(regex, (match) => {
        // Preserve title case or uppercase if originally matched
        if (match === match.toUpperCase()) return ukTerm.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
          return ukTerm.charAt(0).toUpperCase() + ukTerm.slice(1);
        }
        return ukTerm;
      });
    }
  }

  return localized;
}

