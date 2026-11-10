# Hey Garlic API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All authenticated endpoints require a valid session cookie or Authorization header.

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>  (if using token auth)
```

---

## 🏥 Health Check

### GET /api/health

Check system health status.

**Response: 200 OK**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "latency": 45
    },
    "cache": {
      "status": "up"
    },
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    }
  },
  "version": "1.0.0",
  "environment": "production",
  "responseTime": 50
}
```

**Status Codes:**
- `200` - Healthy or degraded
- `503` - Unhealthy (service unavailable)

---

## 👤 Authentication

### Sign Up
**Server Action:** `signUpAction(data)`

```typescript
const result = await signUpAction({
  email: "user@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
  username: "username",
  termsAccepted: true
});
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: User,
    session: Session
  }
}
```

### Sign In
**Server Action:** `signInAction(data)`

```typescript
const result = await signInAction({
  email: "user@example.com",
  password: "Password123!"
});
```

### Sign Out
**Server Action:** `signOutAction()`

```typescript
await signOutAction();
```

---

## 🍽️ Recipes

### Get All Recipes
**Server Action:** `getRecipesAction(filters?)`

```typescript
const recipes = await getRecipesAction({
  category: "Dinner",
  limit: 20,
  offset: 0
});
```

**Response:**
```typescript
Recipe[] // Array of recipe objects
```

### Get Recipe by ID/Slug
**Server Action:** `getRecipeAction(id)`

```typescript
const recipe = await getRecipeAction("recipe-id-or-slug");
```

**Response:**
```typescript
{
  id: string;
  slug: string;
  title: string;
  description: string;
  hero_image: string;
  category: string;
  cook_time: number;
  rating: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  author: Profile;
  // ... more fields
}
```

### Create Recipe
**Server Action:** `createRecipeAction(data)`

```typescript
const result = await createRecipeAction({
  title: "My Recipe",
  slug: "my-recipe",
  description: "A delicious recipe",
  hero_image: "https://...",
  category: "Dinner",
  meal_type: "Dinner",
  cook_time: 30,
  prep_time: 15,
  default_servings: 4,
  ingredients: [
    { name: "Pasta", amount: "500", unit: "g" }
  ],
  instructions: [
    { step: 1, instruction: "Boil water" }
  ],
  visibility: "public",
  is_published: true
});
```

### Update Recipe
**Server Action:** `updateRecipeAction(id, data)`

```typescript
const result = await updateRecipeAction("recipe-id", {
  title: "Updated Title",
  cook_time: 35
});
```

### Delete Recipe
**Server Action:** `deleteRecipeAction(id)`

```typescript
await deleteRecipeAction("recipe-id");
```

---

## 🔍 Search

### Search Recipes
**Server Action:** `searchRecipesAction(params)`

```typescript
const results = await searchRecipesAction({
  query: "pasta",
  categories: ["Italian"],
  cuisines: ["Italian"],
  mealTypes: ["Dinner"],
  dietary: ["Vegetarian"],
  minRating: 4.0,
  maxCookTime: 30,
  difficulty: "Easy",
  limit: 20,
  offset: 0
});
```

**Response:**
```typescript
SearchRecipeResult[] // Array with search_rank
```

### Get Autocomplete
**Server Action:** `getAutocompleteAction(params)`

```typescript
const suggestions = await getAutocompleteAction({
  query: "pas",
  limit: 10
});
```

**Response:**
```typescript
AutocompleteSuggestion[] // Array of suggestions
```

### Get Search Facets
**Server Action:** `getSearchFacetsAction(query?)`

```typescript
const facets = await getSearchFacetsAction("pasta");
```

**Response:**
```typescript
SearchFacet[] // Array of { facet_type, facet_value, recipe_count }
```

---

## 💾 Saved Recipes

### Toggle Save Recipe
**Server Action:** `toggleSaveRecipeAction(recipeId)`

```typescript
await toggleSaveRecipeAction("recipe-id");
```

### Get User's Saved Recipes
**Server Action:** `getUserSavedRecipesAction()`

```typescript
const savedRecipes = await getUserSavedRecipesAction();
```

---

## 👥 Social Features

### Follow User
**Server Action:** `followUserAction(userId)`

```typescript
await followUserAction("user-id");
```

### Unfollow User
**Server Action:** `unfollowUserAction(userId)`

```typescript
await unfollowUserAction("user-id");
```

### Get Followers
**Server Action:** `getUserFollowersAction(userId, page?)`

