"use client";

import { useState } from "react";
import { AgencyAgent, AgencyClient } from "@/services/admin-agency";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserCog } from "lucide-react";

interface ClientsTableProps {
    clients: AgencyClient[];
    agents: AgencyAgent[];
}

export function ClientsTable({ clients: initialClients, agents }: ClientsTableProps) {
    const [clients, setClients] = useState(initialClients);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<string>("");
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<AgencyClient | null>(null);

    const handleReassignClick = (client: AgencyClient) => {
        setSelectedClient(client);
        setSelectedAgent(client.agent_id);
        setModalOpen(true);
    };

    const handleConfirmReassign = async () => {
        if (!selectedClient || !selectedAgent) return;
        if (selectedAgent === selectedClient.agent_id) {
            setModalOpen(false);
            return;
        }

        setProcessingId(selectedClient.client_id);
        try {
            const res = await fetch("/api/admin-agency/clients/reassign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId: selectedClient.client_id, newAgentId: selectedAgent }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to reassign");
            }

            toast({
                title: "Success",
                description: `Client reassigned successfully.`,
            });

            // Optimistic update
            const newAgentName = agents.find(a => a.user_id === selectedAgent)?.full_name || "Unknown";
            setClients(prev => prev.map(c =>
                c.client_id === selectedClient.client_id
                    ? { ...c, agent_id: selectedAgent, agent_name: newAgentName }
                    : c
            ));
            setModalOpen(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to reassign client.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <>
            <div className="w-full">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                            <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Nama Klien</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Total Polis</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Agen Pendamping</TableHead>
                            <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11 text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                                    <p className="text-sm">Tidak ada data klien yang ditemukan.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map((client) => (
                                <TableRow key={client.client_id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="px-6 font-semibold text-sm text-gray-900">{client.full_name}</TableCell>
                                    <TableCell className="text-sm text-gray-600 font-medium">{client.total_policies} polis aktif</TableCell>
                                    <TableCell className="text-sm text-gray-600 font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                <UserCog className="h-3 w-3 text-gray-500" />
                                            </div>
                                            {client.agent_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 shadow-sm border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                            onClick={() => handleReassignClick(client)}
                                            disabled={processingId === client.client_id}
                                        >
                                            <UserCog className="h-4 w-4 mr-1.5" />
                                            Pindahkan Agen
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pindahkan Klien</DialogTitle>
                        <DialogDescription>
                            Pilih agen pendamping baru untuk <strong>{selectedClient?.full_name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Agen Baru" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map(agent => (
                                        <SelectItem key={agent.user_id} value={agent.user_id}>
                                            {agent.full_name} ({agent.total_policies} polis)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="outline" className="border-gray-200" onClick={() => setModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="button" className="bg-gray-900 hover:bg-black text-white px-6 shadow-sm font-semibold" onClick={handleConfirmReassign} disabled={processingId !== null}>
                            {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konfirmasi Pemindahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
