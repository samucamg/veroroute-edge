import type { Context } from "hono";
import { getAdminConfig, mutateAdminConfig } from "./store";
import type { EnvBindings } from "@/types/provider";

// Auth utilities. AUTH_TOKEN is mandatory — no open/public mode.

export type AuthPrincipal =
  | { kind: "master"; id: "master" }
  | { kind: "virtual"; id: string; name: string; allowedModels: string[]; rpmLimit?: number };

// Use a generic Env to accept any Hono context that has at least EnvBindings.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCtx = Context<{ Bindings: EnvBindings; Variables: any }>;

export function extractBearer(c: AnyCtx): string {
  const h = c.req.header("Authorization") ?? "";
  return h.replace(/^Bearer\s+/i, "").trim();
}

export async function resolvePrincipal(c: AnyCtx, token: string): Promise<AuthPrincipal | null> {
  const master = c.env.AUTH_TOKEN;
  if (!master) return null;
  if (token && token === master) return { kind: "master", id: "master" };
  if (token && token.startsWith("sk-vr-")) {
    const cfg = await getAdminConfig(c.env);
    const v = cfg.virtualKeys?.[token];
    if (v && v.enabled)
      return { kind: "virtual", id: token, name: v.name, allowedModels: v.allowedModels ?? ["*"], rpmLimit: v.rpmLimit };
  }
  return null;
}

export function serverMisconfigured(): Response {
  return new Response(
    JSON.stringify({ error: { message: "AUTH_TOKEN nao configurado. Defina o secret: wrangler secret put AUTH_TOKEN", type: "server_misconfigured" } }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

export function unauthorized(msg = "Nao autorizado — Bearer token invalido ou ausente"): Response {
  return new Response(JSON.stringify({ error: { message: msg, type: "unauthorized" } }), {
    status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" },
  });
}

export function forbidden(model: string): Response {
  return new Response(
    JSON.stringify({ error: { message: "Modelo " + model + " nao permitido para esta chave.", type: "forbidden" } }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export function recordVirtualKeyUse(
  env: EnvBindings,
  waitUntil: (p: Promise<unknown>) => void,
  principal: AuthPrincipal
): void {
  if (principal.kind !== "virtual") return;
  const id = principal.id;
  waitUntil(
    mutateAdminConfig(env, (cfg) => {
      const v = cfg.virtualKeys?.[id];
      if (v) {
        v.totalRequests = (v.totalRequests ?? 0) + 1;
        v.lastUsedAt = new Date().toISOString();
      }
    })
  );
}

export function isModelAllowed(principal: AuthPrincipal, model: string): boolean {
  if (principal.kind === "master") return true;
  const al = principal.allowedModels;
  if (!al || al.length === 0 || al.includes("*")) return true;
  for (const pat of al) {
    if (pat === model) return true;
    if (pat.endsWith("/*") && model.startsWith(pat.slice(0, -1))) return true;
    if (pat.endsWith("*") && !pat.endsWith("/*") && model.startsWith(pat.slice(0, -1))) return true;
  }
  return false;
}

export function maskSecret(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v);
  if (s.length <= 8) return "***";
  return s.slice(0, 4) + "..." + s.slice(-4);
}