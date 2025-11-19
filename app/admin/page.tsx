"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Building2, Plus, Edit, Trash2, Shield, Settings, UserPlus, UserMinus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

interface User {
  id: string
  email: string
  name: string | null
  role: string
  team_id: string | null
  team_name: string | null
  created_at: string
  report_count: number
  file_count: number
}

interface Team {
  id: string
  name: string
  created_at: string
  member_count: number
  members?: Array<{
    id: string
    email: string
    name: string | null
    role: string
  }>
}

interface Permissions {
  can_view_reports: boolean
  can_create_reports: boolean
  can_edit_reports: boolean
  can_delete_reports: boolean
  can_upload_files: boolean
  can_delete_files: boolean
  can_share_files: boolean
  can_manage_team: boolean
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [teamMembersDialogOpen, setTeamMembersDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    teamId: "",
    role: "member",
  })
  const [teamFormData, setTeamFormData] = useState({
    name: "",
  })
  const [permissions, setPermissions] = useState<Permissions>({
    can_view_reports: true,
    can_create_reports: true,
    can_edit_reports: false,
    can_delete_reports: false,
    can_upload_files: true,
    can_delete_files: false,
    can_share_files: true,
    can_manage_team: false,
  })
  const [error, setError] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      // Check if admin - use API to check role
      checkAdmin()
    }
  }, [status, session, router])

  const checkAdmin = async () => {
    try {
      setLoading(true)
      console.log("[AdminPage] Checking admin access...")
      console.log("[AdminPage] Session user ID:", session?.user?.id)
      console.log("[AdminPage] Session user email:", session?.user?.email)

      const response = await fetch("/api/admin/users")
      console.log("[AdminPage] API response status:", response.status)

      if (response.status === 403) {
        // Not admin, redirect
        const errorData = await response.json().catch(() => ({}))
        console.error("[AdminPage] Admin check failed - 403 Forbidden", errorData)
        console.log("[AdminPage] Session details:", {
          userId: session?.user?.id,
          email: session?.user?.email,
          status: response.status,
          error: errorData
        })
        console.log("[AdminPage] Redirecting to /reports in 3 seconds...")
        // Add delay so logs are visible before redirect
        setTimeout(() => {
          router.push("/reports")
        }, 3000)
        return
      } else if (response.ok) {
        // Admin confirmed, fetch all data
        console.log("[AdminPage] Admin access confirmed, fetching data...")
        await fetchData()
      } else {
        // Unexpected error
        const errorData = await response.json().catch(() => ({}))
        console.error("[AdminPage] Unexpected error:", response.status, errorData)
        setError("Failed to verify admin access")
        setLoading(false)
      }
    } catch (err) {
      console.error("[AdminPage] Admin check error:", err)
      setError("Failed to verify admin access. Please refresh the page.")
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, teamsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/teams"),
      ])

      if (!usersRes.ok || !teamsRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const usersData = await usersRes.json()
      const teamsData = await teamsRes.json()

      setUsers(usersData.users || [])
      setTeams(teamsData.teams || [])
    } catch (err: any) {
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamDetails = async (teamId: string) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedTeam(data.team)
      }
    } catch (err) {
      console.error("Failed to fetch team details:", err)
    }
  }

  const handleCreateUser = async () => {
    try {
      setSaving(true)
      setError("")
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create user")
      }

      await fetchData()
      setUserDialogOpen(false)
      setFormData({ email: "", password: "", name: "", teamId: "", role: "member" })
    } catch (err: any) {
      setError(err.message || "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    try {
      setSaving(true)
      setError("")
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user")
      }

      await fetchData()
      setUserDialogOpen(false)
      setEditingUser(null)
      setFormData({ email: "", password: "", name: "", teamId: "", role: "member" })
    } catch (err: any) {
      setError(err.message || "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/users/${userToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      await fetchData()
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete user")
    }
  }

  const handleCreateTeam = async () => {
    try {
      setSaving(true)
      setError("")
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create team")
      }

      await fetchData()
      setTeamDialogOpen(false)
      setTeamFormData({ name: "" })
    } catch (err: any) {
      setError(err.message || "Failed to create team")
    } finally {
      setSaving(false)
    }
  }

  const handleEditTeam = async () => {
    if (!editingTeam) return

    try {
      setSaving(true)
      setError("")
      const response = await fetch(`/api/admin/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update team")
      }

      await fetchData()
      setTeamDialogOpen(false)
      setEditingTeam(null)
      setTeamFormData({ name: "" })
    } catch (err: any) {
      setError(err.message || "Failed to update team")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return

    try {
      const response = await fetch(`/api/admin/teams/${teamToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete team")
      }

      await fetchData()
      setDeleteDialogOpen(false)
      setTeamToDelete(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete team")
    }
  }

  const handleAddTeamMember = async (userId: string) => {
    if (!selectedTeam) return

    try {
      const response = await fetch(`/api/admin/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to add team member")
      }

      await fetchTeamDetails(selectedTeam.id)
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to add team member")
    }
  }

  const handleRemoveTeamMember = async (userId: string) => {
    if (!selectedTeam) return

    try {
      const response = await fetch(`/api/admin/teams/${selectedTeam.id}/members?userId=${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove team member")
      }

      await fetchTeamDetails(selectedTeam.id)
      await fetchData()
    } catch (err: any) {
      setError(err.message || "Failed to remove team member")
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedUser || !selectedTeam) return

    try {
      setSaving(true)
      setError("")
      const response = await fetch(`/api/admin/permissions/${selectedUser.id}/${selectedTeam.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissions),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update permissions")
      }

      setPermissionsDialogOpen(false)
      setSelectedUser(null)
      setSelectedTeam(null)
    } catch (err: any) {
      setError(err.message || "Failed to update permissions")
    } finally {
      setSaving(false)
    }
  }

  const openEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      teamId: user.team_id || "",
      role: user.role || "member",
    })
    setUserDialogOpen(true)
  }

  const openEditTeam = (team: Team) => {
    setEditingTeam(team)
    setTeamFormData({ name: team.name })
    setTeamDialogOpen(true)
  }

  const openPermissionsDialog = async (user: User, team: Team) => {
    setSelectedUser(user)
    setSelectedTeam(team)

    try {
      const response = await fetch(`/api/admin/permissions/${user.id}/${team.id}`)
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions)
      }
    } catch (err) {
      console.error("Failed to load permissions:", err)
    }

    setPermissionsDialogOpen(true)
  }

  const openTeamMembers = async (team: Team) => {
    setSelectedTeam(team)
    await fetchTeamDetails(team.id)
    setTeamMembersDialogOpen(true)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "team_admin":
        return "default"
      default:
        return "secondary"
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage users, teams, and permissions
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            User Management ({users.length})
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Building2 className="mr-2 h-4 w-4" />
            Teams ({teams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts and roles
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingUser(null)
                  setFormData({ email: "", password: "", name: "", teamId: "", role: "member" })
                  setUserDialogOpen(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name || user.email}</span>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email} • {user.team_name || "No team"} • {user.report_count} reports • {user.file_count} files
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditUser(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserToDelete(user.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teams</CardTitle>
                  <CardDescription>
                    Manage teams and members
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingTeam(null)
                  setTeamFormData({ name: "" })
                  setTeamDialogOpen(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.member_count} member{team.member_count !== 1 ? "s" : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(team.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTeamMembers(team)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Members
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditTeam(team)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTeamToDelete(team.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="team_admin">Team Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? "New Password (leave blank to keep current)" : "Password *"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamId">Team</Label>
              <Select
                value={formData.teamId}
                onValueChange={(value) => setFormData({ ...formData, teamId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingUser ? handleEditUser : handleCreateUser} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editingUser ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Create Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update team information" : "Add a new team to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ name: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingTeam ? handleEditTeam : handleCreateTeam} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTeam ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Members Dialog */}
      <Dialog open={teamMembersDialogOpen} onOpenChange={setTeamMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Members: {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Manage team members and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Member</Label>
              <Select
                onValueChange={(userId) => {
                  if (userId) {
                    handleAddTeamMember(userId)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.team_id !== selectedTeam?.id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              {selectedTeam?.members && selectedTeam.members.length > 0 ? (
                selectedTeam.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{member.name || member.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.email} • <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const user = users.find((u) => u.id === member.id)
                          if (user && selectedTeam) {
                            openPermissionsDialog(user, selectedTeam)
                          }
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Permissions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTeamMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members in this team
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTeamMembersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Permissions: {selectedUser?.name || selectedUser?.email} in {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription>
              Configure team-specific permissions for this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_view_reports"
                  checked={permissions.can_view_reports}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_view_reports: checked === true })
                  }
                />
                <Label htmlFor="can_view_reports" className="cursor-pointer">
                  View Reports
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_create_reports"
                  checked={permissions.can_create_reports}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_create_reports: checked === true })
                  }
                />
                <Label htmlFor="can_create_reports" className="cursor-pointer">
                  Create Reports
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_edit_reports"
                  checked={permissions.can_edit_reports}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_edit_reports: checked === true })
                  }
                />
                <Label htmlFor="can_edit_reports" className="cursor-pointer">
                  Edit Reports
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_delete_reports"
                  checked={permissions.can_delete_reports}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_delete_reports: checked === true })
                  }
                />
                <Label htmlFor="can_delete_reports" className="cursor-pointer">
                  Delete Reports
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_upload_files"
                  checked={permissions.can_upload_files}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_upload_files: checked === true })
                  }
                />
                <Label htmlFor="can_upload_files" className="cursor-pointer">
                  Upload Files
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_delete_files"
                  checked={permissions.can_delete_files}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_delete_files: checked === true })
                  }
                />
                <Label htmlFor="can_delete_files" className="cursor-pointer">
                  Delete Files
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_share_files"
                  checked={permissions.can_share_files}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_share_files: checked === true })
                  }
                />
                <Label htmlFor="can_share_files" className="cursor-pointer">
                  Share Files
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_manage_team"
                  checked={permissions.can_manage_team}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_manage_team: checked === true })
                  }
                />
                <Label htmlFor="can_manage_team" className="cursor-pointer">
                  Manage Team
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDelete ? "Delete User?" : "Delete Team?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {userToDelete ? "the user and all their data" : "the team (members will not be deleted)"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  handleDeleteUser()
                } else if (teamToDelete) {
                  handleDeleteTeam()
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