```typescript
const followers = await getUserFollowersAction("user-id", 1);
```

### Get Following
**Server Action:** `getUserFollowingAction(userId, page?)`

```typescript
const following = await getUserFollowingAction("user-id", 1);
```

---

## 📰 Feed

### Get Personalized Feed
**Server Action:** `getFeedRecipesAction(page)`

```typescript
const feedRecipes = await getFeedRecipesAction(1);
```

**Response:**
```typescript
FeedRecipe[] // Array with feed_reason and feed_score
```

---

## 🔔 Notifications

### Get Notifications
**Server Action:** `getNotificationsAction(page?)`

```typescript
const notifications = await getNotificationsAction(1);
```

### Mark Notification as Read
**Server Action:** `markNotificationReadAction(notificationId)`

```typescript
await markNotificationReadAction("notification-id");
```

### Mark All as Read
**Server Action:** `markAllNotificationsReadAction()`

```typescript
await markAllNotificationsReadAction();
```

---

## ⭐ Reviews

### Create Review
**Server Action:** `createReviewAction(data)`

```typescript
const result = await createReviewAction({
  recipe_id: "recipe-id",
  rating: 5,
  comment: "Great recipe!"
});
```

### Reply to Review
**Server Action:** `createReplyAction(data)`

```typescript
const result = await createReplyAction({
  review_id: "review-id",
  recipe_id: "recipe-id",
  comment: "Thank you!"
});
```

---

## 👤 Profile

### Get User Profile
**Server Action:** `getProfileAction(username)`

```typescript
const profile = await getProfileAction("username");
```

### Update Profile
**Server Action:** `updateProfileAction(data)`

```typescript
const result = await updateProfileAction({
  full_name: "Updated Name",
  bio: "Updated bio",
  avatar_url: "https://..."
});
```

---

## 📤 File Upload

### Upload Avatar
**Endpoint:** `POST /api/avatar/upload`

```typescript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/avatar/upload", {
  method: "POST",
  body: formData
});

const { url } = await response.json();
```

---

## 🔐 Rate Limiting

All endpoints are rate-limited. Limits vary by action:

| Action | Limit |
|--------|-------|
| API General | 100 requests/minute |
| Recipe Create | 10 requests/minute |
| Search | 50 requests/minute |
| Auth Login | 5 requests/5 minutes |
| Auth Signup | 3 requests/hour |
| Password Reset | 3 requests/hour |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T00:01:00.000Z
```

**Rate Limit Exceeded Response: 429**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "error": "Error Title",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 🔄 Database Functions (RPC)

### Search Recipes Advanced
```typescript
const { data } = await supabase.rpc("search_recipes_advanced", {
  p_query: "pasta",
  p_categories: ["Italian"],
  p_cuisines: ["Italian"],
  p_meal_types: ["Dinner"],
  p_dietary: ["Vegetarian"],
  p_min_rating: 4.0,
  p_max_cook_time: 30,
  p_difficulty: "Easy",
  p_user_id: "user-id",
  p_limit: 20,
  p_offset: 0
});
```

### Check Rate Limit
```typescript
const { data } = await supabase.rpc("check_rate_limit", {
  p_user_id: "user-id",
  p_ip_address: "192.168.1.1",
  p_action: "recipe_create"
});

// Returns: { allowed, remaining, reset_at, limit_value }
```

### Calculate Popularity Score
```typescript
const { data } = await supabase.rpc("calculate_popularity_score", {
  p_recipe_id: "recipe-id"
});

// Returns: numeric score
```

---

## 🧪 Testing

### Postman Collection
Import the Postman collection for testing:
```
[Coming Soon]
```

### Sample cURL Commands

**Health Check:**
```bash
curl https://your-domain.com/api/health
```

**Get Recipes:**
```bash
curl https://your-domain.com/api/recipes
```

---

## 📊 Response Times

Expected response times (95th percentile):

| Endpoint | Response Time |
|----------|--------------|
| Health Check | <50ms |
| Get Recipes | <100ms |
| Search | <200ms |
| Create Recipe | <300ms |
| Upload Image | <1000ms |

---

## 🔗 Webhooks

### Recipe Published
```json
{
  "event": "recipe.published",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "recipe_id": "recipe-id",
    "title": "Recipe Title",
    "author_id": "user-id"
  }
}
```

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Support:** support@yourapp.com

---

## 🔄 Versioning

API Version: **v1.0.0**

Breaking changes will result in version bump.
