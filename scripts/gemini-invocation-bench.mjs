// Isola QUAL parte da chamada ao Gemini (AI Studio) causa a lentidão.
// Uso: GEMINI_KEY=sua_chave node scripts/gemini-invocation-bench.mjs
//      MODELS=gemini-3.8-flash GEMINI_KEY=... node scripts/...   (um modelo só)
// Suporta chave AIza (API nativa) e AQ. (camada OpenAI-compat). A chave nunca é impressa.
// Cada chamada tem limite de 60s; cada caso roda 2x, em sequência.
const key = (process.env.GEMINI_KEY || "").trim();
if (!key) { console.log("Defina GEMINI_KEY"); process.exit(1); }
const isAQ = key.startsWith("AQ.");
const base = "https://generativelanguage.googleapis.com/v1beta";
const MODELS = (process.env.MODELS || "gemini-3.8-flash,gemini-flash-latest").split(",");
const LIMIT_MS = 60000;
console.log("tipo de chave:", isAQ ? "AQ (camada OpenAI-compat)" : "AIza (API nativa)");

async function timed(label, model, url, init) {
  const t = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(LIMIT_MS) });
    const headers = Date.now() - t;
    const raw = await r.text();
    let j = {}; try { j = JSON.parse(raw); } catch {}
    if (Array.isArray(j)) j = j[0] || {};
    const u = j.usageMetadata || j.usage || {};
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? j.choices?.[0]?.message?.content ?? "";
    console.log([model, label.padEnd(40), r.status, "headers=" + headers + "ms", "total=" + (Date.now() - t) + "ms",
      "thoughts=" + (u.thoughtsTokenCount ?? u.completion_tokens_details?.reasoning_tokens ?? 0),
      "finish=" + (j.candidates?.[0]?.finishReason ?? j.choices?.[0]?.finish_reason ?? "-"),
      JSON.stringify(text).slice(0, 16), r.ok ? "" : raw.slice(0, 90).replace(/\s+/g, " ")].join(" | "));
  } catch (e) { console.log([model, label.padEnd(40), "ABORTADO/ERRO", String(e.name || e).slice(0, 40), (Date.now() - t) + "ms"].join(" | ")); }
}

// Nativo: corpo Gemini. Compat: corpo OpenAI. Mesmos parâmetros nos dois.
function call(model, { cfg = {}, thinking, hdrKey = false }) {
  if (isAQ) {
    const body = { model, messages: [{ role: "user", content: "Respond with OK" }], ...("max" in cfg ? { max_tokens: cfg.max } : {}),
      ...("temperature" in cfg ? { temperature: cfg.temperature } : {}), ...("topP" in cfg ? { top_p: cfg.topP } : {}), ...(thinking ? { reasoning_effort: thinking } : {}) };
    return [`${base}/openai/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify(body) }];
  }
  const generationConfig = { ...("max" in cfg ? { maxOutputTokens: cfg.max } : {}), ...("temperature" in cfg ? { temperature: cfg.temperature } : {}),
    ...("topP" in cfg ? { topP: cfg.topP } : {}), ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}) };
  const body = { contents: [{ role: "user", parts: [{ text: "Respond with OK" }] }], ...(Object.keys(generationConfig).length ? { generationConfig } : {}) };
  const url = `${base}/models/${model}:generateContent` + (hdrKey ? "" : `?key=${encodeURIComponent(key)}`);
  return [url, { method: "POST", headers: { "Content-Type": "application/json", ...(hdrKey ? { "x-goog-api-key": key } : {}) }, body: JSON.stringify(body) }];
}

for (const model of MODELS) {
  console.log("\n=== " + model + " ===");
  // 0) Rede pura, sem inferência: GET de metadados do modelo.
  const metaUrl = isAQ ? `${base}/openai/models/${model}` : `${base}/models/${model}?key=${encodeURIComponent(key)}`;
  const metaInit = isAQ ? { method: "GET", headers: { Authorization: "Bearer " + key } } : { method: "GET" };
  for (let i = 1; i <= 2; i++) await timed("0 rede: GET metadados #" + i, model, metaUrl, metaInit);
  const R = { temperature: 0, topP: 0.95, max: 5 }; // = o que o roteador envia
  const cases = [
    ["1 corpo mínimo", {}],
    ["2 + max=5", { cfg: { max: 5 } }],
    ["3 = roteador (temp0, topP.95, max5)", { cfg: R }],
    ["4 = roteador, max=256", { cfg: { ...R, max: 256 } }],
    ["5 = roteador + thinking=low", { cfg: R, thinking: "low" }],
    ["6 mínimo + thinking=low, max=256", { cfg: { max: 256 }, thinking: "low" }],
  ];
  if (!isAQ) cases.splice(4, 0, ["4b = roteador, chave no header", { cfg: R, hdrKey: true }]);
  // CASES=1,3,5 roda só esses casos; RUNS=1 faz uma chamada por caso (padrão 2).
  const only = (process.env.CASES || "").split(",").map((s) => s.trim()).filter(Boolean);
  const runs = Math.max(1, Number(process.env.RUNS || 2));
  for (const [label, o] of cases) for (let i = 1; i <= runs; i++) {
    if (only.length && !only.includes(label.match(/^\d+/)[0])) continue; const [u, init] = call(model, o); await timed(label + " #" + i, model, u, init); }
}
