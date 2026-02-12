"use client";

import { useMemo } from "react";
import { AlertTriangle, Phone, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EmergencyButtonProps = {
  unitLabel?: string;
};

export function EmergencyButton({ unitLabel = "Tim Rumah Sakit" }: EmergencyButtonProps) {
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-6 right-6 z-50 h-12 rounded-full bg-red-600 px-5 text-white shadow-xl hover:bg-red-700"
        >
          <Siren className="mr-2 h-4 w-4" />
          Darurat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Bantuan Darurat
          </DialogTitle>
          <DialogDescription>
            Gunakan ini hanya untuk kondisi kritis. Waktu akses: {nowLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>Langkah cepat:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Hubungi nomor darurat nasional `119`.</li>
            <li>Hubungi {unitLabel} untuk eskalasi kasus.</li>
            <li>Catat nomor klaim dan kondisi pasien secara singkat.</li>
          </ul>
        </div>

        <DialogFooter className="sm:justify-start gap-2">
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <a href="tel:119">
              <Phone className="mr-2 h-4 w-4" />
              Telepon 119
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="tel:+620000000000">Hubungi Tim</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
