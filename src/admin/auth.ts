import type { Context } from "hono";
import { getAdminConfig } from "./store";
import type { EnvBindings } from "@/types/provider";

// Auth utilities. AUTH_TOKEN is mandatory — no open/public mode.

export type AuthPrincipal =
  | { kind: "master"; id: "master" }
  | { kind: "virtual"; id: string; name: string; allowedModels: string[]; rpmLimit?: number };

type AnyCtx = Context<{ Bindings: EnvBindings; Variables: any }>;

export function extractBearer(c: AnyCtx): string {
  const h = c.req.header("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

// B3: Timing-safe comparison using crypto.subtle (Workers runtime)
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  // Hash both to fixed-length to avoid length leak, then compare
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", aBytes),
    crypto.subtle.digest("SHA-256", bBytes),
  ]);
  const aArr = new Uint8Array(aHash);
  const bArr = new Uint8Array(bHash);
  if (aArr.length !== bArr.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}

export async function resolvePrincipal(
  c: AnyCtx,
  env: EnvBindings,
  token: string
): Promise<AuthPrincipal | null> {
  const master = env.AUTH_TOKEN;
  if (!master) return null; // fail-closed

  // Check master token (timing-safe)
  if (token && await timingSafeEqual(token, master)) {
    return { kind: "master", id: "master" };
  }

  // Check virtual keys
  if (token.startsWith("sk-vr-")) {
    const cfg = await getAdminConfig(env);
    const vk = cfg.virtualKeys?.[token];
    if (vk && vk.enabled !== false) {
      return {
        kind: "virtual",
        id: vk.id,
        name: vk.name,
        allowedModels: vk.allowedModels || [],
        rpmLimit: vk.rpmLimit,
      };
    }
  }

  return null;
}

export function serverMisconfigured(): Response {
  return Response.json(
    { error: { message: "Servico indisponivel — AUTH_TOKEN nao configurado", type: "server_error" } },
    { status: 503 }
  );
}

export function unauthorized(): Response {
  return Response.json(
    { error: { message: "Nao autorizado — Bearer token invalido ou ausente", type: "unauthorized" } },
    { status: 401 }
  );
}

export function forbidden(reason = "Acesso negado"): Response {
  return Response.json(
    { error: { message: reason, type: "forbidden" } },
    { status: 403 }
  );
}

export function isModelAllowed(principal: AuthPrincipal, model: string): boolean {
  if (principal.kind === "master") return true;
  if (!principal.allowedModels || principal.allowedModels.length === 0) return true;
  return principal.allowedModels.some((pattern) => {
    if (pattern === "*") return true;
    if (pattern.endsWith("/*")) {
      return model.startsWith(pattern.slice(0, -1));
    }
    return model === pattern;
  });
}

export function maskSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

/**
 * Record virtual key usage. 
 * NOTE: Moved to no-op to avoid mutateAdminConfig race conditions on every request.
 * Usage counters should be tracked via Analytics Engine or Durable Objects, not KV admin config.
 */
export function recordVirtualKeyUse(
  _env: EnvBindings,
  _keyId: string,
  _ctx?: ExecutionContext
): void {
  // Intentional no-op — see audit report Bug #4 / recommendation
  // Future: Analytics Engine or DO-based counter
}
