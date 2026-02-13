import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./env";

export const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();

  const domain = AUTH0_DOMAIN;
  const clientId = AUTH0_CLIENT_ID;
  // Ensure your REACT_APP_AUTH0_REDIRECT_URI environment variable is set in your .env file and vercel settings
  const redirectUri = window.location.origin + "/callback";

  const onRedirectCallback = (appState) => {
    // This will navigate to the '/home' route after login
    navigate(appState?.returnTo || '/home');
  };

  if (!(domain && clientId && redirectUri)) {
    return <div>Error: Missing configuration for Auth0</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
      onRedirectCallback={onRedirectCallback}
      scope="openid profile email"
    >
      {children}
    </Auth0Provider>
  );
};
