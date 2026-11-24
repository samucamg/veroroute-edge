import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
import { maskSecret } from "@/admin/auth";
import {
  getAntigravityOAuthCredentials,
  getStoredProviderCredentials,
  setStoredProviderCredentials,
} from "@/admin/store";
import type { EnvBindings } from "@/types/provider";

export interface AntigravityTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // timestamp ms
  project_id?: string;
  email?: string;
}

/**
 * Gera a URL de autorização do Google OAuth para o Antigravity CLI
 */
export function getAntigravityAuthUrl(
  redirectUri: string,
  state = "agy_auth",
  clientId = ANTIGRAVITY_PUBLIC_CONFIG.clientId
): string {
  if (!clientId) {
    throw new Error("O Client ID do Google OAuth não foi configurado.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: ANTIGRAVITY_PUBLIC_CONFIG.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${ANTIGRAVITY_PUBLIC_CONFIG.authorizeUrl}?${params.toString()}`;
}

/**
 * Troca o código de autorização do Google por Access e Refresh Token
 */
export async function exchangeAntigravityCode(
  code: string,
  redirectUri: string,
  clientId = ANTIGRAVITY_PUBLIC_CONFIG.clientId,
  clientSecret = ANTIGRAVITY_PUBLIC_CONFIG.clientSecret
): Promise<AntigravityTokens> {
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais de OAuth do Google não configuradas.");
  }

  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  };

  const response = await fetch(ANTIGRAVITY_PUBLIC_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Antigravity-CLI/2.5.0",
    },
    body: new URLSearchParams(bodyParams),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha na troca de token do Antigravity: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const tokens: AntigravityTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 60000, // 1 min buffer
  };

  // Tenta descobrir o projeto GCP companion onboarded e o e-mail da conta Google
  const [proj, email] = await Promise.all([
    discoverCompanionProject(tokens.access_token).catch(() => ""),
    fetchGoogleUserEmail(tokens.access_token).catch(() => ""),
  ]);
  tokens.project_id = proj;
  if (email) tokens.email = email;

  return tokens;
}

/**
 * Busca o e-mail da conta Google autenticada via OAuth userinfo.
 */
export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  if (!accessToken) return "";
  try {
    const res = await fetch(ANTIGRAVITY_PUBLIC_CONFIG.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(4000) : undefined,
    });
    if (!res.ok) return "";
    const u = (await res.json()) as { email?: string };
    return typeof u?.email === "string" ? u.email.trim() : "";
  } catch {
    return "";
  }
}

export interface ParsedAntigravityCredential {
  refreshToken: string;
  projectId: string;
  email: string;
  connectedAt: string;
}

export function parseAntigravityCredential(rawApiKey: string): ParsedAntigravityCredential {
  let refreshToken = (rawApiKey || "").trim();
  let projectId = "";
  let email = "";
  let connectedAt = "";
  if (refreshToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(refreshToken) as Record<string, unknown>;
      refreshToken = String(parsed.refresh_token || parsed.token || "").trim();
      projectId = String(parsed.project_id || parsed.cloudaicompanionProject || "").trim();
      email = String(parsed.email || "").trim();
      connectedAt = String(parsed.connected_at || "").trim();
    } catch { /* mantém string bruta legada */ }
  }
  return { refreshToken, projectId, email, connectedAt };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function antigravityAccessCacheKey(refreshToken: string): Promise<string> {
  const hex = await sha256Hex(refreshToken);
  return `agy_access_${hex.substring(0, 16)}`;
}

/**
 * Renova o access_token usando o refresh_token
 */
export async function refreshAntigravityToken(
  refreshToken: string,
  clientId = ANTIGRAVITY_PUBLIC_CONFIG.clientId,
  clientSecret = ANTIGRAVITY_PUBLIC_CONFIG.clientSecret
): Promise<{ access_token: string; expires_at: number }> {
  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  };

  const response = await fetch(ANTIGRAVITY_PUBLIC_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Antigravity-CLI/2.5.0",
    },
    body: new URLSearchParams(bodyParams),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao renovar token do Antigravity: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number };
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 60000,
  };
}

/**
 * Consulta a API do Google Cloud Code Assist para descobrir o projeto Companion ativo
 */
