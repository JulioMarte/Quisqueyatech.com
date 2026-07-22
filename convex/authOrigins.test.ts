import { describe, expect, test } from "vitest";
import { authTrustedOrigins } from "./lib/authOrigins";

describe("authTrustedOrigins", () => {
  test("keeps the canonical site and adds configured loopback patterns", () => {
    expect(
      authTrustedOrigins(
        "https://www.quisqueyatech.com",
        "http://localhost:*, http://127.0.0.1:*,http://localhost:*",
      ),
    ).toEqual(["https://www.quisqueyatech.com", "http://localhost:*", "http://127.0.0.1:*"]);
  });

  test("ignores empty entries and rejects non-http schemes", () => {
    expect(authTrustedOrigins("https://www.quisqueyatech.com", " , ")).toEqual([
      "https://www.quisqueyatech.com",
    ]);
    expect(() =>
      authTrustedOrigins("https://www.quisqueyatech.com", "chrome-extension://unsafe"),
    ).toThrow("must use http or https");
  });
});
