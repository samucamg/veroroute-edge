import type { RoutingStrategy } from "@/types/provider";

export interface TargetCandidate {
  provider: string;
  model: string;
  weight?: number;
  cost?: number;
}

// Histórico em memória de métricas para estratégias dinâmicas
const usageCounters: Record<string, number> = {};
let roundRobinIndex = 0;
let lastKnownGoodCandidate: TargetCandidate | null = null;
const sessionMap: Map<string, { candidate: TargetCandidate; expires: number }> = new Map();

/**
 * Ordena ou seleciona os candidatos com base na estratégia de roteamento solicitada
 */
export function applyRoutingStrategy(
  candidates: TargetCandidate[],
  strategy: RoutingStrategy | string,
  sessionId?: string
): TargetCandidate[] {
  if (!candidates || candidates.length <= 1) return candidates;

  switch (strategy) {
    // 1. Prioridade / Fallback: Mantém ordem exata original
    case "priority":
      return [...candidates];

    // 2. Round-Robin: Desloca o início da lista ciclicamente
    case "round-robin": {
      const offset = roundRobinIndex % candidates.length;
      roundRobinIndex = (roundRobinIndex + 1) % candidates.length;
      return [...candidates.slice(offset), ...candidates.slice(0, offset)];
    }

    // 3. P2C (Power of Two Choices): Escolhe dois aleatoriamente e prioriza o de menor uso
    case "p2c": {
      if (candidates.length === 2) {
        const u0 = usageCounters[`${candidates[0].provider}:${candidates[0].model}`] || 0;
        const u1 = usageCounters[`${candidates[1].provider}:${candidates[1].model}`] || 0;
        return u0 <= u1 ? [candidates[0], candidates[1]] : [candidates[1], candidates[0]];
      }
      const idx1 = Math.floor(Math.random() * candidates.length);
      let idx2 = Math.floor(Math.random() * candidates.length);
      while (idx2 === idx1) idx2 = Math.floor(Math.random() * candidates.length);

      const c1 = candidates[idx1];
      const c2 = candidates[idx2];
      const u1 = usageCounters[`${c1.provider}:${c1.model}`] || 0;
      const u2 = usageCounters[`${c2.provider}:${c2.model}`] || 0;

      const winner = u1 <= u2 ? c1 : c2;
      const runnerUp = winner === c1 ? c2 : c1;
      const rest = candidates.filter((c) => c !== winner && c !== runnerUp);
      return [winner, runnerUp, ...rest];
    }

    // 4. Menos Usado (Least Used): Ordena pelo menor número de chamadas
    case "least-used": {
      return [...candidates].sort((a, b) => {
        const ua = usageCounters[`${a.provider}:${a.model}`] || 0;
        const ub = usageCounters[`${b.provider}:${b.model}`] || 0;
        return ua - ub;
      });
    }

    // 5. Custo Otimizado / Menor Custo: Modelos $0 primeiro
    case "cost": {
      return [...candidates].sort((a, b) => (a.cost || 0) - (b.cost || 0));
    }

    // 6. LKGP (Last Known Good Provider): Se temos um vencedor recente que funciona, coloca ele no topo
    case "lkgp": {
      if (lastKnownGoodCandidate) {
        const found = candidates.find(
          (c) =>
            c.provider === lastKnownGoodCandidate?.provider &&
            c.model === lastKnownGoodCandidate?.model
        );
        if (found) {
          return [found, ...candidates.filter((c) => c !== found)];
        }
      }
      return [...candidates];
    }

    // 7. Ponderado (Weighted): Sorteio baseado em peso percentual
    case "weighted": {
      const totalWeight = candidates.reduce((acc, c) => acc + (c.weight || 1), 0);
      let randomVal = Math.random() * totalWeight;
      let selected = candidates[0];

      for (const c of candidates) {
        randomVal -= c.weight || 1;
        if (randomVal <= 0) {
          selected = c;
          break;
        }
      }
      return [selected, ...candidates.filter((c) => c !== selected)];
    }

    // 8. Session Affinity: Mantém a mesma sessão ligada ao mesmo provedor por 10 minutos
    case "session-affinity": {
      if (sessionId) {
        const existing = sessionMap.get(sessionId);
        if (existing && existing.expires > Date.now()) {
          const matched = candidates.find(
            (c) => c.provider === existing.candidate.provider && c.model === existing.candidate.model
          );
          if (matched) {
            return [matched, ...candidates.filter((c) => c !== matched)];
          }
        }
      }
      return [...candidates];
    }

    // Padrão / Fallback
    default:
      return [...candidates];
  }
}

/**
 * Registra o sucesso de um candidato para telemetria e LKGP
 */
export function recordCandidateSuccess(candidate: TargetCandidate, sessionId?: string): void {
  const key = `${candidate.provider}:${candidate.model}`;
  usageCounters[key] = (usageCounters[key] || 0) + 1;
  lastKnownGoodCandidate = candidate;

  if (sessionId) {
    sessionMap.set(sessionId, {
      candidate,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutos
    });
  }
}
