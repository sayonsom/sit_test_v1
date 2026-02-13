# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Frontend web app built with Create React App (CRA), React 18, and React Router.
- **MIGRATION IN PROGRESS**: Transitioning from Auth0 to SIT Brightspace LTI 1.3 authentication
  - Current: Auth0 authentication with LTI entry flow for session token exchange
  - Target: Full LTI 1.3 integration with FastAPI backend service
  - See LTI_MIGRATION_PLAN.md and IMPLEMENTATION_STATUS.md for details
- Deployed in Docker as a static SPA served by Nginx; docker entrypoint performs runtime env var substitution in built JS.

Common commands
- Install dependencies
  - npm install
- Start dev server (http://localhost:3000)
  - npm start
- Build for production
  - npm run build
- Run tests (Jest via react-scripts)
  - All tests (interactive watch): npm test
  - Single test file: npm test -- src/App.test.js
  - Filter by test name: npm test -- -t "some test name"
  - Run once in CI (non-interactive): CI=true npm test -- --watchAll=false
- Docker
  - Build image: docker build -t virtuallab .
  - Run container (set env at runtime):
    - docker run -p 3000:80 \
        -e REACT_APP_API_URL=http://localhost:8000 \
        -e REACT_APP_AUTH0_DOMAIN=example.us.auth0.com \
        -e REACT_APP_AUTH0_CLIENT_ID=your_client_id \
        virtuallab
  - Or with compose: docker-compose up -d

Environment variables
- Local development (CRA): define in a .env file or export in shell before npm start
  - REACT_APP_API_URL
  - REACT_APP_AUTH0_DOMAIN
  - REACT_APP_AUTH0_CLIENT_ID
  - REACT_APP_MAPS_API (optional)
- Container runtime: docker-entrypoint.sh replaces placeholders in built JS using the variables above, allowing runtime configuration without rebuilding.

High-level architecture
- Entry and providers
  - src/index.js creates the React root, wraps BrowserRouter and Auth0ProviderWithNavigate, then renders <App />.
  - src/auth0-provider-with-navigate.js reads REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID, sets redirectUri to <origin>/callback, and on redirect navigates to /home.
- Routing
  - src/App.js defines routes for /, /home, /results, /courses, /courses/:courseShortCode, /module/:moduleID, /app (LTI entry), /dashboard, /lti-required, /callback, and a fallback.
  - src/pages/AppEntry.jsx implements the LTI flow: reads ltisid from query, POSTs to https://alignbackendapis-708196257066.asia-southeast1.run.app/session/exchange with credentials included, then navigates to /dashboard or /lti-required.
- Application shell
  - src/pages/AppLayout.js is the main layout (headlessui, heroicons) providing sidebar/topbar, dark mode toggle, and a profile menu using Auth0 user context. It renders children routes inside the main content area.
- Data access and state
  - src/pages/Home.js uses process.env.REACT_APP_API_URL with axios to call backend endpoints (e.g., /test-cors, /student-id/{email}, /students/, /students/logins), and stores identifiers and user metadata in sessionStorage.
  - Components under src/components/ provide UI elements and domain features (e.g., 3D viewer with three/react-three-fiber, forms, markdown rendering, course modules).
- 3D assets
  - public/draco contains Draco decoders for three.js; when using THREE.DRACOLoader, setDecoderPath to the decoders location under public.
- Testing setup
  - src/setupTests.js includes @testing-library/jest-dom; tests run with Jest via react-scripts.

Container serving and Nginx
- Dockerfile builds the CRA app (node:18-alpine), then serves /build via nginx:alpine. It copies nginx.conf and docker-entrypoint.sh.
- nginx.conf
  - SPA routing: try_files $uri $uri/ /index.html;
  - Caching headers for static assets; basic security headers; /health endpoint returns 200.
- docker-entrypoint.sh
  - Replaces REACT_APP_* placeholders in built JS with environment variable values, then execs Nginx.

Notes
- Linting is managed by CRA (ESLint) during development and build; there is no standalone lint script in package.json.
- No CLAUDE, Cursor, or Copilot instruction files were found. The top-level README.md is the default CRA README and its key points are reflected above (start dev server, run tests, build).
