"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ActionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  destructive?: boolean;
  loading?: boolean;
};

export function ActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "OK",
  cancelText = "Batal",
  onConfirm,
  destructive = false,
  loading = false,
}: ActionModalProps) {
  const isConfirmation = Boolean(onConfirm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {isConfirmation ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelText}
              </Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                onClick={onConfirm}
                disabled={loading}
              >
                {confirmText}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>{confirmText}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
