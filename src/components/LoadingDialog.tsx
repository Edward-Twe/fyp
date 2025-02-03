// src/components/LoadingDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
  import { Loader2 } from "lucide-react"
  import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
  
  interface LoadingDialogProps {
    isOpen: boolean;
  }
  
  export function LoadingDialog({ isOpen }: LoadingDialogProps) {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="sm:max-w-[425px] flex items-center justify-center min-h-[150px]">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>Loading</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Optimizing routes...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }