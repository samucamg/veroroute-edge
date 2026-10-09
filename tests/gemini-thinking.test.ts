import { describe, expect, it } from "vitest";
import {
  buildGeminiThinkingConfig,
  geminiCompatReasoningEffort,
  geminiThinkingFamily,
} from "@/adapters/geminiThinking";

describe("geminiThinking", () => {
  it("classifica as famílias de modelo", () => {
    expect(geminiThinkingFamily("gemini-3.8-flash")).toBe("gemini3");
    expect(geminiThinkingFamily("gemini-flash-latest")).toBe("gemini3");
    expect(geminiThinkingFamily("gemini/gemini-3.8-pro")).toBe("gemini3");
    expect(geminiThinkingFamily("gemini-2.5-flash")).toBe("gemini25-flash");
    expect(geminiThinkingFamily("gemini-2.5-pro")).toBe("gemini25-pro");
    expect(geminiThinkingFamily("gemini-2.0-flash")).toBe("none");
    expect(geminiThinkingFamily("gemini-1.5-flash")).toBe("none");
    expect(geminiThinkingFamily("text-embedding-004")).toBe("none");
  });

  it("usa raciocínio baixo por padrão nos Gemini 3.x", () => {
    expect(buildGeminiThinkingConfig("gemini-3.8-flash", undefined)).toEqual({ thinkingLevel: "low" });
    expect(buildGeminiThinkingConfig("gemini-flash-latest", "bogus")).toEqual({ thinkingLevel: "low" });
  });

  it("respeita reasoning_effort do cliente", () => {
    expect(buildGeminiThinkingConfig("gemini-3.8-flash", "none")).toEqual({ thinkingBudget: 0 });
    expect(buildGeminiThinkingConfig("gemini-3.8-flash", "HIGH")).toEqual({ thinkingLevel: "high" });
    expect(buildGeminiThinkingConfig("gemini-2.5-flash", "none")).toEqual({ thinkingBudget: 0 });
    expect(buildGeminiThinkingConfig("gemini-2.5-flash", undefined)).toEqual({ thinkingBudget: 1024 });
  });

  it("não desliga o thinking do 2.5 Pro (mínimo 128)", () => {
    expect(buildGeminiThinkingConfig("gemini-2.5-pro", "none")).toEqual({ thinkingBudget: 128 });
  });

  it("não envia thinkingConfig para modelos sem suporte", () => {
    expect(buildGeminiThinkingConfig("gemini-2.0-flash", "low")).toBeUndefined();
    expect(geminiCompatReasoningEffort("gemini-2.0-flash", "low")).toBeUndefined();
  });

  it("mapeia a camada OpenAI-compat", () => {
    expect(geminiCompatReasoningEffort("gemini-3.8-flash", undefined)).toBe("low");
    expect(geminiCompatReasoningEffort("gemini-3.8-flash", "minimal")).toBe("none");
  });
});
