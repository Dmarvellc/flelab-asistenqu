"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ShieldAlert } from "lucide-react";
import {
  TYPE_LABELS,
  RELATION_LABELS,
  type ClientRequestType,
  type RequestedByRelation,
} from "./types";

/**
 * Agent-side modal to create a new client request.
 *
 * The "Atas permintaan siapa" field is mandatory — without it, the audit
 * trail (the whole point of this system, per meeting notes) is useless.
 * Default is "unknown" to keep data honest when the agent isn't sure.
 */
export function NewClientRequestDialog({
  clientId,
  hospitalId,
  claimId,
  onCreated,
  triggerLabel = "Buat Request",
}: {
  clientId: string;
  hospitalId: string;
  claimId?: string | null;
  onCreated?: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ClientRequestType>("room_upgrade");
  const [relation, setRelation] = useState<RequestedByRelation>("client_self");
  const [relationName, setRelationName] = useState("");
  const [notes, setNotes] = useState("");

  // Type-specific fields
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");
  const [extendDays, setExtendDays] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [otherDetail, setOtherDetail] = useState("");

  const needsRoomFields = ["room_upgrade", "room_downgrade", "transfer_room"].includes(type);
  const needsExtend = type === "extend_stay";
  const needsMed = type === "add_medication";
  const needsSpecialist = type === "request_specialist";
  const needsOtherText = type === "other" || type === "add_treatment";

  const reset = () => {
    setType("room_upgrade");
    setRelation("client_self");
    setRelationName("");
    setNotes("");
    setFromClass("");
    setToClass("");
    setExtendDays("");
    setMedicationName("");
    setSpecialist("");
    setOtherDetail("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (relation === "family" && !relationName.trim()) {
      setError("Sebutkan nama / hubungan keluarga yang mengajukan.");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (needsRoomFields) {
      payload.from_class = fromClass.trim();
      payload.to_class = toClass.trim();
    }
    if (needsExtend) payload.extend_days = Number(extendDays) || null;
    if (needsMed) payload.medication = medicationName.trim();
    if (needsSpecialist) payload.specialist = specialist.trim();
    if (needsOtherText) payload.detail = otherDetail.trim();

    setSubmitting(true);
    try {
      const res = await fetch("/api/client-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          hospitalId,
          claimId: claimId ?? null,
          requestType: type,
          payload,
          notes: notes.trim() || undefined,
          requestedByRelation: relation,
          requestedByName: relationName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Gagal (${res.status})`);
      }
      setOpen(false);
      reset();
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat permintaan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Permintaan ke Rumah Sakit</DialogTitle>
          <DialogDescription>
            Permintaan ini akan tersimpan permanen sebagai jejak digital.
            Semua tindakan akan tercatat waktu & penanggungjawabnya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Request type */}
          <div className="space-y-2">
            <Label>Jenis Permintaan</Label>
            <Select value={type} onValueChange={(v) => setType(v as ClientRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {needsRoomFields && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dari kelas</Label>
                <Input
                  placeholder="mis. Standar / 500rb"
                  value={fromClass}
                  onChange={(e) => setFromClass(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ke kelas</Label>
                <Input
                  placeholder="mis. VIP / 1jt"
                  value={toClass}
                  onChange={(e) => setToClass(e.target.value)}
                />
              </div>
            </div>
          )}
          {needsExtend && (
            <div className="space-y-2">
              <Label>Perpanjangan (hari)</Label>
              <Input
                type="number"
                min={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
            </div>
          )}
          {needsMed && (
            <div className="space-y-2">
              <Label>Nama obat</Label>
              <Input
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
              />
            </div>
          )}
          {needsSpecialist && (
            <div className="space-y-2">
              <Label>Spesialis</Label>
              <Input
                placeholder="mis. Jantung, Ortopedi"
                value={specialist}
                onChange={(e) => setSpecialist(e.target.value)}
              />
            </div>
          )}
          {needsOtherText && (
            <div className="space-y-2">
              <Label>Detail</Label>
              <Textarea
                rows={2}
                value={otherDetail}
                onChange={(e) => setOtherDetail(e.target.value)}
                placeholder={
                  type === "add_treatment"
                    ? "Sebutkan tindakan yang diajukan"
                    : "Detail permintaan"
                }
              />
            </div>
          )}

          {/* Who asked */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Jejak digital:</strong> field ini penting untuk
                perlindungan agen bila ada komplain dari klien/keluarga.
              </span>
            </div>
            <div className="space-y-2">
              <Label>Atas permintaan siapa?</Label>
              <Select
                value={relation}
                onValueChange={(v) => setRelation(v as RequestedByRelation)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {relation === "family" && (
              <div className="space-y-2">
                <Label>Nama / hubungan (wajib)</Label>
                <Input
                  placeholder="mis. Bu Sari (istri klien)"
                  value={relationName}
                  onChange={(e) => setRelationName(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Info tambahan untuk marketing RS"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Kirim Permintaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