export async function discoverCompanionProject(accessToken: string): Promise<string> {
  const url = `${ANTIGRAVITY_PUBLIC_CONFIG.runtimeBaseUrl}${ANTIGRAVITY_PUBLIC_CONFIG.loadCodeAssistPath}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Antigravity-CLI/2.5.0",
    },
    body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY", platform: "LINUX" } }),
  });

  if (!response.ok) {
    // Tenta rota alternativa onboardUser
    const onboardUrl = `${ANTIGRAVITY_PUBLIC_CONFIG.runtimeBaseUrl}${ANTIGRAVITY_PUBLIC_CONFIG.onboardUserPath}`;
    const onboardRes = await fetch(onboardUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Antigravity-CLI/2.5.0",
      },
      body: JSON.stringify({ tierId: "free-tier" }),
    });

    if (!onboardRes.ok) {
      return "";
    }

    const onboardData = (await onboardRes.json()) as any;
    return extractProjectId(onboardData);
  }

  const data = (await response.json()) as any;
  return extractProjectId(data);
}

function extractProjectId(data: any): string {
  if (!data) return "";
  if (typeof data.cloudaicompanionProject === "string") return data.cloudaicompanionProject;
  if (data.cloudaicompanionProject && typeof data.cloudaicompanionProject.id === "string") {
    return data.cloudaicompanionProject.id;
  }
  if (typeof data.projectId === "string") return data.projectId;
  return "";
}

/**
 * Obtém ou atualiza o Access Token válido do Antigravity fazendo rodízio pelas contas (Multi-Account)
 */
export async function getValidAntigravityAccessToken(
  env: EnvBindings,
  // A cascata passa a conta que ela mesma escolheu. Sem isso o rodízio avançava
  // duas posições por requisição (com 2 contas, sempre a mesma era usada) e o
  // cooldown aplicado pela cascata caía na conta errada.
  preselected?: { apiKey: string }
): Promise<{ accessToken: string; projectId: string }> {
  const { clientId, clientSecret } = await getAntigravityOAuthCredentials(env);

  // A-11: Usamos o pool padrão de chaves para pegar o refresh token. Isso permite N contas.
  const credential = preselected
    ?? await (await import("@/routing/keyPool")).selectActiveCredential(env, "antigravity");
  
  if (!credential.apiKey && !env.ANTIGRAVITY_REFRESH_TOKEN && !env.ANTIGRAVITY_ACCESS_TOKEN) {
    throw new Error("Antigravity não configurado. Realize o login OAuth ou configure chaves.");
  }

  // Fallback para as variáveis de ambiente clássicas
  if (!credential.apiKey && env.ANTIGRAVITY_ACCESS_TOKEN) {
    return {
      accessToken: env.ANTIGRAVITY_ACCESS_TOKEN,
      projectId: env.ANTIGRAVITY_PROJECT_ID || ANTIGRAVITY_PUBLIC_CONFIG.defaultProjectId,
    };
  }

  let refreshToken = env.ANTIGRAVITY_REFRESH_TOKEN || "";
  // O cache do access token pode sobreviver a uma credencial antiga sem
  // project_id. Nunca devolva projeto vazio: o CLI usa "aicode-consumers".
  let projectId = env.ANTIGRAVITY_PROJECT_ID || ANTIGRAVITY_PUBLIC_CONFIG.defaultProjectId;

  if (credential.apiKey) {
    try {
      const parsed = JSON.parse(credential.apiKey);
      refreshToken = parsed.refresh_token || parsed.token || "";
      projectId = parsed.project_id || projectId;
    } catch {
      refreshToken = credential.apiKey;
    }
  }

  // Tenta recuperar o Access Token renovado no cache para este Refresh Token (evitar throttling do Google)
  if (env.OMNI_CACHE && refreshToken) {
    const cacheKey = await antigravityAccessCacheKey(refreshToken);

    const cached = await env.OMNI_CACHE.get(cacheKey);
    if (cached) {
      return { accessToken: cached, projectId };
    }

    // Se não está no cache, renova
    const renewed = await refreshAntigravityToken(refreshToken, clientId, clientSecret || env.ANTIGRAVITY_CLIENT_SECRET);
    if (!projectId) {
      projectId = await discoverCompanionProject(renewed.access_token).catch(() => "");
    }

    // Salva no cache com TTL de 3000 segundos (50 min, antes dos 60 min de expiração do Google)
    await env.OMNI_CACHE.put(cacheKey, renewed.access_token, { expirationTtl: 3000 });
    return { accessToken: renewed.access_token, projectId };
  }

  // Caminho sem cache (não recomendado, mas funcional)
  const renewed = await refreshAntigravityToken(refreshToken, clientId, clientSecret || env.ANTIGRAVITY_CLIENT_SECRET);
  if (!projectId) {
    projectId = await discoverCompanionProject(renewed.access_token).catch(() => "");
  }
  return { accessToken: renewed.access_token, projectId };
}

export interface AntigravityAccountSummary {
  index: number;
  id: string;
  email: string;
  projectId: string;
  maskedToken: string;
  connectedAt: string;
}

/**
 * Salva ou atualiza uma conta OAuth do Antigravity no pool sem duplicar refresh_token ou email.
 */
export async function upsertAntigravityAccount(
  env: EnvBindings,
  input: { refreshToken: string; projectId?: string; email?: string }
): Promise<void> {
  const existing = await getStoredProviderCredentials(env, "antigravity");
  const normEmail = (input.email || "").trim().toLowerCase();
  const payload = JSON.stringify({
    refresh_token: input.refreshToken.trim(),
    project_id: (input.projectId || "").trim(),
    email: (input.email || "").trim(),
    connected_at: new Date().toISOString(),
  });

  let replaced = false;
  const updated = existing.map((item) => {
    const parsed = parseAntigravityCredential(item.apiKey);
    const sameToken = parsed.refreshToken && parsed.refreshToken === input.refreshToken.trim();
    const sameEmail = normEmail && parsed.email && parsed.email.toLowerCase() === normEmail;
    if (!replaced && (sameToken || sameEmail)) {
      replaced = true;
      return { apiKey: payload };
    }
    return item;
  });
  if (!replaced) updated.push({ apiKey: payload });
  await setStoredProviderCredentials(env, "antigravity", updated);
}

/**
 * Lista todas as contas Antigravity conectadas (mascaradas, sem expor refresh_token).
 * Backfill best-effort de e-mail para contas legadas salvas sem o campo email.
 */
export async function listAntigravityAccounts(env: EnvBindings): Promise<AntigravityAccountSummary[]> {
  const creds = await getStoredProviderCredentials(env, "antigravity");
  if (creds.length === 0) return [];

  let dirty = false;
  const updatedCreds = [...creds];
  const summaries: AntigravityAccountSummary[] = [];

  for (let i = 0; i < creds.length; i++) {
    const parsed = parseAntigravityCredential(creds[i].apiKey);
    let email = parsed.email;
    const projectId = parsed.projectId || ANTIGRAVITY_PUBLIC_CONFIG.defaultProjectId;

    if (!email && parsed.refreshToken) {
      try {
        const tok = await getValidAntigravityAccessToken(env, { apiKey: creds[i].apiKey });
        const resolved = await fetchGoogleUserEmail(tok.accessToken);
        if (resolved) {
          email = resolved;
          updatedCreds[i] = {
            apiKey: JSON.stringify({
              refresh_token: parsed.refreshToken,
              project_id: parsed.projectId || tok.projectId || "",
              email: resolved,
              connected_at: parsed.connectedAt || new Date().toISOString(),
            }),
          };
          dirty = true;
        }
      } catch { /* ignora erro de backfill para não bloquear listagem */ }
    }

    const id = parsed.refreshToken ? (await sha256Hex(parsed.refreshToken)).substring(0, 12) : `idx_${i}`;
    summaries.push({
      index: i,
      id,
      email,
      projectId,
      maskedToken: parsed.refreshToken ? maskSecret(parsed.refreshToken) : "****",
      connectedAt: parsed.connectedAt,
    });
  }

  if (dirty) {
    await setStoredProviderCredentials(env, "antigravity", updatedCreds).catch(() => {});
  }

  return summaries;
}

/**
 * Remove uma conta específica (por id ou index) ou todas as contas Antigravity do KV.
 */
export async function removeAntigravityAccounts(
  env: EnvBindings,
  target: { index?: number; id?: string; all?: boolean }
): Promise<{ removed: number; accounts: AntigravityAccountSummary[] }> {
  const creds = await getStoredProviderCredentials(env, "antigravity");
  if (creds.length === 0) return { removed: 0, accounts: [] };

  const toDeleteTokens: string[] = [];
  let remaining = creds;

  if (target.all) {
    for (const c of creds) {
      const p = parseAntigravityCredential(c.apiKey);
      if (p.refreshToken) toDeleteTokens.push(p.refreshToken);
    }
    remaining = [];
  } else {
    const kept: typeof creds = [];
    for (let i = 0; i < creds.length; i++) {
      const p = parseAntigravityCredential(creds[i].apiKey);
      const cid = p.refreshToken ? (await sha256Hex(p.refreshToken)).substring(0, 12) : `idx_${i}`;
      const matchById = typeof target.id === "string" && target.id.trim() !== "" && cid === target.id.trim();
      const matchByIndex = typeof target.index === "number" && Number.isInteger(target.index) && i === target.index;
      if (matchById || matchByIndex) {
        if (p.refreshToken) toDeleteTokens.push(p.refreshToken);
      } else {
        kept.push(creds[i]);
      }
    }
    remaining = kept;
  }

  const removed = creds.length - remaining.length;
  if (removed > 0) {
    await setStoredProviderCredentials(env, "antigravity", remaining);
    if (env.OMNI_CACHE) {
      await Promise.all(
        toDeleteTokens.map(async (rt) => {
          const ck = await antigravityAccessCacheKey(rt);
          await env.OMNI_CACHE!.delete(ck).catch(() => {});
        })
      );
    }
  }

  const accounts = await listAntigravityAccounts(env);
  return { removed, accounts };
}
