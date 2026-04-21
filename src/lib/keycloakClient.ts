import Keycloak from "keycloak-js";
import type { KeycloakInitOptions } from "keycloak-js";
import { readKeycloakEnv } from "../config/keycloakEnv";

let cached: Keycloak | null = null;

export function getOrCreateKeycloakClient(): Keycloak {
  if (cached) return cached;
  const { url, realm, clientId } = readKeycloakEnv();
  console.groupCollapsed("[Keycloak] client config");
  console.log("url:", url);
  console.log("realm:", realm);
  console.log("clientId:", clientId);
  console.groupEnd();
  cached = new Keycloak({ url, realm, clientId });
  return cached;
}

export function buildKeycloakInitOptions(): KeycloakInitOptions {
  // const options: KeycloakInitOptions = {
  //   onLoad: "login-required",
  //   pkceMethod: "plain",
  //   checkLoginIframe: false,
  // };

  const options: KeycloakInitOptions = {
    onLoad: "login-required",
    checkLoginIframe: false,
  };

  console.log("[Keycloak] init options", options);
  return options;
}
