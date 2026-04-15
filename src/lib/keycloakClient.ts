import Keycloak from "keycloak-js";
import type { KeycloakInitOptions } from "keycloak-js";
import { readKeycloakEnv } from "../config/keycloakEnv";

let cached: Keycloak | null = null;

export function getOrCreateKeycloakClient(): Keycloak {
  if (cached) return cached;
  const { url, realm, clientId } = readKeycloakEnv();
  cached = new Keycloak({ url, realm, clientId });
  return cached;
}

export function buildKeycloakInitOptions(): KeycloakInitOptions {
  const silentCheckSsoRedirectUri = `${window.location.origin}/silent-check-sso.html`;
  return {
    onLoad: "check-sso",
    pkceMethod: "S256",
    silentCheckSsoRedirectUri,
    checkLoginIframe: false,
  };
}
