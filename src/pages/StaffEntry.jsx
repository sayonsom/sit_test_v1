import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InteractionStatus } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { aadRestrictions, isAadConfigured, loginRequest } from "../authConfig";
import { useLTI } from "../contexts/LTIContext";

const normalizeDomain = (domain) => {
  if (typeof domain !== "string") return undefined;
  const trimmed = domain.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
};

const isAccountAllowed = (account) => {
  const email = account?.username || "";
  const claims = account?.idTokenClaims || {};

  const allowedDomain = normalizeDomain(aadRestrictions.allowedEmailDomain);
  if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
    return { allowed: false, reason: `Email domain must be @${allowedDomain}.` };
  }

  const allowedGroupIds = aadRestrictions.allowedGroupIds || [];
  const tokenGroups = toArray(claims.groups);
  if (allowedGroupIds.length > 0 && !tokenGroups.some((g) => allowedGroupIds.includes(g))) {
    return { allowed: false, reason: "Your account is not in an allowed staff/admin group." };
  }

  const allowedRoles = aadRestrictions.allowedRoles || [];
  const tokenRoles = toArray(claims.roles);
  if (allowedRoles.length > 0 && !tokenRoles.some((r) => allowedRoles.includes(r))) {
    return { allowed: false, reason: "Your account does not have an allowed staff/admin role." };
  }

  return { allowed: true };
};

export default function StaffEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { instance, accounts, inProgress } = useMsal();
  const { loginStaff } = useLTI();
  const [error, setError] = useState(null);

  const account = useMemo(() => accounts?.[0], [accounts]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : "");

    const getParam = (key) => query.get(key) || hash.get(key);

    const errorCode = getParam("error");
    const errorDescription = getParam("error_description");
    const clientRequestId = getParam("client-request-id") || getParam("client_request_id");

    if (!errorCode && !errorDescription && !clientRequestId) return;

    const parts = [];
    if (errorCode) parts.push(`Sign-in failed (${errorCode}).`);
    if (errorDescription) parts.push(errorDescription);
    if (!errorCode && !errorDescription && clientRequestId) {
      parts.push("Sign-in failed at identity provider.");
    }
    if (clientRequestId) parts.push(`Request ID: ${clientRequestId}`);

    setError(parts.join(" "));
  }, [location.hash, location.search]);

  useEffect(() => {
    if (!isAadConfigured) return;
    if (!account) return;
    if (inProgress !== InteractionStatus.None) return;

    const { allowed, reason } = isAccountAllowed(account);
    if (!allowed) {
      setError(reason || "Access denied.");
      return;
    }

    instance.setActiveAccount(account);

    const email = account.username;
    const name = account.name || account.username;
    const picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`;

    loginStaff({
      email,
      name,
      picture,
      user_id: email,
    });

    navigate("/home", { replace: true });
  }, [account, inProgress, instance, loginStaff, navigate]);

  const handleSignIn = async () => {
    setError(null);
    if (!isAadConfigured) {
      setError(
        "Staff/Admin sign-in is not configured. Set REACT_APP_AAD_CLIENT_ID."
      );
      return;
    }
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      const message =
        (e && typeof e === "object" && "message" in e && e.message) ||
        "Sign-in request failed.";
      setError(String(message));
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await instance.logoutRedirect();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-6">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Staff / Admin Access</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in with SIT Active Directory (Microsoft Entra ID) to access the lab directly (without a
          Brightspace launch).
        </p>

        {!isAadConfigured ? (
          <div className="mt-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            Staff sign-in is not configured for this environment.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            disabled={inProgress !== InteractionStatus.None}
          >
            Sign in with Microsoft
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={inProgress !== InteractionStatus.None}
          >
            Sign out
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Students should launch from Brightspace. If you’re a staff user and you see access denied,
          ask SIT to add your account to the configured staff/admin group/role for this tool.
        </p>
      </div>
    </div>
  );
}
