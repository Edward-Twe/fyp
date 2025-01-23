"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SaveScheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  scheduleName?: string
}

export function SaveScheduleDialog({
  isOpen,
  onClose,
  onSave,
  scheduleName = ""
}: SaveScheduleDialogProps) {
  const [name, setName] = useState("")

  useEffect(() => {
    if (isOpen) {
      setName(scheduleName)
    }
  }, [isOpen, scheduleName])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      setName("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Schedule Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter schedule name"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

