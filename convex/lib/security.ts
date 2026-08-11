import { ConvexError } from "convex/values";

export function constantTimeEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function requiredSecret(
  name: "ADMIN_API_SECRET" | "ASSESSMENT_STORAGE_SECRET" | "ASSESSMENT_WORKER_SECRET",
) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: `${name} is not configured`,
    });
  }
  return value;
}

/** Machine-to-machine auth for Next.js BFF → Convex. */
export function requireAdminApiSecret(secret: string | undefined) {
  const expected = requiredSecret("ADMIN_API_SECRET");
  if (!secret || !constantTimeEqual(secret, expected)) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
}

/** Assessment pipeline storage auth (separate from admin API secret). */
export function requireAssessmentStorageSecret(secret: string | undefined) {
  const expected = requiredSecret("ASSESSMENT_STORAGE_SECRET");
  if (!secret || !constantTimeEqual(secret, expected)) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
}

/** Machine-to-machine auth for the LiveKit worker -> Convex bootstrap. */
export function requireAssessmentWorkerSecret(secret: string | undefined) {
  const expected = requiredSecret("ASSESSMENT_WORKER_SECRET");
  if (!secret || !constantTimeEqual(secret, expected)) {
    throw new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
}
