"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
class CacheService {
    constructor(ttlSeconds = 3600) {
        this.cache = new node_cache_1.default({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false
        });
    }
    async get(key, storeFunction) {
        const value = this.cache.get(key);
        if (value) {
            return value;
        }
        const result = await storeFunction();
        this.cache.set(key, result);
        return result;
    }
    del(keys) {
        this.cache.del(keys);
    }
    flush() {
        this.cache.flushAll();
    }
}
exports.cacheService = new CacheService(21600); // 6 horas por defecto
