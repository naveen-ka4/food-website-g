/**
 * Localized Category and Cuisine Names for Hey Garlic
 * Translates dish type categories and global cuisines across supported locales.
 */

export const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  "en-US": {
    "Curries": "Curries",
    "Pasta & Noodles": "Pasta & Noodles",
    "Rice Dishes": "Rice Dishes",
    "Breakfast": "Breakfast",
    "Lunch": "Lunch",
    "Dinner": "Dinner",
    "Dessert": "Dessert",
    "Snack": "Snack",
    "Drink": "Drink",
    "Baking": "Baking",
    "Seafood": "Seafood",
    "Soups & Stews": "Soups & Stews",
    "Fresh Salads": "Fresh Salads",
    "Vegetarian": "Vegetarian",
    "Sauces & Dips": "Sauces & Dips",
    "Grill & BBQ": "Grill & BBQ",
    "Burgers & Sandwiches": "Burgers & Sandwiches",
    "Pizza": "Pizza",
    "Street Food": "Street Food",
    "Smoothies & Shakes": "Smoothies & Shakes",
    "Ice Cream & Frozen": "Ice Cream & Frozen",
    "Egg Dishes": "Egg Dishes",
    "Appetizers": "Appetizers",
    "Healthy Bowls": "Healthy Bowls",
  },
  "en-GB": {
    "Curries": "Curries",
    "Pasta & Noodles": "Pasta & Noodles",
    "Rice Dishes": "Rice Dishes",
    "Breakfast": "Breakfast",
    "Lunch": "Lunch",
    "Dinner": "Dinner",
    "Dessert": "Pudding & Desserts",
    "Snack": "Snacks",
    "Drink": "Drinks",
    "Baking": "Baking",
    "Seafood": "Seafood & Fish",
    "Soups & Stews": "Soups & Stews",
    "Fresh Salads": "Fresh Salads",
    "Vegetarian": "Vegetarian",
    "Sauces & Dips": "Sauces & Dips",
    "Grill & BBQ": "Grill & Barbecue",
    "Burgers & Sandwiches": "Burgers & Sandwiches",
    "Pizza": "Pizza",
    "Street Food": "Street Food",
    "Smoothies & Shakes": "Smoothies & Shakes",
    "Ice Cream & Frozen": "Ice Cream & Ices",
    "Egg Dishes": "Egg Dishes",
    "Appetizers": "Starters & Appetizers",
    "Healthy Bowls": "Healthy Bowls",
  },
  "ja-JP": {
    "Curries": "カレー",
    "Pasta & Noodles": "パスタ・麺類",
    "Rice Dishes": "ご飯もの",
    "Breakfast": "朝食",
    "Lunch": "昼食",
    "Dinner": "夕食",
    "Dessert": "デザート",
    "Snack": "おやつ・軽食",
    "Drink": "ドリンク",
    "Baking": "パン・焼き菓子",
    "Seafood": "シーフード・魚介",
    "Soups & Stews": "スープ・煮込み",
    "Fresh Salads": "フレッシュサラダ",
    "Vegetarian": "ベジタリアン",
    "Sauces & Dips": "ソース・ディップ",
    "Grill & BBQ": "グリル・BBQ",
    "Burgers & Sandwiches": "バーガー・サンドイッチ",
    "Pizza": "ピザ",
    "Street Food": "屋台料理",
    "Smoothies & Shakes": "スムージー",
    "Ice Cream & Frozen": "アイス・フローズン",
    "Egg Dishes": "卵料理",
    "Appetizers": "前菜・おつまみ",
    "Healthy Bowls": "ヘルシーボウル",
  },
};

export const CUISINE_TRANSLATIONS: Record<string, Record<string, string>> = {
  "en-US": {
    "Sri Lankan": "Sri Lankan",
    "Italian": "Italian",
    "Asian": "Asian",
    "Indian": "Indian",
    "Mexican": "Mexican",
    "American": "American",
    "Japanese": "Japanese",
    "Thai": "Thai",
    "Mediterranean": "Mediterranean",
    "French": "French",
    "Middle Eastern": "Middle Eastern",
    "Chinese": "Chinese",
    "British": "British",
    "Spanish": "Spanish",
    "Korean": "Korean",
  },
  "en-GB": {
    "Sri Lankan": "Sri Lankan",
    "Italian": "Italian",
    "Asian": "Asian",
    "Indian": "Indian",
    "Mexican": "Mexican",
    "American": "American",
    "Japanese": "Japanese",
    "Thai": "Thai",
    "Mediterranean": "Mediterranean",
    "French": "French",
    "Middle Eastern": "Middle Eastern",
    "Chinese": "Chinese",
    "British": "British",
    "Spanish": "Spanish",
    "Korean": "Korean",
  },
  "ja-JP": {
    "Sri Lankan": "スリランカ料理",
    "Italian": "イタリア料理",
    "Asian": "アジア料理",
    "Indian": "インド料理",
    "Mexican": "メキシコ料理",
    "American": "アメリカ料理",
    "Japanese": "和食・日本料理",
    "Thai": "タイ料理",
    "Mediterranean": "地中海料理",
    "French": "フランス料理",
    "Middle Eastern": "中東料理",
    "Chinese": "中華料理",
    "British": "イギリス料理",
    "Spanish": "スペイン料理",
    "Korean": "韓国料理",
  },
};

export function localizeCategory(name: string, locale?: string): string {
  if (!name) return "";
  const lang = locale || "en-US";
  const dict = CATEGORY_TRANSLATIONS[lang] || CATEGORY_TRANSLATIONS["en-US"];
  return dict?.[name] || name;
}

export function localizeCuisine(name: string, locale?: string): string {
  if (!name) return "";
  const lang = locale || "en-US";
  const dict = CUISINE_TRANSLATIONS[lang] || CUISINE_TRANSLATIONS["en-US"];
  return dict?.[name] || name;
}

