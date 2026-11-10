/**
 * Vitest Setup File
 * Runs before all test files
 */

import React from "react";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ==============================================================================
// GLOBAL SETUP
// ==============================================================================

beforeAll(() => {
  // Mock Next.js environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

// ==============================================================================
// CLEANUP AFTER EACH TEST
// ==============================================================================

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ==============================================================================
// MOCK NEXT.JS MODULES
// ==============================================================================

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
    query: {},
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: (props: any) => {
    return React.createElement("img", props);
  },
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Mock Next.js cache
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: any) => fn),
}));

// ==============================================================================
// MOCK SUPABASE CLIENT
// ==============================================================================

function createChainableQueryBuilder() {
  let resolvedValue: any = { data: [], error: null };
  const queue: any[] = [];

  const singleMock = vi.fn((..._args: any[]) => {
    if (queue.length > 0) return Promise.resolve(queue.shift());
    return Promise.resolve(resolvedValue);
  });

  const maybeSingleMock = vi.fn((..._args: any[]) => {
    if (queue.length > 0) return Promise.resolve(queue.shift());
    return Promise.resolve(resolvedValue);
  });

  const builder: any = {
    mockResolvedValueOnce: (val: any) => {
      queue.push(val);
      return builder;
    },
    mockResolvedValue: (val: any) => {
      resolvedValue = val;
      return builder;
    },
    then: (resolve: any, reject?: any) => {
      const val = queue.length > 0 ? queue.shift() : resolvedValue;
      return Promise.resolve(val).then(resolve, reject);
    },
    single: singleMock,
    maybeSingle: maybeSingleMock,
    csv: vi.fn(),
    geojson: vi.fn(),
    explain: vi.fn(),
    rollback: vi.fn(),
  };

  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
    "contains", "containedBy", "rangeLt", "rangeGt", "rangeGte", "rangeLte",
    "rangeAdjacent", "overlaps", "textSearch", "match", "not", "or",
    "filter", "order", "limit", "range", "abortSignal", "returns"
  ];

  methods.forEach((method) => {
    builder[method] = vi.fn((..._args: any[]) => builder);
  });

  return builder;
}

const sharedMockQueryBuilder = createChainableQueryBuilder();

export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn((..._args: any[]) => Promise.resolve({ data: { user: null }, error: null })),
    getSession: vi.fn((..._args: any[]) => Promise.resolve({ data: { session: null }, error: null })),
    signInWithPassword: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
    signUp: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
    signOut: vi.fn((..._args: any[]) => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
    updateUser: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
  },
  from: vi.fn((..._args: any[]) => sharedMockQueryBuilder),
  rpc: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
  storage: {
    from: vi.fn((..._args: any[]) => ({
      upload: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
      download: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
      list: vi.fn((..._args: any[]) => Promise.resolve({ data: [], error: null })),
      remove: vi.fn((..._args: any[]) => Promise.resolve({ data: null, error: null })),
      createSignedUrl: vi.fn((..._args: any[]) => Promise.resolve({ data: { signedUrl: "" }, error: null })),
      getPublicUrl: vi.fn((..._args: any[]) => ({
        data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/test.webp" },
      })),
    })),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// ==============================================================================
// MOCK SONNER TOAST
// ==============================================================================

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    custom: vi.fn(),
    message: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: vi.fn(() => null),
}));

// ==============================================================================
// GLOBAL TEST UTILITIES
// ==============================================================================

// Mock file for upload tests
export const createMockFile = (
  name: string = "test.jpg",
  size: number = 1024,
  type: string = "image/jpeg"
): File => {
  const blob = new Blob(["a".repeat(size)], { type });
  return new File([blob], name, { type });
};

// Mock image for image tests
export const createMockImage = (width: number = 100, height: number = 100): HTMLImageElement => {
  const img = document.createElement("img");
  img.width = width;
  img.height = height;
  return img;
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ==============================================================================
// SUPPRESS CONSOLE ERRORS IN TESTS (optional)
// ==============================================================================

// Uncomment to suppress expected console errors in tests
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args: any[]) => {
//     if (
//       typeof args[0] === 'string' &&
//       (args[0].includes('Warning: ReactDOM.render') ||
//        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
// 
// afterAll(() => {
//   console.error = originalError;
// });
