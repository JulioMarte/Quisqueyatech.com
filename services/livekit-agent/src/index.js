"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var agents_1 = require("@livekit/agents");
var google = require("@livekit/agents-plugin-google");
var node_url_1 = require("node:url");
var zod_1 = require("zod");
var http_js_1 = require("./http.js");
var observability_js_1 = require("./observability.js");
(0, observability_js_1.startOpenTelemetry)();
var workerSecret = process.env.ASSESSMENT_WORKER_SECRET || "";
var workerConfigTimeoutMs = 8000;
var workerTelemetryTimeoutMs = 3000;
var assessmentMaxDurationMs = 900000;
var agentMetadataStates = {
    initializing: "initializing",
    ready: "ready",
    configurationError: "configuration_error",
    modelUnavailable: "model_unavailable",
    finalizing: "finalizing",
    recoveryAvailable: "recovery_available",
};
function log(stage, details) {
    if (details === void 0) { details = {}; }
    console.log(JSON.stringify(__assign({ service: "quisqueyatech-assessment", stage: stage }, details)));
}
function appUrl() {
    var _a, _b;
    var configured = ((_a = process.env.ASSESSMENT_APP_URL) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.NEXT_PUBLIC_SITE_URL) === null || _b === void 0 ? void 0 : _b.trim());
    if (!configured && process.env.NODE_ENV === "production") {
        throw new Error("ASSESSMENT_APP_URL or NEXT_PUBLIC_SITE_URL is required in production");
    }
    return (configured || "http://localhost:3000").replace(/\/$/, "");
}
function isDiagnostic(metadata) {
    return "diagnostic" in metadata && metadata.diagnostic === true;
}
function parseJobMetadata(raw) {
    try {
        var value = JSON.parse(raw || "{}");
        return typeof value === "object" && value ? value : {};
    }
    catch (_a) {
        return {};
    }
}
var agent = (0, agents_1.defineAgent)({
    entry: function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var entryStartedAt, metadata, baseUrl_1, response, runtime_1, complete, error_1, startedAt, supportId, baseUrl, telemetry, bootstrapResponse, runtime, prompt, completionReason, closeProgressRecorded, finalizeAssessment, recordThreshold, recordCloseOnce, updateAssessmentState, prepareAssessmentEnd, endCallTool, instructions, session, currentTurnId, turnStartedAt, stalledTurnId, turnWatchdog, recoveryTimer, lastAgentState, agentStarted, updateAgentMetadata, clearTurnTimers, resolveTurn, armTurnWatchdog, timers, error_2;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    entryStartedAt = Date.now();
                    log("env_check", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        agentName: ctx.job.agentName,
                        workerSecret: Boolean(workerSecret),
                        appUrl: Boolean((_a = process.env.ASSESSMENT_APP_URL) === null || _a === void 0 ? void 0 : _a.trim()),
                        siteUrl: Boolean((_b = process.env.NEXT_PUBLIC_SITE_URL) === null || _b === void 0 ? void 0 : _b.trim()),
                        nodeEnv: process.env.NODE_ENV || "development",
                    });
                    if (!workerSecret)
                        throw new Error("ASSESSMENT_WORKER_SECRET is required");
                    metadata = parseJobMetadata(ctx.job.metadata || "");
                    log("job_received", { jobId: ctx.job.id, room: ctx.room.name, agentName: ctx.job.agentName });
                    if (!isDiagnostic(metadata)) return [3 /*break*/, 16];
                    return [4 /*yield*/, ctx.connect()];
                case 1:
                    _l.sent();
                    log("ctx_connected", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: metadata.supportId,
                        diagnostic: true,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    if (!metadata.verifyApplication) return [3 /*break*/, 12];
                    _l.label = 2;
                case 2:
                    _l.trys.push([2, 9, , 11]);
                    baseUrl_1 = appUrl();
                    log("worker_config_fetch_start", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: metadata.supportId,
                        diagnostic: true,
                        appUrl: baseUrl_1,
                    });
                    return [4 /*yield*/, (0, http_js_1.fetchBounded)("".concat(baseUrl_1, "/api/assessment/worker-config"), {
                            headers: { Authorization: "Bearer ".concat(workerSecret) },
                            cache: "no-store",
                        }, { timeoutMs: workerConfigTimeoutMs, retries: 1 })];
                case 3:
                    response = _l.sent();
                    log("worker_config_fetch_result", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: metadata.supportId,
                        diagnostic: true,
                        ok: response.ok,
                        status: response.status,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    if (!!response.ok) return [3 /*break*/, 5];
                    return [4 /*yield*/, ((_c = ctx.agent) === null || _c === void 0 ? void 0 : _c.updateMetadata(JSON.stringify({
                            diagnosticComplete: true,
                            success: false,
                            code: "HTTP_".concat(response.status),
                        })))];
                case 4:
                    _l.sent();
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, response.json()];
                case 6:
                    runtime_1 = (_l.sent());
                    complete = Boolean(runtime_1.geminiApiKey && runtime_1.model);
                    return [4 /*yield*/, ((_d = ctx.agent) === null || _d === void 0 ? void 0 : _d.updateMetadata(JSON.stringify({
                            diagnosticComplete: true,
                            success: complete,
                            code: complete ? "READY" : "INCOMPLETE_CONFIG",
                        })))];
                case 7:
                    _l.sent();
                    if (complete)
                        log("application_diagnostic_ready", { jobId: ctx.job.id, model: runtime_1.model });
                    _l.label = 8;
                case 8: return [3 /*break*/, 11];
                case 9:
                    error_1 = _l.sent();
                    log("worker_config_fetch_result", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: metadata.supportId,
                        diagnostic: true,
                        ok: false,
                        code: error_1 instanceof Error ? error_1.message.slice(0, 120) : "UNKNOWN",
                        durationMs: Date.now() - entryStartedAt,
                    });
                    return [4 /*yield*/, ((_e = ctx.agent) === null || _e === void 0 ? void 0 : _e.updateMetadata(JSON.stringify({ diagnosticComplete: true, success: false, code: "NETWORK_ERROR" })))];
                case 10:
                    _l.sent();
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 14];
                case 12: return [4 /*yield*/, ((_f = ctx.agent) === null || _f === void 0 ? void 0 : _f.updateMetadata(JSON.stringify({ diagnosticComplete: true, success: true, code: "LIVEKIT_READY" })))];
                case 13:
                    _l.sent();
                    _l.label = 14;
                case 14:
                    log("diagnostic_ready", { jobId: ctx.job.id, supportId: metadata.supportId });
                    return [4 /*yield*/, ctx.waitForParticipant()];
                case 15:
                    _l.sent();
                    return [2 /*return*/];
                case 16:
                    if (!metadata.assessmentId || !metadata.sessionKey)
                        throw new Error("Assessment metadata is missing");
                    startedAt = Date.now();
                    supportId = metadata.supportId || crypto.randomUUID();
                    return [4 /*yield*/, ctx.connect()];
                case 17:
                    _l.sent();
                    log("ctx_connected", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: supportId,
                        diagnostic: false,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    return [4 /*yield*/, ((_g = ctx.agent) === null || _g === void 0 ? void 0 : _g.updateMetadata(JSON.stringify({ state: agentMetadataStates.initializing, occurredAt: Date.now() })))];
                case 18:
                    _l.sent();
                    baseUrl = appUrl();
                    telemetry = function (event, details) {
                        if (details === void 0) { details = {}; }
                        var payload = __assign({ eventId: crypto.randomUUID(), assessmentId: metadata.assessmentId, supportId: supportId, sessionKey: metadata.sessionKey, event: event }, details);
                        log(event, __assign({ jobId: ctx.job.id, room: ctx.room.name }, details));
                        void (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/worker-diagnostic"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: "Bearer ".concat(workerSecret) },
                            body: JSON.stringify(payload),
                        }, { timeoutMs: workerTelemetryTimeoutMs }).catch(function () { return log("telemetry_delivery_failed", { jobId: ctx.job.id, event: event }); });
                    };
                    telemetry("agent_initializing", { state: agentMetadataStates.initializing });
                    log("worker_bootstrap_fetch_start", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: supportId,
                        appUrl: baseUrl,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    return [4 /*yield*/, (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/worker-bootstrap"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(workerSecret),
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ assessmentId: metadata.assessmentId }),
                            cache: "no-store",
                        }, { timeoutMs: workerConfigTimeoutMs, retries: 1 })];
                case 19:
                    bootstrapResponse = _l.sent();
                    log("worker_bootstrap_fetch_result", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: supportId,
                        ok: bootstrapResponse.ok,
                        status: bootstrapResponse.status,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    if (!!bootstrapResponse.ok) return [3 /*break*/, 21];
                    return [4 /*yield*/, ((_h = ctx.agent) === null || _h === void 0 ? void 0 : _h.updateMetadata(JSON.stringify({
                            state: agentMetadataStates.configurationError,
                            code: "HTTP_".concat(bootstrapResponse.status),
                        })))];
                case 20:
                    _l.sent();
                    throw new Error("Worker bootstrap failed (".concat(bootstrapResponse.status, ")"));
                case 21: return [4 /*yield*/, bootstrapResponse.json()];
                case 22:
                    runtime = (_l.sent());
                    log("configuration_ready", { jobId: ctx.job.id, model: runtime.model });
                    prompt = runtime.prompt;
                    if (!!prompt) return [3 /*break*/, 24];
                    return [4 /*yield*/, ((_j = ctx.agent) === null || _j === void 0 ? void 0 : _j.updateMetadata(JSON.stringify({
                            state: agentMetadataStates.configurationError,
                            code: "PROMPT_MISSING",
                        })))];
                case 23:
                    _l.sent();
                    throw new Error("Worker bootstrap did not include a prompt");
                case 24:
                    log("prompt_ready", { jobId: ctx.job.id });
                    completionReason = "livekit-session-ended";
                    closeProgressRecorded = false;
                    finalizeAssessment = false;
                    recordThreshold = function (reason) {
                        return (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/progress"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: "Bearer ".concat(workerSecret) },
                            body: JSON.stringify({
                                assessmentId: metadata.assessmentId,
                                sessionKey: metadata.sessionKey,
                                eventId: crypto.randomUUID(),
                                locale: metadata.locale,
                                reason: reason,
                                elapsedSeconds: elapsedSeconds(startedAt),
                            }),
                        }, { timeoutMs: workerConfigTimeoutMs, retries: 1 });
                    };
                    recordCloseOnce = function (reason) { return __awaiter(void 0, void 0, void 0, function () {
                        var response, stateResponse, error_3;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (closeProgressRecorded)
                                        return [2 /*return*/];
                                    closeProgressRecorded = true;
                                    completionReason = reason;
                                    finalizeAssessment = true;
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, recordThreshold("close")];
                                case 2:
                                    response = _b.sent();
                                    if (!response.ok)
                                        log("close_progress_failed", { jobId: ctx.job.id, status: response.status });
                                    return [4 /*yield*/, (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/session-status"), {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: "Bearer ".concat(workerSecret),
                                            },
                                            body: JSON.stringify({
                                                assessmentId: metadata.assessmentId,
                                                sessionKey: metadata.sessionKey,
                                                completionReason: reason,
                                            }),
                                        }, { timeoutMs: workerConfigTimeoutMs, retries: 1 })];
                                case 3:
                                    stateResponse = _b.sent();
                                    if (!stateResponse.ok)
                                        throw new Error("Finalization state failed (".concat(stateResponse.status, ")"));
                                    return [4 /*yield*/, ((_a = ctx.agent) === null || _a === void 0 ? void 0 : _a.updateMetadata(JSON.stringify({
                                            state: agentMetadataStates.finalizing,
                                            ready: true,
                                            completionReason: reason,
                                            occurredAt: Date.now(),
                                        })))];
                                case 4:
                                    _b.sent();
                                    telemetry("finalization_started", { state: agentMetadataStates.finalizing, code: reason });
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_3 = _b.sent();
                                    closeProgressRecorded = false;
                                    finalizeAssessment = false;
                                    throw error_3;
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); };
                    updateAssessmentState = agents_1.llm.tool({
                        name: "update_assessment_state",
                        description: "Persist newly learned or corrected assessment facts after every substantive answer.",
                        parameters: zod_1.z.object({
                            reason: zod_1.z.enum(["answer", "correction", "time-threshold", "interruption", "close"]),
                            updates: zod_1.z.array(zod_1.z.object({
                                field: zod_1.z.string(),
                                value: zod_1.z.string(),
                                evidence: zod_1.z.string(),
                                status: zod_1.z.enum(["confirmed", "estimated", "inferred", "pending"]),
                                confidence: zod_1.z.number().min(0).max(1),
                            })),
                        }),
                        execute: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                            var toolStartedAt, eventId, response, result, error_4, code;
                            var reason = _b.reason, updates = _b.updates;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        toolStartedAt = Date.now();
                                        eventId = crypto.randomUUID();
                                        telemetry("tool_started", { state: "update_assessment_state" });
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 4, , 5]);
                                        return [4 /*yield*/, (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/progress"), {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    Authorization: "Bearer ".concat(workerSecret),
                                                },
                                                body: JSON.stringify({
                                                    assessmentId: metadata.assessmentId,
                                                    sessionKey: metadata.sessionKey,
                                                    eventId: eventId,
                                                    locale: metadata.locale,
                                                    reason: reason,
                                                    elapsedSeconds: elapsedSeconds(startedAt),
                                                    updates: updates,
                                                }),
                                            }, { timeoutMs: 5000, retries: 1 })];
                                    case 2:
                                        response = _c.sent();
                                        if (!response.ok)
                                            throw new Error("HTTP_".concat(response.status));
                                        return [4 /*yield*/, response.json()];
                                    case 3:
                                        result = (_c.sent());
                                        if (typeof result.nextInstruction !== "string")
                                            throw new Error("INVALID_RESPONSE");
                                        telemetry("tool_completed", {
                                            state: "update_assessment_state",
                                            durationMs: Date.now() - toolStartedAt,
                                        });
                                        return [2 /*return*/, result.nextInstruction];
                                    case 4:
                                        error_4 = _c.sent();
                                        code = (0, http_js_1.errorCode)(error_4) === "tool_timeout"
                                            ? "tool_timeout"
                                            : error_4 instanceof Error && /^HTTP_\d+$/.test(error_4.message)
                                                ? error_4.message.toLowerCase()
                                                : "tool_failed";
                                        telemetry("tool_failed", {
                                            state: "update_assessment_state",
                                            code: code,
                                            durationMs: Date.now() - toolStartedAt,
                                        });
                                        return [2 /*return*/, metadata.locale === "es"
                                                ? "No se pudo guardar este turno. No vuelvas a llamar esta herramienta ahora; reconoce brevemente la respuesta y continúa con la siguiente pregunta pendiente."
                                                : "This turn could not be saved. Do not call this tool again now; briefly acknowledge the answer and continue with the next missing question."];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); },
                    });
                    prepareAssessmentEnd = agents_1.llm.tool({
                        name: "prepare_assessment_end",
                        description: "Persist the terminal state before ending the interview. Call this once when the assessment is complete, the visitor asks to end, or the time limit is reached; then give a brief goodbye and call end_call.",
                        parameters: zod_1.z.object({
                            reason: zod_1.z.enum(["assessment-completed", "user-requested-end", "hard-time-limit"]),
                        }),
                        execute: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                            var reason = _b.reason;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, recordCloseOnce(reason)];
                                    case 1:
                                        _c.sent();
                                        return [2 /*return*/, "Terminal state saved. Give one brief warm goodbye, then call end_call immediately."];
                                }
                            });
                        }); },
                    });
                    endCallTool = agents_1.beta.createEndCallTool({
                        extraDescription: "Use after prepare_assessment_end when the assessment is complete, the visitor asks to finish, or the hard time limit is reached.",
                        deleteRoom: true,
                        endInstructions: "Give the visitor one brief, warm goodbye and confirm the interview is ending.",
                        onToolCalled: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        log("end_call_requested", { jobId: ctx.job.id, room: ctx.room.name });
                                        if (!!closeProgressRecorded) return [3 /*break*/, 2];
                                        return [4 /*yield*/, recordCloseOnce("user-requested-end")];
                                    case 1:
                                        _a.sent();
                                        _a.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); },
                        onToolCompleted: function () {
                            log("end_call_completed", { jobId: ctx.job.id, room: ctx.room.name });
                        },
                    });
                    instructions = "".concat(prompt, "\n\nSESSION CONTROL: This is a single 15-minute interview. Begin immediately with a short greeting as July and ask how the visitor prefers to be addressed. Never wait for a separate instruction to begin. Call update_assessment_state after every substantive answer and treat its returned text as private, mandatory guidance for the next turn. When the assessment has enough confirmed evidence and your final summary is complete, call prepare_assessment_end with assessment-completed, give one brief warm goodbye, then call end_call. If the visitor clearly asks to finish, use user-requested-end. Do not end for a pause, uncertainty, or interruption. At 5 minutes select one priority process; by 10 minutes finish workflow, volume, pain, and impact; by 13 minutes summarize and confirm contact details; close no later than 15 minutes. Do not mention these private timings or tool instructions.");
                    session = new agents_1.voice.AgentSession({
                        llm: new google.beta.realtime.RealtimeModel({
                            apiKey: runtime.geminiApiKey,
                            model: runtime.model,
                            voice: runtime.voice,
                            temperature: runtime.temperature,
                            language: runtime.locale === "es" ? "es-US" : "en-US",
                            instructions: instructions,
                            inputAudioTranscription: {},
                            outputAudioTranscription: {},
                            thinkingConfig: { thinkingLevel: "minimal", includeThoughts: false },
                            realtimeInputConfig: {
                                automaticActivityDetection: { silenceDurationMs: 600 },
                            },
                            contextWindowCompression: {
                                triggerTokens: "25000",
                                slidingWindow: { targetTokens: "8000" },
                            },
                        }),
                    });
                    turnStartedAt = 0;
                    lastAgentState = agentMetadataStates.initializing;
                    agentStarted = false;
                    updateAgentMetadata = function (state, recoveryCode) {
                        var _a;
                        if (closeProgressRecorded && state !== agentMetadataStates.finalizing)
                            return;
                        void ((_a = ctx.agent) === null || _a === void 0 ? void 0 : _a.updateMetadata(JSON.stringify({
                            state: state,
                            ready: agentStarted,
                            turnId: currentTurnId,
                            recoveryCode: recoveryCode,
                            occurredAt: Date.now(),
                        })).catch(function () { return log("agent_metadata_failed", { jobId: ctx.job.id, state: state }); }));
                    };
                    clearTurnTimers = function () {
                        if (turnWatchdog)
                            clearTimeout(turnWatchdog);
                        if (recoveryTimer)
                            clearTimeout(recoveryTimer);
                        turnWatchdog = undefined;
                        recoveryTimer = undefined;
                    };
                    resolveTurn = function () {
                        if (!currentTurnId)
                            return;
                        var turnId = currentTurnId;
                        telemetry("turn_response", { turnId: turnId, durationMs: Date.now() - turnStartedAt });
                        if (stalledTurnId === turnId) {
                            telemetry("turn_recovered", { turnId: turnId, durationMs: Date.now() - turnStartedAt });
                            stalledTurnId = undefined;
                        }
                        clearTurnTimers();
                        currentTurnId = undefined;
                    };
                    armTurnWatchdog = function (turnId, delayMs) {
                        if (delayMs === void 0) { delayMs = 12000; }
                        if (turnWatchdog)
                            clearTimeout(turnWatchdog);
                        turnWatchdog = setTimeout(function () {
                            if (currentTurnId !== turnId)
                                return;
                            stalledTurnId = turnId;
                            telemetry("turn_stalled", { turnId: turnId, state: lastAgentState, code: "model_stalled" });
                            updateAgentMetadata("recovery_required", "model_stalled");
                            try {
                                session.interrupt({ force: true });
                            }
                            catch (_a) {
                                // There may be no active speech handle even though the model stopped responding.
                            }
                            recoveryTimer = setTimeout(function () {
                                if (stalledTurnId !== turnId)
                                    return;
                                telemetry("recovery_required", {
                                    turnId: turnId,
                                    state: lastAgentState,
                                    code: "recovery_required",
                                });
                                updateAgentMetadata(agentMetadataStates.recoveryAvailable, "recovery_required");
                            }, 18000);
                        }, delayMs);
                    };
                    session.on(agents_1.voice.AgentSessionEventTypes.UserInputTranscribed, function (event) {
                        if (!event.isFinal)
                            return;
                        currentTurnId = crypto.randomUUID();
                        turnStartedAt = Date.now();
                        telemetry("turn_user_final", { turnId: currentTurnId });
                        if (lastAgentState === "speaking")
                            resolveTurn();
                        else
                            armTurnWatchdog(currentTurnId);
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.AgentStateChanged, function (event) {
                        lastAgentState = event.newState;
                        telemetry("agent_state", { state: event.newState, turnId: currentTurnId });
                        updateAgentMetadata(event.newState);
                        if (event.newState === "speaking")
                            resolveTurn();
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.UserStateChanged, function (event) {
                        telemetry("user_state", { state: event.newState, turnId: currentTurnId });
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.SpeechCreated, function (event) {
                        telemetry("speech_created", { state: event.source, turnId: currentTurnId });
                        resolveTurn();
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.FunctionToolsExecuted, function (event) {
                        for (var _i = 0, _a = event.functionCalls; _i < _a.length; _i++) {
                            var call = _a[_i];
                            telemetry("tool_completed", { state: call.name, turnId: currentTurnId });
                        }
                        if (currentTurnId)
                            armTurnWatchdog(currentTurnId);
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.MetricsCollected, function (event) {
                        telemetry("metrics_collected", {
                            state: String(event.metrics.type || "agent"),
                            turnId: currentTurnId,
                        });
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.Error, function (event) {
                        clearTurnTimers();
                        var recoverable = Boolean(event.error.recoverable);
                        telemetry("model_error", {
                            turnId: currentTurnId,
                            state: lastAgentState,
                            code: "model_error",
                            recoverable: recoverable,
                        });
                        if (!recoverable) {
                            finalizeAssessment = false;
                            completionReason = "model-error";
                            updateAgentMetadata(agentMetadataStates.recoveryAvailable, "model_error");
                        }
                    });
                    session.on(agents_1.voice.AgentSessionEventTypes.Close, function (event) {
                        clearTurnTimers();
                        var reason = String(event.reason || "session-closed");
                        if (!closeProgressRecorded) {
                            finalizeAssessment = false;
                            completionReason = reason;
                        }
                        telemetry("session_closed", {
                            state: lastAgentState,
                            code: event.error ? "model_error" : reason.slice(0, 80),
                            recoverable: event.error ? Boolean(event.error.recoverable) : undefined,
                        });
                    });
                    timers = [
                        setTimeout(function () {
                            void recordThreshold("time-threshold").catch(function (error) {
                                return log("threshold_failed", { jobId: ctx.job.id, code: (0, http_js_1.errorCode)(error) });
                            });
                        }, 300000),
                        setTimeout(function () {
                            void recordThreshold("time-threshold").catch(function (error) {
                                return log("threshold_failed", { jobId: ctx.job.id, code: (0, http_js_1.errorCode)(error) });
                            });
                        }, 600000),
                        setTimeout(function () {
                            void recordThreshold("time-threshold").catch(function (error) {
                                return log("threshold_failed", { jobId: ctx.job.id, code: (0, http_js_1.errorCode)(error) });
                            });
                        }, 780000),
                        setTimeout(function () {
                            void recordThreshold("time-threshold").catch(function (error) {
                                return log("threshold_failed", { jobId: ctx.job.id, code: (0, http_js_1.errorCode)(error) });
                            });
                        }, 870000),
                        setTimeout(function () {
                            void recordCloseOnce("hard-time-limit").finally(function () { return ctx.shutdown("hard-time-limit"); });
                        }, assessmentMaxDurationMs),
                    ];
                    ctx.addShutdownCallback(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var report, response;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    timers.forEach(clearTimeout);
                                    clearTurnTimers();
                                    report = agents_1.voice.sessionReportToJSON(ctx.makeSessionReport(session));
                                    return [4 /*yield*/, (0, http_js_1.fetchBounded)("".concat(baseUrl, "/api/assessment/provider-finalize"), {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: "Bearer ".concat(workerSecret),
                                            },
                                            body: JSON.stringify({
                                                assessmentId: metadata.assessmentId,
                                                sessionKey: metadata.sessionKey,
                                                provider: "livekit",
                                                transcript: JSON.stringify(report.chatHistory),
                                                sessionReport: report,
                                                durationSeconds: elapsedSeconds(startedAt),
                                                completionReason: completionReason,
                                                finalizeAssessment: finalizeAssessment,
                                            }),
                                        }, { timeoutMs: 10000, retries: 1 })];
                                case 1:
                                    response = _a.sent();
                                    if (!response.ok)
                                        throw new Error("Provider finalization failed (".concat(response.status, ")"));
                                    telemetry("finalization_completed", {
                                        state: "completed",
                                        code: completionReason,
                                        durationMs: Date.now() - startedAt,
                                    });
                                    log("session_finalized", { jobId: ctx.job.id, durationSeconds: elapsedSeconds(startedAt) });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    _l.label = 25;
                case 25:
                    _l.trys.push([25, 27, , 29]);
                    log("session_start_start", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: supportId,
                        model: runtime.model,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    return [4 /*yield*/, session.start({
                            room: ctx.room,
                            agent: new agents_1.voice.Agent({
                                instructions: instructions,
                                tools: [updateAssessmentState, prepareAssessmentEnd, endCallTool],
                            }),
                            record: { audio: false, transcript: false, traces: true, logs: true },
                        })];
                case 26:
                    _l.sent();
                    return [3 /*break*/, 29];
                case 27:
                    error_2 = _l.sent();
                    return [4 /*yield*/, ((_k = ctx.agent) === null || _k === void 0 ? void 0 : _k.updateMetadata(JSON.stringify({ state: agentMetadataStates.modelUnavailable, code: (0, http_js_1.errorCode)(error_2) })))];
                case 28:
                    _l.sent();
                    throw error_2;
                case 29:
                    agentStarted = true;
                    updateAgentMetadata(agentMetadataStates.ready);
                    telemetry("agent_ready", {
                        state: agentMetadataStates.ready,
                        durationMs: Date.now() - startedAt,
                    });
                    log("agent_ready", {
                        jobId: ctx.job.id,
                        room: ctx.room.name,
                        supportId: supportId,
                        model: runtime.model,
                        durationMs: Date.now() - entryStartedAt,
                    });
                    return [2 /*return*/];
            }
        });
    }); },
});
function elapsedSeconds(startedAt) {
    return Math.min(900, Math.floor((Date.now() - startedAt) / 1000));
}
exports.default = agent;
agents_1.cli.runApp(new agents_1.ServerOptions({
    agent: (0, node_url_1.fileURLToPath)(import.meta.url),
    agentName: "quisqueyatech-assessment",
    numIdleProcesses: 1,
}));
