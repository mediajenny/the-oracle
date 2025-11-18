"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Share2, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface ShareDialogProps {
  fileId?: string
  reportId?: string
  onShareComplete?: () => void
}

interface TeamMember {
  id: string
  name: string
  email: string
}

export function ShareDialog({
  fileId,
  reportId,
  onShareComplete,
}: ShareDialogProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [shareType, setShareType] = useState<"user" | "team">("user")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && shareType === "team" && session?.user?.teamId) {
      fetchTeamMembers()
    }
  }, [open, shareType, session])

  const fetchTeamMembers = async () => {
    try {
      // In a real app, you'd fetch team members from an API
      // For now, we'll use a placeholder
      setTeamMembers([])
    } catch (error) {
      console.error("Failed to fetch team members:", error)
    }
  }

  const handleShare = async () => {
    if (shareType === "user" && !selectedUserId) {
      setError("Please select a user")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          reportId,
          sharedWithUserId: shareType === "user" ? selectedUserId : null,
          sharedWithTeamId: shareType === "team" ? session?.user?.teamId : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Sharing failed")
      }

      setOpen(false)
      if (onShareComplete) {
        onShareComplete()
      }
    } catch (err: any) {
      setError(err.message || "Failed to share")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {fileId ? "File" : "Report"}</DialogTitle>
          <DialogDescription>
            Share this {fileId ? "file" : "report"} with team members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Share with</Label>
            <Select value={shareType} onValueChange={(value: "user" | "team") => setShareType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Specific User</SelectItem>
                <SelectItem value="team">Entire Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shareType === "user" && (
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input
                placeholder="user@example.com"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address of the user to share with
              </p>
            </div>
          )}

          {shareType === "team" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will be shared with all members of your team:{" "}
                <strong>{session?.user?.teamName || "Your Team"}</strong>
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                "Share"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

