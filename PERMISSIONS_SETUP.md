# Permissions System Setup

This document explains how to set up the permissions system for The Oracle.

## Database Schema Updates

The permissions system requires additional database tables and columns. Run the schema update script:

```bash
# For local PostgreSQL
PGPASSWORD=your_password ./scripts/apply-schema-updates.sh

# Or manually with psql
psql $POSTGRES_URL -f lib/db/schema-updates.sql
```

## What Gets Added

1. **Role Column** (`users.role`): Adds role-based access control
   - Values: `admin`, `team_admin`, `member`
   - Default: `member`

2. **User Team Permissions Table** (`user_team_permissions`): Granular permissions per user per team
   - `can_view_reports`
   - `can_create_reports`
   - `can_edit_reports`
   - `can_delete_reports`
   - `can_upload_files`
   - `can_delete_files`
   - `can_share_files`
   - `can_manage_team`

3. **Updated Timestamps**: Automatic `updated_at` triggers for all tables

## Setting Up Admin Users

After applying the schema, set admin users:

```sql
-- Set existing admin users
UPDATE users SET role='admin' WHERE email LIKE '%admin%' OR email = 'admin@example.com';

-- Or set specific users
UPDATE users SET role='admin' WHERE email = 'your-admin@example.com';
```

## Roles Explained

- **admin**: Full system access, can manage everything
- **team_admin**: Can manage their team and team members
- **member**: Standard user with basic permissions (can be customized per team)

## Permissions System

Permissions are checked at multiple levels:

1. **Role-based**: Admin > Team Admin > Member
2. **Team-specific**: Each user can have custom permissions per team
3. **Default permissions**: Applied when no explicit permissions are set

## Usage

### Admin Dashboard

Access at `/admin` (admin users only):

- **Users Tab**: Full CRUD on user accounts
  - Create, edit, delete users
  - Assign roles (admin, team_admin, member)
  - Assign users to teams
  - Reset passwords

- **Teams Tab**: Full CRUD on teams
  - Create, edit, delete teams
  - Manage team members
  - Set permissions per user per team

### Permissions Management

1. Go to Teams tab
2. Click "Members" on a team
3. Click "Permissions" next to a user
4. Configure granular permissions for that user in that team

## API Endpoints

### User Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Team Management
- `GET /api/admin/teams` - List all teams
- `POST /api/admin/teams` - Create team
- `GET /api/admin/teams/[id]` - Get team details
- `PATCH /api/admin/teams/[id]` - Update team
- `DELETE /api/admin/teams/[id]` - Delete team
- `POST /api/admin/teams/[id]/members` - Add member
- `DELETE /api/admin/teams/[id]/members` - Remove member

### Permissions
- `GET /api/admin/permissions/[userId]/[teamId]` - Get permissions
- `PATCH /api/admin/permissions/[userId]/[teamId]` - Update permissions

