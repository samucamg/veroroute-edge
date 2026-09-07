import type { RoutingStrategy } from "@/types/provider";

export interface TargetCandidate {
  provider: string;
  model: string;
  weight?: number;
  priority?: number;
  cost?: number;
}

const usageCounters: Record<string, number> = {};
let roundRobinIndex = 0;
let lastKnownGoodCandidate: TargetCandidate | null = null;
const sessionMap: Map<string, { candidate: TargetCandidate; expires: number }> = new Map();
const MAX_SESSION_MAP = 2000;

function purgeSessionMap() {
  if (sessionMap.size <= MAX_SESSION_MAP) return;
  const now = Date.now();
  for (const [k, v] of sessionMap) {
    if (v.expires < now) sessionMap.delete(k);
  }
  if (sessionMap.size > MAX_SESSION_MAP) {
    const sorted = [...sessionMap.entries()].sort((a, b) => a[1].expires - b[1].expires);
    for (const [k] of sorted.slice(0, sessionMap.size - MAX_SESSION_MAP)) sessionMap.delete(k);
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function applyRoutingStrategy(
  candidates: TargetCandidate[],
  strategy: RoutingStrategy | string,
  sessionId?: string
): TargetCandidate[] {
  if (!candidates || candidates.length <= 1) return candidates;
  switch (strategy) {
    case "priority": {
      const hasPriority = candidates.some((c) => c.priority !== undefined);
      if (hasPriority) return [...candidates].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
      return [...candidates];
    }
    case "round-robin": {
      const offset = roundRobinIndex % candidates.length;
      roundRobinIndex = (roundRobinIndex + 1) % candidates.length;
      return [...candidates.slice(offset), ...candidates.slice(0, offset)];
    }
    case "p2c": {
      const idx1 = Math.floor(Math.random() * candidates.length);
      let idx2 = Math.floor(Math.random() * candidates.length);
      while (idx2 === idx1 && candidates.length > 1) idx2 = Math.floor(Math.random() * candidates.length);
      const c1 = candidates[idx1]; const c2 = candidates[idx2];
      const u1 = usageCounters[c1.provider + ":" + c1.model] || 0;
      const u2 = usageCounters[c2.provider + ":" + c2.model] || 0;
      const winner = u1 <= u2 ? c1 : c2; const runnerUp = winner === c1 ? c2 : c1;
      return [winner, runnerUp, ...candidates.filter((c) => c !== winner && c !== runnerUp)];
    }
    case "least-used":
      return [...candidates].sort((a, b) => {
        const ua = usageCounters[a.provider + ":" + a.model] || 0;
        const ub = usageCounters[b.provider + ":" + b.model] || 0;
        return ua - ub;
      });
    case "cost":
    case "lowest-cost":
      return [...candidates].sort((a, b) => {
        const ca = a.cost ?? 0; const cb = b.cost ?? 0;
        if (ca !== cb) return ca - cb;
        return (a.priority ?? 999) - (b.priority ?? 999);
      });
    case "random":
      return shuffle([...candidates]);
    case "weighted": {
      const totalWeight = candidates.reduce((acc, c) => acc + (c.weight || 1), 0);
      let rnd = Math.random() * totalWeight;
      let selected = candidates[0];
      for (const c of candidates) { rnd -= c.weight || 1; if (rnd <= 0) { selected = c; break; } }
      return [selected, ...candidates.filter((c) => c !== selected)];
    }
    case "lkgp": {
      if (lastKnownGoodCandidate) {
        const found = candidates.find((c) => c.provider === lastKnownGoodCandidate?.provider && c.model === lastKnownGoodCandidate?.model);
        if (found) return [found, ...candidates.filter((c) => c !== found)];
      }
      return [...candidates];
    }
    case "session-affinity": {
      if (sessionId) {
        const existing = sessionMap.get(sessionId);
        if (existing && existing.expires > Date.now()) {
          const matched = candidates.find((c) => c.provider === existing.candidate.provider && c.model === existing.candidate.model);
          if (matched) return [matched, ...candidates.filter((c) => c !== matched)];
        }
      }
      return [...candidates];
    }
    default:
      return [...candidates];
  }
}

export function recordCandidateSuccess(candidate: TargetCandidate, sessionId?: string): void {
  const key = candidate.provider + ":" + candidate.model;
  usageCounters[key] = (usageCounters[key] || 0) + 1;
  lastKnownGoodCandidate = candidate;
  if (sessionId) sessionMap.set(sessionId, { candidate, expires: Date.now() + 10 * 60 * 1000 }); purgeSessionMap();
}