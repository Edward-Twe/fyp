import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface DistanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempDistance: string;
  onTempDistanceChange: (value: string) => void;
  onConfirm: () => void;
}

export const DistanceDialog = ({
  isOpen,
  onOpenChange,
  tempDistance,
  onTempDistanceChange,
  onConfirm
}: DistanceDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Set Maximum Distance</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="maxDistance" className="col-span-4">
            Maximum distance allowed between two points (in kilometers)
          </Label>
          <Input
            id="maxDistance"
            type="number"
            value={tempDistance}
            onChange={(e) => onTempDistanceChange(e.target.value)}
            className="col-span-4"
            min="0"
            step="0.1"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onConfirm}>
          Continue
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
