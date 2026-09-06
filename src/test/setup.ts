import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
// Existing feature tests exercise the established English fixture copy. Dedicated
// locale tests clear this value to verify the production default of Korean.
beforeEach(() => window.localStorage.setItem("intern-project-hub.locale", "en"));
afterEach(() => cleanup());
