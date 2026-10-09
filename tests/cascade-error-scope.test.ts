import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyUpstreamFailure, secondsUntilPacificMidnight } from "@/routing/errorScope";
import { dispatchWithCascade } from "@/routing/cascade";
import { __resetKeyPoolStateForTests } from "@/routing/keyPool";

describe("classifyUpstreamFailure", () => {
  it("429 de cota diária vira cooldown do par (chave, modelo) até a meia-noite PT", () => {
    const at = Date.parse("2026-10-09T19:00:00Z"); // 12:00 PDT
    const f = classifyUpstreamFailure(429, '{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}', at);
    expect(f.scope).toBe("quota");
    expect(f.cooldownSec).toBe(12 * 3600);
  });
  it("429 por minuto vira cooldown curto do par (chave, modelo)", () => {
    const f = classifyUpstreamFailure(429, "Resource has been exhausted (requests per minute)");
    expect(f).toMatchObject({ scope: "quota", cooldownSec: 60 });
  });
  it("401/402/403 punem só a chave", () => {
    for (const s of [401, 402, 403]) expect(classifyUpstreamFailure(s).scope).toBe("key");
  });
  it("404 é do par chave+modelo", () => {
    expect(classifyUpstreamFailure(404, "no longer available to new users").scope).toBe("model");
  });
  it("timeout/5xx são transitórios; 400 é da requisição", () => {
    for (const s of [408, 500, 502, 503, 504]) expect(classifyUpstreamFailure(s).scope).toBe("transient");
    expect(classifyUpstreamFailure(400).scope).toBe("request");
  });
  it("secondsUntilPacificMidnight", () => {
    expect(secondsUntilPacificMidnight(Date.parse("2026-10-09T07:00:00Z"))).toBe(86400); // 00:00 PDT
    expect(secondsUntilPacificMidnight(Date.parse("2026-10-09T06:59:30Z"))).toBe(60);    // mínimo 60s
  });
});

// ---------------------------------------------------------------------------
// Cascata real com fetch simulado: provedor gemini com 2 chaves (env, sem KV).
// ---------------------------------------------------------------------------
type Behaviour = (key: string, signal?: AbortSignal) => Promise<Response>;

const ok = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "OK" }] }, finishReason: "STOP" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
const err = (status: number, body = "{}") => new Response(body, { status, headers: { "Content-Type": "application/json" } });

function mockGemini(behaviour: Behaviour) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const key = new URL(url).searchParams.get("key") || "";
    calls.push(key);
    return behaviour(key, init?.signal ?? undefined);
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

const env = (extra: Record<string, string> = {}) => ({ GEMINI_API_KEYS: "AIzaKEY1,AIzaKEY2", ...extra }) as any;
const req = () => ({ model: "gemini/gemini-3.8-flash", messages: [{ role: "user" as const, content: "oi" }] });

describe("dispatchWithCascade — escopo do erro", () => {
  beforeEach(() => __resetKeyPoolStateForTests());
  afterEach(() => vi.unstubAllGlobals());

  it("cota diária na chave 1: tenta a chave 2 na hora e a 1 fica fora do rodízio", async () => {
    const calls = mockGemini(async (key) => key === "AIzaKEY1" ? err(429, '{"error":{"message":"Quota exceeded: GenerateRequestsPerDayPerProjectPerModel"}}') : ok());
    const r1 = await dispatchWithCascade(req(), env());
    expect(r1.status).toBe(200);
    expect(calls).toEqual(["AIzaKEY1", "AIzaKEY2"]);

    calls.length = 0;
    const r2 = await dispatchWithCascade(req(), env());
    expect(r2.status).toBe(200);
    expect(calls).toEqual(["AIzaKEY2"]); // a chave esgotada não é mais tentada para este modelo
  });

  it("cota de um modelo na chave 1 NÃO tira a chave 1 de outro modelo", async () => {
    const calls: string[] = [];
    const fn = vi.fn(async (url: string, init?: RequestInit) => {
      const key = new URL(url).searchParams.get("key") || "";
      const model = url.match(/models\/([^:]+):/)?.[1] ?? "";
      calls.push(`${model}@${key}`);
      if (model.includes("3.8") && key === "AIzaKEY1") return err(429, '{"error":{"message":"Quota exceeded: GenerateRequestsPerDayPerProjectPerModel"}}');
      return ok();
    });
    vi.stubGlobal("fetch", fn);

    await dispatchWithCascade(req(), env()); // 3.8: chave 1 esgota, cai na chave 2
    calls.length = 0;
    const r = await dispatchWithCascade({ ...req(), model: "gemini/gemini-2.5-flash" }, env());
    expect(r.status).toBe(200);
    expect(calls[0]).toMatch(/gemini-2\.5-flash@AIzaKEY1$/); // a chave 1 segue disponível para outro modelo
  });

  it("404 de modelo bloqueia só o par (chave 1, modelo) e a chave 2 atende", async () => {
    const calls = mockGemini(async (key) => key === "AIzaKEY1" ? err(404, '{"error":{"message":"no longer available to new users"}}') : ok());
    expect((await dispatchWithCascade(req(), env())).status).toBe(200);
    expect(calls).toEqual(["AIzaKEY1", "AIzaKEY2"]);
    calls.length = 0;
    expect((await dispatchWithCascade(req(), env())).status).toBe(200);
    expect(calls).toEqual(["AIzaKEY2"]);
  });

  it("503 transitório não repete o mesmo candidato com outra chave: vai direto adiante", async () => {
    const calls = mockGemini(async () => err(503, '{"error":{"message":"high demand"}}'));
    const r = await dispatchWithCascade(req(), env());
    expect(r.status).toBe(502); // único candidato: cascata esgotada
    expect(calls).toHaveLength(1);
  });

  it("timeout cancela o fetch pendurado (signal abortado)", async () => {
    let seen: AbortSignal | undefined;
    mockGemini((_key, signal) => {
      seen = signal;
      return new Promise<Response>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    });
    const r = await dispatchWithCascade(req(), env({ CASCADE_TIMEOUT_MS: "5000" }));
    expect(r.status).toBe(502);
    expect(seen?.aborted).toBe(true);
  }, 15000);
});
