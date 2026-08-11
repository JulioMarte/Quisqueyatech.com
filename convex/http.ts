import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { runtime as machineRuntime, workerBootstrap } from "./machineHttp";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

// Next.js BFF machine endpoints (Authorization: Bearer ADMIN_API_SECRET).
http.route({ path: "/machine/runtime", method: "GET", handler: machineRuntime });
http.route({ path: "/machine/runtime", method: "POST", handler: machineRuntime });
http.route({ path: "/machine/worker-bootstrap", method: "GET", handler: workerBootstrap });

export default http;
