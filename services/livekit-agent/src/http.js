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
exports.retryableStatus = retryableStatus;
exports.fetchBounded = fetchBounded;
exports.errorCode = errorCode;
function retryableStatus(status) {
    return status === 408 || status === 429 || status >= 500;
}
function fetchBounded(input_1, init_1, _a) {
    return __awaiter(this, arguments, void 0, function (input, init, _b) {
        var lastError, _loop_1, attempt, state_1;
        var timeoutMs = _b.timeoutMs, _c = _b.retries, retries = _c === void 0 ? 0 : _c, _d = _b.fetcher, fetcher = _d === void 0 ? fetch : _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _loop_1 = function (attempt) {
                        var controller, timer, response, error_1;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    controller = new AbortController();
                                    timer = setTimeout(function () { return controller.abort(); }, timeoutMs);
                                    _f.label = 1;
                                case 1:
                                    _f.trys.push([1, 3, 4, 5]);
                                    return [4 /*yield*/, fetcher(input, __assign(__assign({}, init), { signal: controller.signal }))];
                                case 2:
                                    response = _f.sent();
                                    if (attempt < retries && retryableStatus(response.status))
                                        return [2 /*return*/, "continue"];
                                    return [2 /*return*/, { value: response }];
                                case 3:
                                    error_1 = _f.sent();
                                    lastError = error_1;
                                    if (attempt >= retries)
                                        throw error_1;
                                    return [3 /*break*/, 5];
                                case 4:
                                    clearTimeout(timer);
                                    return [7 /*endfinally*/];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _e.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _e.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _e.label = 3;
                case 3:
                    attempt += 1;
                    return [3 /*break*/, 1];
                case 4: throw lastError instanceof Error ? lastError : new Error("Request failed");
            }
        });
    });
}
function errorCode(error) {
    if (error instanceof Error && error.name === "AbortError")
        return "tool_timeout";
    return "network_error";
}
