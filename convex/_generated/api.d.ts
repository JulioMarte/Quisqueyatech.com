/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminReset from "../adminReset.js";
import type * as agenda from "../agenda.js";
import type * as assessmentValidators from "../assessmentValidators.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as funnel from "../funnel.js";
import type * as http from "../http.js";
import type * as lib_security from "../lib/security.js";
import type * as machineHttp from "../machineHttp.js";
import type * as migrations from "../migrations.js";
import type * as posts from "../posts.js";
import type * as retention from "../retention.js";
import type * as settings from "../settings.js";
import type * as webhookDelivery from "../webhookDelivery.js";
import type * as webhookHttp from "../webhookHttp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminReset: typeof adminReset;
  agenda: typeof agenda;
  assessmentValidators: typeof assessmentValidators;
  assessments: typeof assessments;
  auth: typeof auth;
  bookings: typeof bookings;
  crons: typeof crons;
  funnel: typeof funnel;
  http: typeof http;
  "lib/security": typeof lib_security;
  machineHttp: typeof machineHttp;
  migrations: typeof migrations;
  posts: typeof posts;
  retention: typeof retention;
  settings: typeof settings;
  webhookDelivery: typeof webhookDelivery;
  webhookHttp: typeof webhookHttp;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
