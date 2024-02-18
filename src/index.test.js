import { it, describe, expect } from "vitest";
import { getDatabase } from "./index.js";
describe("sqloo tests", () => {
  it("should be able to get the adapter for a postgres database", async () => {
    const db = await getDatabase({
      type: "postgres",
      name: process.env.SQLOO_NAME || "sqloo",
      host: process.env.SQLOO_HOST || "localhost",
      user: process.env.SQLOO_USER || "sqloo",
      pass: process.env.SQLOO_PASS || "sqloo",
      port: process.env.SQLOO_PORT || "5432",
    });
    expect(db.client).toBeDefined();
  });

  it("should be able to get the adapter for a sqlite database", async () => {
    const db = await getDatabase({
      type: "sqlite",
      file: "::memory::",
    });
    expect(db.client).toBeDefined();
  });
});
