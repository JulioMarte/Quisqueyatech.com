import "server-only";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://missing.convex.cloud";
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || convexUrl.replace(".convex.cloud", ".convex.site");

export const betterAuthNext = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction, isAuthenticated } = betterAuthNext;
