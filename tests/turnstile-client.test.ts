import assert from "node:assert/strict";
import test from "node:test";
import { classifyTurnstileError } from "../components/security/turnstile-field";

test("classifies browser, extension, network, and blocked challenge codes", () => {
  for (const code of ["300030", "600010", "200500"])
    assert.deepEqual(classifyTurnstileError(code), { cause: "browser", code });
});

test("classifies site key, hostname, and Cloudflare configuration codes", () => {
  for (const code of ["110200", "400020"])
    assert.deepEqual(classifyTurnstileError(code), { cause: "configuration", code });
});

test("preserves unknown support codes and provides a fallback", () => {
  assert.deepEqual(classifyTurnstileError("102000"), {
    cause: "unavailable",
    code: "102000",
  });
  assert.deepEqual(classifyTurnstileError(), {
    cause: "unavailable",
    code: "CLIENT-UNAVAILABLE",
  });
});
