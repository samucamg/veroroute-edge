import type { EnvBindings } from "@/types/provider";

/**
 * Circuit breaker per provider using Cloudflare KV.
 * After N consecutive failures, the provider is "tripped" (skipped) for X minutes.
 * This prevents wasting time and quota on providers that are consistently failing.
 */

interface CircuitState {
  failures: number;
  trippedAt: number | null;  // epoch ms when circuit opened
  lastFailure: number;       // epoch ms
  lastSuccess: number;       // epoch ms
}

const FAILURE_THRESHOLD = 5;       // failures before tripping
const TRIP_DURATION_MS = 5 * 60 * 1000;  // 5 minutes open
const HALF_OPEN_AFTER_MS = 2 * 60 * 1000; // allow one probe after 2 minutes

function circuitKey(providerId: string): string {
  return `circuit:${providerId}`;
}

/**
 * Check if a provider is available (circuit closed or half-open).
 */
export async function isProviderAvailable(
  env: EnvBindings,
  providerId: string,
): Promise<boolean> {
  const kv = env.OMNI_CACHE;
  if (!kv) return true; // No KV = no circuit breaker

  try {
    const raw = await kv.get(circuitKey(providerId));
    if (!raw) return true; // No state = healthy

    const state: CircuitState = JSON.parse(raw);
    if (!state.trippedAt) return true; // Not tripped

    const now = Date.now();
    const elapsed = now - state.trippedAt;

    // Circuit is open (tripped)
    if (elapsed < HALF_OPEN_AFTER_MS) {
      return false; // Still fully open, skip this provider
    }

    // Half-open: allow one probe request
    if (elapsed < TRIP_DURATION_MS) {
      // Probabilistic half-open: 20% chance to probe
      return Math.random() < 0.2;
    }

    // Trip duration expired, circuit closed
    return true;
  } catch {
    return true; // Error reading KV = assume healthy
  }
}

/**
 * Record a provider failure. May trip the circuit.
 */
export async function recordProviderFailure(
  env: EnvBindings,
  providerId: string,
  ctx?: ExecutionContext,
): Promise<void> {
  const kv = env.OMNI_CACHE;
  if (!kv) return;

  const update = async () => {
    try {
      const raw = await kv.get(circuitKey(providerId));
      const state: CircuitState = raw ? JSON.parse(raw) : {
        failures: 0, trippedAt: null, lastFailure: 0, lastSuccess: 0,
      };

      state.failures += 1;
      state.lastFailure = Date.now();

      // Check if should trip
      if (state.failures >= FAILURE_THRESHOLD && !state.trippedAt) {
        state.trippedAt = Date.now();
        console.warn(`Circuit breaker TRIPPED for provider: ${providerId}`);
      }

      await kv.put(circuitKey(providerId), JSON.stringify(state), {
        expirationTtl: 3600, // 1 hour TTL
      });
    } catch { /* non-fatal */ }
  };

  if (ctx) ctx.waitUntil(update());
  else await update();
}

/**
 * Record a provider success. Resets failures and closes circuit.
 */
export async function recordProviderSuccess(
  env: EnvBindings,
  providerId: string,
  ctx?: ExecutionContext,
): Promise<void> {
  const kv = env.OMNI_CACHE;
  if (!kv) return;

  const update = async () => {
    try {
      const state: CircuitState = {
        failures: 0,
        trippedAt: null,
        lastFailure: 0,
        lastSuccess: Date.now(),
      };
      await kv.put(circuitKey(providerId), JSON.stringify(state), {
        expirationTtl: 3600,
      });
    } catch { /* non-fatal */ }
  };

  if (ctx) ctx.waitUntil(update());
  else await update();
}

/**
 * Get circuit breaker status for a provider.
 */
export async function getCircuitStatus(
  env: EnvBindings,
  providerId: string,
): Promise<{ state: "closed" | "open" | "half-open"; failures: number; trippedAt: number | null }> {
  const kv = env.OMNI_CACHE;
  if (!kv) return { state: "closed", failures: 0, trippedAt: null };

  try {
    const raw = await kv.get(circuitKey(providerId));
    if (!raw) return { state: "closed", failures: 0, trippedAt: null };

    const circuit: CircuitState = JSON.parse(raw);
    if (!circuit.trippedAt) {
      return { state: "closed", failures: circuit.failures, trippedAt: null };
    }

    const elapsed = Date.now() - circuit.trippedAt;
    if (elapsed >= TRIP_DURATION_MS) {
      return { state: "closed", failures: 0, trippedAt: null }; // Expired
    }
    if (elapsed >= HALF_OPEN_AFTER_MS) {
      return { state: "half-open", failures: circuit.failures, trippedAt: circuit.trippedAt };
    }
    return { state: "open", failures: circuit.failures, trippedAt: circuit.trippedAt };
  } catch {
    return { state: "closed", failures: 0, trippedAt: null };
  }
}
