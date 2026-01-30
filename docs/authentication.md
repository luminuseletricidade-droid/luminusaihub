# Authentication Documentation

## Overview
The application currently relies on a custom JWT-based authentication flow provided by the FastAPI backend. Tokens are issued after validating user credentials against the PostgreSQL database and are stored in the browser's `localStorage`. This document describes the current implementation and outlines recommended improvements to harden the approach.

## Current Method
- **Sign-up**: `POST /api/auth/signup` – creates a user record via `SupabaseDB.create_user` with password hashing (`bcrypt`).
- **Sign-in**: `POST /api/auth/signin` – verifies credentials and issues a JWT using `auth.create_access_token`.
- **Token contents**: HS256 signed payload containing `sub` (user id), `email`, `exp`, and `iat`.
- **Client storage**: The token and user data are persisted in `localStorage` by `AuthContext`.
- **Session validation**: `GET /api/auth/user` decodes the bearer token and returns the associated user.
- **Logout**: `POST /api/auth/signout` triggers client-side storage cleanup; no server-side revocation is performed.
- **Expiration**: Tokens are valid for 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440`). There is no refresh-token flow.

## Authorization
- FastAPI endpoints rely on the `verify_token` dependency to decode the JWT and reject invalid credentials.
- Database operations filter on `user_id` to enforce ownership, complementing Supabase Row Level Security policies.
- Admin endpoints reuse the same mechanism; role-based checks are still manual and should be expanded.

## Security Considerations
- Tokens stored in `localStorage` can be exposed via XSS attacks; switching to HTTP-only cookies or secure storage is recommended.
- Shared secrets must be rotated and sourced from environment variables (default values are unsafe for production).
- Lack of refresh tokens means sessions silently expire, degrading user experience.
- Rate limiting and brute-force protection are not enforced server-side.
- RLS policies should be audited to ensure they align with the custom auth approach.

## Improvement Roadmap
1. **Secret Management**
   - Enforce strong `JWT_SECRET` values in each environment and rotate them regularly.
   - Fail fast during startup if secrets are missing or use insecure defaults.
2. **Token Delivery**
   - Migrate to HTTP-only cookies with SameSite/secure attributes to mitigate XSS.
   - Introduce refresh tokens with short-lived access tokens to reduce exposure.
3. **Session Management**
   - Track active sessions in the database to support revocation and device management.
   - Implement idle timeout and force re-authentication if suspicious activity is detected.
4. **Brute-force Protection**
   - Add rate limiting and IP-based throttling on auth endpoints.
   - Consider CAPTCHA or step-up verification after repeated failures.
5. **Future Options**
   - Evaluate Supabase Auth or another managed provider if the project needs MFA, SSO, or enterprise features.
   - Document migration plans separately once requirements are confirmed.

## Testing Checklist
- Successful registration stores hashed passwords only.
- Login issues a JWT and stores it according to the client storage strategy.
- Expired tokens are rejected and trigger a clean logout.
- Unauthorized requests return HTTP 401 with sanitized error messages.
- Role-restricted endpoints deny users lacking the required privileges.

## References
- Backend implementation: `backend/auth.py`, `backend/main.py`
- Client context: `src/contexts/AuthContext.tsx`
- API utilities: `src/services/api.ts`
