const runtimeEnv =
  typeof window !== "undefined" && window.__ENV && typeof window.__ENV === "object"
    ? window.__ENV
    : {};

const nonEmpty = (value) => {
  if (typeof value !== "string") return value;
  return value.trim() === "" ? undefined : value;
};

export const API_URL =
  nonEmpty(runtimeEnv.REACT_APP_API_URL) ?? nonEmpty(process.env.REACT_APP_API_URL);
export const LTI_API_URL =
  nonEmpty(runtimeEnv.REACT_APP_LTI_API_URL) ??
  nonEmpty(process.env.REACT_APP_LTI_API_URL) ??
  (typeof window !== "undefined" ? window.location.origin : undefined);
export const AUTH0_DOMAIN =
  nonEmpty(runtimeEnv.REACT_APP_AUTH0_DOMAIN) ??
  nonEmpty(process.env.REACT_APP_AUTH0_DOMAIN);
export const AUTH0_CLIENT_ID =
  nonEmpty(runtimeEnv.REACT_APP_AUTH0_CLIENT_ID) ??
  nonEmpty(process.env.REACT_APP_AUTH0_CLIENT_ID);
export const MAPS_API =
  nonEmpty(runtimeEnv.REACT_APP_MAPS_API) ?? nonEmpty(process.env.REACT_APP_MAPS_API);

// Azure AD (Microsoft Entra ID) - optional staff/admin direct login
export const AAD_CLIENT_ID =
  nonEmpty(runtimeEnv.REACT_APP_AAD_CLIENT_ID) ?? nonEmpty(process.env.REACT_APP_AAD_CLIENT_ID);
export const AAD_TENANT_ID =
  nonEmpty(runtimeEnv.REACT_APP_AAD_TENANT_ID) ?? nonEmpty(process.env.REACT_APP_AAD_TENANT_ID);
export const AAD_AUTHORITY =
  nonEmpty(runtimeEnv.REACT_APP_AAD_AUTHORITY) ??
  nonEmpty(process.env.REACT_APP_AAD_AUTHORITY);
export const AAD_REDIRECT_URI =
  nonEmpty(runtimeEnv.REACT_APP_AAD_REDIRECT_URI) ??
  nonEmpty(process.env.REACT_APP_AAD_REDIRECT_URI);
export const AAD_SCOPES =
  nonEmpty(runtimeEnv.REACT_APP_AAD_SCOPES) ?? nonEmpty(process.env.REACT_APP_AAD_SCOPES);
export const AAD_ALLOWED_GROUP_IDS =
  nonEmpty(runtimeEnv.REACT_APP_AAD_ALLOWED_GROUP_IDS) ??
  nonEmpty(process.env.REACT_APP_AAD_ALLOWED_GROUP_IDS);
export const AAD_ALLOWED_ROLES =
  nonEmpty(runtimeEnv.REACT_APP_AAD_ALLOWED_ROLES) ??
  nonEmpty(process.env.REACT_APP_AAD_ALLOWED_ROLES);
export const AAD_ALLOWED_EMAIL_DOMAIN =
  nonEmpty(runtimeEnv.REACT_APP_AAD_ALLOWED_EMAIL_DOMAIN) ??
  nonEmpty(process.env.REACT_APP_AAD_ALLOWED_EMAIL_DOMAIN);
