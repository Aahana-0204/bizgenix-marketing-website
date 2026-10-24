import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env";

describe("environment configuration", () => {
  it("supports credential-free local scaffolding and empty optional settings", () => {
    expect(parseEnv({ NEXT_PUBLIC_GET_STARTED_URL: "" })).toMatchObject({
      APP_ENV: "development",
      CRM_ADAPTER: "mock",
      NEXT_PUBLIC_GET_STARTED_URL: undefined,
    });
  });
  it("rejects unsafe public URLs", () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_GET_STARTED_URL: "javascript:alert(1)" }),
    ).toThrow("NEXT_PUBLIC_GET_STARTED_URL");
  });
  it("requires credentials when HTTP CRM is selected without printing secrets", () => {
    expect(() =>
      parseEnv({ CRM_ADAPTER: "http", CRM_API_KEY: "private-value" }),
    ).toThrow("CRM_BASE_URL");
    try {
      parseEnv({ CRM_ADAPTER: "invalid-private-value" });
    } catch (error) {
      expect(String(error)).not.toContain("invalid-private-value");
    }
  });
  it("fails closed for production with missing required services", () => {
    expect(() => parseEnv({ APP_ENV: "production" })).toThrow("DATABASE_URL");
  });
  it("infers production on Vercel when APP_ENV was omitted", () => {
    expect(() => parseEnv({ VERCEL_ENV: "production" })).toThrow(
      "DATABASE_URL",
    );
  });
  it("does not silently enable an unimplemented adapter", () => {
    expect(() => parseEnv({ CRM_ADAPTER: "sheets" })).toThrow(
      "not implemented",
    );
  });
});
