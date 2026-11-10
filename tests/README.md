# Hey Garlic Testing Suite

Comprehensive automated testing with Vitest, covering authentication, authorization, CRUD operations, and user flows.

## 📁 Structure

```
tests/
├── setup.ts                    # Global test configuration
├── helpers/
│   └── mockData.ts            # Mock data and utilities
├── unit/
│   ├── auth.test.ts           # Authentication & authorization tests
│   └── recipes.test.ts        # Recipe CRUD tests
└── integration/
    └── userFlow.test.ts       # End-to-end user journey tests
```

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests once (CI/CD)
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 📊 Coverage Thresholds

Configured in `vitest.config.ts`:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## 🧪 Test Categories

### Unit Tests

#### Authentication Tests (`tests/unit/auth.test.ts`)
- ✅ Sign up (valid, invalid email, weak password, duplicate)
- ✅ Sign in (valid, invalid credentials, non-existent user)
- ✅ Sign out
- ✅ Get session (authenticated, unauthenticated)
- ✅ Get user (authenticated, unauthenticated)
- ✅ Password reset (valid, invalid email)
- ✅ Update user (metadata, password)

#### Authorization Tests (`tests/unit/auth.test.ts`)
- ✅ Recipe access control (public, private, author-only)
- ✅ Profile access control (view, update)
- ✅ Saved recipes access control (create, view own, prevent viewing others)
- ✅ Row Level Security (RLS) policy enforcement

#### Recipe CRUD Tests (`tests/unit/recipes.test.ts`)
- ✅ Create recipe (success, missing fields, duplicate slug, defaults, validation)
- ✅ Read recipes (all, by ID, by slug, 404, filters, sorting, pagination)
- ✅ Update recipe (fields, visibility, validation, ingredients)
- ✅ Delete recipe (success, non-existent, cascade)
- ✅ Search (title, full-text)
- ✅ Statistics (view count, save count, ratings)

### Integration Tests (`tests/integration/userFlow.test.ts`)
- ✅ User registration flow
- ✅ User authentication flow
- ✅ Recipe creation flow
- ✅ Recipe discovery flow
- ✅ Recipe save/bookmark flow
- ✅ Social interaction flow (follow, review)
- ✅ Search workflow
- ✅ Profile update flow

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockUser, createMockResponse } from "../helpers/mockData";
import { mockSupabaseClient } from "../setup";

describe("Feature Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", async () => {
    // Arrange
    mockSupabaseClient.from().select().mockResolvedValueOnce(
      createMockResponse(mockData, null)
    );

    // Act
    const result = await someFunction();

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Using Mock Data

```typescript
import {
  mockUser,
  mockRecipe,
  mockProfile,
  createMockUser,
  createMockRecipe,
} from "../helpers/mockData";

// Use pre-defined mocks
const user = mockUser;

// Or create custom mocks
const customUser = createMockUser({
  email: "custom@example.com",
  id: "custom-id",
});
```

### Mocking Supabase Responses

```typescript
// Success response
mockSupabaseClient.from().select().mockResolvedValueOnce(
  createMockResponse(data, null)
);

// Error response
mockSupabaseClient.from().select().mockResolvedValueOnce(
  createMockResponse(null, {
    message: "Error message",
    code: "ERROR_CODE",
  })
);

// Auth mock
mockSupabaseClient.auth.getUser.mockResolvedValue(
  createMockResponse({ user: mockUser }, null)
);
```

## 🎯 Test Best Practices

### DO ✅
- Use descriptive test names that explain the scenario
- Follow AAA pattern (Arrange, Act, Assert)
- Clear mocks before each test (`vi.clearAllMocks()`)
- Test both success and failure cases
- Use `createMockResponse()` for consistent responses
- Group related tests in `describe` blocks

### DON'T ❌
- Share state between tests
- Use real API calls
- Skip error cases
- Write tests that depend on execution order
- Forget to mock authentication when needed

## 🔧 Configuration

### Vitest Config (`vitest.config.ts`)
- Environment: jsdom
- Setup file: `tests/setup.ts`
- Coverage provider: v8
- Timeout: 10 seconds
- Aliases: `@` → project root

### Mock Setup (`tests/setup.ts`)
- Next.js modules (router, Image, Link, cache)
- Supabase client (auth, database, storage)
- Sonner toast notifications
- Automatic cleanup after each test

## 📈 Coverage Report

After running `npm run test:coverage`, view the report:

```bash
# Terminal output
> vitest run --coverage

# HTML report (open in browser)
open coverage/index.html
```

## 🐛 Debugging Tests

### Run specific test file
```bash
npm test tests/unit/auth.test.ts
```

### Run specific test
```bash
npm test -t "should successfully sign up"
```

### Enable debug mode
```bash
DEBUG=* npm test
```

### Use Vitest UI
```bash
npm run test:ui
```

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

## 🚨 Common Issues

### Issue: "Module not found"
**Solution:** Check path aliases in `vitest.config.ts`

### Issue: "Cannot find mock"
**Solution:** Ensure `tests/setup.ts` is properly configured

### Issue: "Timeout exceeded"
**Solution:** Increase timeout in `vitest.config.ts` or specific test

### Issue: "Mock not working"
**Solution:** Verify mock is called before the test function

## ✅ Test Checklist

Before pushing code:
- [ ] All tests pass
- [ ] Coverage meets thresholds (70%)
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Tests are fast (<10s total runtime)
- [ ] No flaky tests (run multiple times)

## 🎉 Happy Testing!

Well-tested code is reliable code. Keep the tests green! 🟢
