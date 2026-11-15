import { beforeEach, describe, expect, it } from "vitest";
import app from "@/index";
import { invalidateCache, type AdminConfig, type VirtualApiKey } from "@/admin/store";
import type { EnvBindings } from "@/types/provider";

interface MockKvOptions {
  authToken?: string;
  virtualKeys?: Record<string, VirtualApiKey>;
}

function createTestEnv(
  kvOptions: MockKvOptions | null,
  envAuthToken?: string
): { env: EnvBindings; kvStore: Record<string, string> } {
  const kvStore: Record<string, string> = {};

  if (kvOptions !== null) {
    const initialConfig: Partial<AdminConfig> = {
      version: 3,
      _seq: 1,
      _deletedDefaultCombos: [],
      providerStates: {},
      customProviders: {},
      modelStates: {},
      customModels: {},
      removedModels: {},
      searchConfig: { activeProvider: "auto" },
      virtualKeys: kvOptions.virtualKeys ?? {},
      combos: {},
      ...(kvOptions.authToken !== undefined ? { authToken: kvOptions.authToken } : {}),
    };
    kvStore["admin:config"] = JSON.stringify(initialConfig);
  }

  const env: EnvBindings = {
    ...(envAuthToken !== undefined ? { AUTH_TOKEN: envAuthToken } : {}),
    OMNI_KEYS: {
      get: async (key: string) => kvStore[key] ?? null,
      put: async (key: string, value: string) => {
        kvStore[key] = value;
      },
      delete: async (key: string) => {
        delete kvStore[key];
      },
    } as unknown as KVNamespace,
    OMNI_CACHE: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
    } as unknown as KVNamespace,
  };

  return { env, kvStore };
}

const ACTIVE_VIRTUAL_KEY: VirtualApiKey = {
  id: "sk-vr-testvirtualkey0000000001",
  name: "Test Client Virtual Key",
  createdAt: "2026-09-17T00:00:00.000Z",
  allowedModels: ["*"],
  totalRequests: 0,
  enabled: true,
};

const DISABLED_VIRTUAL_KEY: VirtualApiKey = {
  id: "sk-vr-disabledvirtualkey000002",
  name: "Disabled Virtual Key",
  createdAt: "2026-09-17T00:00:00.000Z",
  allowedModels: ["*"],
  totalRequests: 0,
  enabled: false,
};

