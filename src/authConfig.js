import {
  AAD_ALLOWED_EMAIL_DOMAIN,
  AAD_ALLOWED_GROUP_IDS,
  AAD_ALLOWED_ROLES,
  AAD_AUTHORITY,
  AAD_CLIENT_ID,
  AAD_REDIRECT_URI,
  AAD_SCOPES,
  AAD_TENANT_ID,
} from "./env";

const DEFAULT_CLIENT_ID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_AUTHORITY = "https://login.microsoftonline.com/organizations";

const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

const resolveRedirectUri = () => {
  if (!AAD_REDIRECT_URI) {
    return `${origin}/staff`;
  }

  if (AAD_REDIRECT_URI.startsWith("http://") || AAD_REDIRECT_URI.startsWith("https://")) {
    return AAD_REDIRECT_URI;
  }

  return `${origin}${AAD_REDIRECT_URI.startsWith("/") ? "" : "/"}${AAD_REDIRECT_URI}`;
};

const redirectUri = resolveRedirectUri();

export const isAadConfigured = Boolean(AAD_CLIENT_ID);

export const msalConfig = {
  auth: {
    clientId: AAD_CLIENT_ID || DEFAULT_CLIENT_ID,
    authority:
      AAD_AUTHORITY ||
      (AAD_TENANT_ID ? `https://login.microsoftonline.com/${AAD_TENANT_ID}` : DEFAULT_AUTHORITY),
    redirectUri,
    postLogoutRedirectUri: `${origin}/`,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

const parseCsv = (value) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

export const aadRestrictions = {
  allowedEmailDomain: AAD_ALLOWED_EMAIL_DOMAIN || undefined,
  allowedGroupIds: parseCsv(AAD_ALLOWED_GROUP_IDS),
  allowedRoles: parseCsv(AAD_ALLOWED_ROLES),
};

export const loginRequest = {
  scopes: parseCsv(AAD_SCOPES).length > 0 ? parseCsv(AAD_SCOPES) : ["openid", "profile", "email"],
};
