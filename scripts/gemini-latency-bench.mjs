// Mede a latência do provedor gemini (AI Studio) com e sem controle de "thinking".
// Uso: GEMINI_KEY=sua_chave node scripts/gemini-latency-bench.mjs
// A chave nunca é impressa.
const key = (process.env.GEMINI_KEY || "").trim();
if (!key) { console.log("Defina GEMINI_KEY"); process.exit(1); }
const isAQ = key.startsWith("AQ.");
console.log("tipo de chave:", isAQ ? "AQ (camada OpenAI-compat)" : "AIza/outra (API nativa)");
const models = ["gemini-flash-latest", "gemini-3.8-flash"];
const base = "https://generativelanguage.googleapis.com/v1beta";
async function run(label, model, extra) {
  const t = Date.now();
  let url, init;
  if (isAQ) {
    url = base + "/openai/chat/completions";
    init = { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ model, messages: [{ role: "user", content: "Respond with OK" }], max_tokens: 5, temperature: 0, ...extra.oa }) };
  } else {
    url = base + "/models/" + model + ":generateContent?key=" + encodeURIComponent(key);
    init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Respond with OK" }] }], generationConfig: { temperature: 0, topP: 0.95, maxOutputTokens: 5, ...extra.native } }) };
  }
  try {
    const r = await fetch(url, init);
    const j = await r.json().catch(() => ({}));
    const ms = Date.now() - t;
    const u = j.usageMetadata || j.usage || {};
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? j.choices?.[0]?.message?.content ?? "";
    const fin = j.candidates?.[0]?.finishReason ?? j.choices?.[0]?.finish_reason ?? "";
    console.log([model, label, r.status, ms + "ms", "thoughts=" + (u.thoughtsTokenCount ?? u.completion_tokens_details?.reasoning_tokens ?? "-"), "out=" + (u.candidatesTokenCount ?? u.completion_tokens ?? "-"), "finish=" + fin, JSON.stringify(text).slice(0, 30), r.ok ? "" : JSON.stringify(j).slice(0, 160)].join(" | "));
  } catch (e) { console.log(model, label, "ERRO", String(e).slice(0, 120), Date.now() - t + "ms"); }
}
const variants = [
  ["atual (sem thinkingConfig)", { native: {}, oa: {} }],
  ["thinkingBudget=0 / effort=none", { native: { thinkingConfig: { thinkingBudget: 0 } }, oa: { reasoning_effort: "none" } }],
  ["thinkingLevel=low / effort=low", { native: { thinkingConfig: { thinkingLevel: "low" } }, oa: { reasoning_effort: "low" } }],
];
for (const m of models) for (const [l, x] of variants) for (let i = 0; i < 2; i++) await run(l + " #" + (i + 1), m, x);