describe("Auth Precedence & Fail-Closed Security (KV vs Worker env.AUTH_TOKEN)", () => {
  beforeEach(() => {
    invalidateCache();
  });

  // ---------------------------------------------------------------------------
  // Scenario (a): KV admin:config.authToken populated
  // ---------------------------------------------------------------------------
  describe("Scenario (a): KV admin:config.authToken populated", () => {
    it("accepts KV authToken and rejects fallback Worker env.AUTH_TOKEN on both /api/admin/* and /v1/*", async () => {
      const { env } = createTestEnv(
        {
          authToken: "kv-master-token-alpha",
          virtualKeys: { [ACTIVE_VIRTUAL_KEY.id]: ACTIVE_VIRTUAL_KEY },
        },
        "worker-env-token-old"
      );

      // 1. KV token succeeds on Admin API
      const adminOk = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer kv-master-token-alpha" } },
        env
      );
      expect(adminOk.status).toBe(200);
      const adminBody = (await adminOk.json()) as { ok: boolean; hasCustomToken: boolean; preview: string };
      expect(adminBody.ok).toBe(true);
      expect(adminBody.hasCustomToken).toBe(true);
      expect(adminBody.preview).toBe("kv-m****lpha");

      // 2. KV token succeeds on /v1/models
      const v1Ok = await app.request(
        "/v1/models",
        { headers: { Authorization: "Bearer kv-master-token-alpha" } },
        env
      );
      expect(v1Ok.status).toBe(200);

      // 3. Old Worker env.AUTH_TOKEN is rejected (401) when KV authToken is set
      const adminOldRejected = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer worker-env-token-old" } },
        env
      );
      expect(adminOldRejected.status).toBe(401);

      const v1OldRejected = await app.request(
        "/v1/models",
        { headers: { Authorization: "Bearer worker-env-token-old" } },
        env
      );
      expect(v1OldRejected.status).toBe(401);
    });

    it("works when Worker env.AUTH_TOKEN is completely unset (wrangler.toml default removed)", async () => {
      const { env } = createTestEnv(
        {
          authToken: "kv-only-master-secret",
          virtualKeys: {
            [ACTIVE_VIRTUAL_KEY.id]: ACTIVE_VIRTUAL_KEY,
            [DISABLED_VIRTUAL_KEY.id]: DISABLED_VIRTUAL_KEY,
          },
        },
        undefined
      );

      // Master KV token works on /api/admin/config
      const adminRes = await app.request(
        "/api/admin/config",
        { headers: { Authorization: "Bearer kv-only-master-secret" } },
        env
      );
      expect(adminRes.status).toBe(200);

      // Predictable "admin" token is rejected
      const defaultAdminRes = await app.request(
        "/api/admin/config",
        { headers: { Authorization: "Bearer admin" } },
        env
      );
      expect(defaultAdminRes.status).toBe(401);

      // Active virtual key works on /v1/models but is rejected on /api/admin/*
      const vkV1Res = await app.request(
        "/v1/models",
        { headers: { Authorization: `Bearer ${ACTIVE_VIRTUAL_KEY.id}` } },
        env
      );
      expect(vkV1Res.status).toBe(200);

      const vkAdminRes = await app.request(
        "/api/admin/config",
        { headers: { Authorization: `Bearer ${ACTIVE_VIRTUAL_KEY.id}` } },
        env
      );
      expect(vkAdminRes.status).toBe(401);

      // Disabled virtual key is rejected on /v1/models
      const disabledVkRes = await app.request(
        "/v1/models",
        { headers: { Authorization: `Bearer ${DISABLED_VIRTUAL_KEY.id}` } },
        env
      );
      expect(disabledVkRes.status).toBe(401);
    });

    it("rotates KV authToken via PUT /api/admin/settings/auth-token and immediately rejects the previous KV token", async () => {
      const { env } = createTestEnv({ authToken: "kv-token-v1-initial" }, "worker-fallback-token");

      // Rotate from v1 to v2
      const putRes = await app.request(
        "/api/admin/settings/auth-token",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer kv-token-v1-initial",
          },
          body: JSON.stringify({ token: "kv-token-v2-rotated" }),
        },
        env
      );
      expect(putRes.status).toBe(200);

      // Old KV token (v1) is immediately rejected
      const oldKvRes = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer kv-token-v1-initial" } },
        env
      );
      expect(oldKvRes.status).toBe(401);

      // Worker fallback token is still rejected
      const envFallbackRes = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer worker-fallback-token" } },
        env
      );
      expect(envFallbackRes.status).toBe(401);

      // New KV token (v2) succeeds
      const newKvRes = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer kv-token-v2-rotated" } },
        env
      );
      expect(newKvRes.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario (b): Only Worker env.AUTH_TOKEN set (KV authToken empty/unset)
  // ---------------------------------------------------------------------------
  describe("Scenario (b): Only Worker env.AUTH_TOKEN set (KV authToken unset or whitespace)", () => {
    it("accepts Worker env.AUTH_TOKEN when KV authToken is unset, and enforces virtual key boundaries", async () => {
      const { env } = createTestEnv(
        {
          authToken: undefined,
          virtualKeys: {
            [ACTIVE_VIRTUAL_KEY.id]: ACTIVE_VIRTUAL_KEY,
            [DISABLED_VIRTUAL_KEY.id]: DISABLED_VIRTUAL_KEY,
          },
        },
        "worker-secret-only-999"
      );

      // Worker env.AUTH_TOKEN succeeds on Admin API and /v1/models
      const adminOk = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer worker-secret-only-999" } },
        env
      );
      expect(adminOk.status).toBe(200);
      const body = (await adminOk.json()) as { hasCustomToken: boolean; preview: string | null };
      expect(body.hasCustomToken).toBe(false);
      expect(body.preview).toBeNull();

      const v1Ok = await app.request(
        "/v1/models",
        { headers: { Authorization: "Bearer worker-secret-only-999" } },
        env
      );
      expect(v1Ok.status).toBe(200);

      // Legacy "admin" token is rejected
      const legacyAdmin = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer admin" } },
        env
      );
      expect(legacyAdmin.status).toBe(401);

      // Active virtual key works on /v1/models and fails on /api/admin/*
      const vkV1 = await app.request(
        "/v1/models",
        { headers: { Authorization: `Bearer ${ACTIVE_VIRTUAL_KEY.id}` } },
        env
      );
      expect(vkV1.status).toBe(200);

      const vkAdmin = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: `Bearer ${ACTIVE_VIRTUAL_KEY.id}` } },
        env
      );
      expect(vkAdmin.status).toBe(401);
    });

    it("falls back to Worker env.AUTH_TOKEN when KV authToken is whitespace-only or deleted via DELETE /api/admin/settings/auth-token", async () => {
      const { env } = createTestEnv({ authToken: "temporary-kv-token" }, "worker-env-fallback-777");

      // Delete the custom KV token
      const delRes = await app.request(
        "/api/admin/settings/auth-token",
        {
          method: "DELETE",
          headers: { Authorization: "Bearer temporary-kv-token" },
        },
        env
      );
      expect(delRes.status).toBe(200);

      // Deleted KV token is now rejected
      const deletedKvCheck = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer temporary-kv-token" } },
        env
      );
      expect(deletedKvCheck.status).toBe(401);

      // Worker env.AUTH_TOKEN now works
      const workerFallbackCheck = await app.request(
        "/api/admin/settings/auth-token",
        { headers: { Authorization: "Bearer worker-env-fallback-777" } },
        env
      );
      expect(workerFallbackCheck.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario (c): Neither KV authToken nor Worker env.AUTH_TOKEN configured
  // ---------------------------------------------------------------------------
  describe("Scenario (c): Neither KV authToken nor Worker env.AUTH_TOKEN configured (Fail-Closed)", () => {
    it("fails closed with 401 on all protected routes (including virtual keys) when no master token is configured", async () => {
      const { env } = createTestEnv(
        {
          authToken: undefined,
          virtualKeys: { [ACTIVE_VIRTUAL_KEY.id]: ACTIVE_VIRTUAL_KEY },
        },
        undefined
      );

      // Missing Authorization header -> 401
      const noHeaderAdmin = await app.request("/api/admin/config", {}, env);
      expect(noHeaderAdmin.status).toBe(401);

      const noHeaderV1 = await app.request("/v1/models", {}, env);
      expect(noHeaderV1.status).toBe(401);

      // Default "admin" token -> 401
      const defaultAdmin = await app.request(
        "/api/admin/config",
        { headers: { Authorization: "Bearer admin" } },
        env
      );
      expect(defaultAdmin.status).toBe(401);

      // OAuth authorize / import routes -> 401
      const oauthAuth = await app.request(
        "/api/oauth/antigravity/authorize",
        { headers: { Authorization: "Bearer admin" } },
        env
      );
      expect(oauthAuth.status).toBe(401);

      // Virtual key on /v1/models -> 401 (gateway is fail-closed when master AUTH_TOKEN is unconfigured)
      const vkWhenUnconfigured = await app.request(
        "/v1/models",
        { headers: { Authorization: `Bearer ${ACTIVE_VIRTUAL_KEY.id}` } },
        env
      );
      expect(vkWhenUnconfigured.status).toBe(401);

      // Public health check still returns 200 OK
      const healthRes = await app.request("/health", {}, env);
      expect(healthRes.status).toBe(200);
    });
  });
});
