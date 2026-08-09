"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOpenTelemetry = startOpenTelemetry;
var api_1 = require("@opentelemetry/api");
var auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
var exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
var exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
var exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
var instrumentation_console_1 = require("@opentelemetry/instrumentation-console");
var resources_1 = require("@opentelemetry/resources");
var sdk_logs_1 = require("@opentelemetry/sdk-logs");
var sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
var sdk_node_1 = require("@opentelemetry/sdk-node");
var semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
var sdk = null;
function startOpenTelemetry() {
    var _a;
    var _this = this;
    if (sdk || !isOpenTelemetryEnabled())
        return sdk;
    configureDiagnostics();
    var serviceName = process.env.OTEL_SERVICE_NAME || "quisqueyatech-livekit-agent";
    var logRecordProcessors = shouldExport("OTEL_LOGS_EXPORTER")
        ? [new sdk_logs_1.BatchLogRecordProcessor({ exporter: new exporter_logs_otlp_http_1.OTLPLogExporter() })]
        : undefined;
    sdk = new sdk_node_1.NodeSDK({
        serviceName: serviceName,
        resource: (0, resources_1.defaultResource)().merge((0, resources_1.resourceFromAttributes)((_a = {},
            _a[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName,
            _a[semantic_conventions_1.ATTR_SERVICE_VERSION] = process.env.npm_package_version || "0.1.0",
            _a["deployment.environment"] = process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV,
            _a))),
        traceExporter: shouldExport("OTEL_TRACES_EXPORTER") ? new exporter_trace_otlp_http_1.OTLPTraceExporter() : undefined,
        metricReader: shouldExport("OTEL_METRICS_EXPORTER")
            ? new sdk_metrics_1.PeriodicExportingMetricReader({ exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter() })
            : undefined,
        logRecordProcessors: logRecordProcessors,
        instrumentations: __spreadArray([
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                "@opentelemetry/instrumentation-fs": { enabled: false },
            })
        ], (logRecordProcessors ? [new instrumentation_console_1.ConsoleInstrumentation()] : []), true),
    });
    sdk.start();
    var shutdown = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (sdk === null || sdk === void 0 ? void 0 : sdk.shutdown())];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("[otel] shutdown failed", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
    return sdk;
}
function isOpenTelemetryEnabled() {
    var _a;
    var value = (_a = process.env.OTEL_ENABLED) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (!value)
        return process.env.OTEL_SDK_DISABLED !== "true";
    if (["0", "false", "no", "off"].includes(value))
        return false;
    if (["1", "true", "yes", "on"].includes(value))
        return true;
    return process.env.OTEL_SDK_DISABLED !== "true";
}
function shouldExport(variableName) {
    var _a;
    return ((_a = process.env[variableName]) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) !== "none";
}
function configureDiagnostics() {
    var _a;
    var configured = (_a = process.env.OTEL_LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.trim().toUpperCase();
    if (!configured)
        return;
    var level = api_1.DiagLogLevel[configured];
    if (typeof level === "number")
        api_1.diag.setLogger(new api_1.DiagConsoleLogger(), level);
}
