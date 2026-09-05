import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
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
export function getAntigravityAuthUrl(redirectUri: string, state = "agy_auth"): string {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_PUBLIC_CONFIG.clientId,
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
  clientSecret = ANTIGRAVITY_PUBLIC_CONFIG.clientSecret
): Promise<AntigravityTokens> {
  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: ANTIGRAVITY_PUBLIC_CONFIG.clientId,
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

  // Tenta descobrir o projeto GCP companion onboarded
  try {
    tokens.project_id = await discoverCompanionProject(tokens.access_token);
  } catch (err) {
    console.warn("Aviso: Falha ao autodescobrir projeto GCP Companion:", err);
  }

  return tokens;
}

/**
 * Renova o access_token usando o refresh_token
 */
export async function refreshAntigravityToken(
  refreshToken: string,
  clientSecret = ANTIGRAVITY_PUBLIC_CONFIG.clientSecret
): Promise<{ access_token: string; expires_at: number }> {
  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    client_id: ANTIGRAVITY_PUBLIC_CONFIG.clientId,
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
 * Obtém ou atualiza o Access Token válido do Antigravity armazenado no KV ou Variáveis
 */
export async function getValidAntigravityAccessToken(
  env: EnvBindings
): Promise<{ accessToken: string; projectId: string }> {
  // 1. Verifica no KV se existe token salvo
  if (env.OMNI_KEYS) {
    const rawSaved = await env.OMNI_KEYS.get("antigravity_tokens");
    if (rawSaved) {
      try {
        const tokens = JSON.parse(rawSaved) as AntigravityTokens;
        // Se ainda for válido, retorna
        if (tokens.access_token && tokens.expires_at > Date.now()) {
          return {
            accessToken: tokens.access_token,
            projectId: tokens.project_id || env.ANTIGRAVITY_PROJECT_ID || "",
          };
        }

        // Se expirou e temos refresh_token, renova
        if (tokens.refresh_token) {
          const renewed = await refreshAntigravityToken(
            tokens.refresh_token,
            env.ANTIGRAVITY_CLIENT_SECRET
          );
          tokens.access_token = renewed.access_token;
          tokens.expires_at = renewed.expires_at;
          if (!tokens.project_id) {
            tokens.project_id = await discoverCompanionProject(renewed.access_token).catch(() => "");
          }
          await env.OMNI_KEYS.put("antigravity_tokens", JSON.stringify(tokens));
          return {
            accessToken: tokens.access_token,
            projectId: tokens.project_id || env.ANTIGRAVITY_PROJECT_ID || "",
          };
        }
      } catch (e) {
        console.error("Erro ao ler tokens do KV Antigravity:", e);
      }
    }
  }

  // 2. Verifica se foi passado via variáveis de ambiente
  if (env.ANTIGRAVITY_REFRESH_TOKEN) {
    const renewed = await refreshAntigravityToken(
      env.ANTIGRAVITY_REFRESH_TOKEN,
      env.ANTIGRAVITY_CLIENT_SECRET
    );
    const projectId =
      env.ANTIGRAVITY_PROJECT_ID ||
      (await discoverCompanionProject(renewed.access_token).catch(() => ""));

    // Salva no KV para reuso se disponível
    if (env.OMNI_KEYS) {
      await env.OMNI_KEYS.put(
        "antigravity_tokens",
        JSON.stringify({
          access_token: renewed.access_token,
          refresh_token: env.ANTIGRAVITY_REFRESH_TOKEN,
          expires_at: renewed.expires_at,
          project_id: projectId,
        })
      );
    }

    return { accessToken: renewed.access_token, projectId };
  }

  if (env.ANTIGRAVITY_ACCESS_TOKEN) {
    return {
      accessToken: env.ANTIGRAVITY_ACCESS_TOKEN,
      projectId: env.ANTIGRAVITY_PROJECT_ID || "",
    };
  }

  throw new Error(
    "Antigravity não configurado. Realize o login OAuth ou configure ANTIGRAVITY_REFRESH_TOKEN."
  );
}
