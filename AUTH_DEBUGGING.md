# Admin UI Access Debugging

## Issue Summary
User cannot access the admin UI at `/admin` after logging in with `admin@example.com`.

## Root Cause Found
The environment variables (`NEXTAUTH_URL` and `NEXTAUTH_SECRET`) were not being loaded by the Next.js dev server.

## Fixes Applied

### 1. Restarted Dev Server
The dev server has been restarted to pick up the `.env` file with the correct environment variables.

### 2. Verified Environment
- ✅ NEXTAUTH_URL: `http://localhost:3000`
- ✅ NEXTAUTH_SECRET: Set (64 characters)
- ✅ POSTGRES_URL: Connected to local PostgreSQL

### 3. Verified Database
- ✅ User `admin@example.com` exists
- ✅ Password hash is correct (verified with bcrypt)
- ✅ Password `password123` validates successfully

### 4. Auth Flow Status
- ✅ CSRF endpoint working (`/api/auth/csrf`)
- ✅ NextAuth initialized correctly
- ⚠️  Login callback needs browser testing

## Next Steps for User

### To access the admin UI:

1. **Clear your browser cache and cookies** for localhost:3000
   - Chrome/Edge: DevTools (F12) → Application → Clear storage → Clear site data
   - Firefox: DevTools (F12) → Storage → Cookies → Delete all
   - Safari: Develop → Empty Caches

2. **Open a fresh incognito/private window**

3. **Navigate to** http://localhost:3000/login

4. **Login with:**
   - Email: `admin@example.com`
   - Password: `password123`

5. **After successful login:**
   - You should be redirected to `/reports`
   - In the navigation bar, you should see an "Admin" button (shield icon)
   - Click "Admin" to access `/admin`

### If login still fails:

Check the browser console (F12) for errors and the terminal where `npm run dev` is running for server-side logs. The logs should show:

- `Auth: Login successful for: admin@example.com` (success)
- OR `Auth: User not found:` / `Auth: Invalid password for:` (failure)

## Admin UI Features

Once you access `/admin`, you'll be able to:

- **User Management**
  - View all users
  - Create new users
  - Edit user details (name, email, password, role, team)
  - Delete users
  - Assign user roles (admin, team_admin, member)

- **Team Management**
  - View all teams
  - Create new teams
  - Edit team names
  - Delete teams (if no members)
  - Manage team members (add/remove)
  - Set granular permissions per user per team

- **Permissions System**
  - `can_view_reports`
  - `can_create_reports`
  - `can_edit_reports`
  - `can_delete_reports`
  - `can_upload_files`
  - `can_delete_files`
  - `can_share_files`
  - `can_manage_team`

## Verification

The auth system has been audited (see `AUTH_AUDIT.md`) and all routes are backward compatible with databases that may not have the `role` column yet.

Current status: **Dev server running with correct environment variables. Ready for browser testing.**

