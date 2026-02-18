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
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Total Policies</TableHead>
                            <TableHead>Current Agent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No clients found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map((client) => (
                                <TableRow key={client.client_id}>
                                    <TableCell className="font-medium">{client.full_name}</TableCell>
                                    <TableCell>{client.total_policies}</TableCell>
                                    <TableCell>{client.agent_name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReassignClick(client)}
                                            disabled={processingId === client.client_id}
                                        >
                                            <UserCog className="h-4 w-4 mr-2" />
                                            Reassign
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
                        <DialogTitle>Reassign Client</DialogTitle>
                        <DialogDescription>
                            Assign <strong>{selectedClient?.full_name}</strong> to a different agent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map(agent => (
                                        <SelectItem key={agent.user_id} value={agent.user_id}>
                                            {agent.full_name} ({agent.total_policies} policies)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleConfirmReassign} disabled={processingId !== null}>
                            {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reassign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
