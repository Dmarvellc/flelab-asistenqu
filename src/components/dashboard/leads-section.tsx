
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrphanPolicy } from "@/services/policies"
import { UserPlus, MapPin, FileText } from "lucide-react"

interface LeadsSectionProps {
    policies: OrphanPolicy[];
}

export function LeadsSection({ policies }: LeadsSectionProps) {
    if (policies.length === 0) {
        return null;
    }

    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-green-600" />
                    Polis Tersedia (Leads)
                </CardTitle>
                <CardDescription>
                    Polis berikut belum memiliki agen. Ambil kesempatan ini untuk menambah portfolio Anda.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {policies.map((policy) => (
                        <div key={policy.contract_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="space-y-1">
                                <p className="font-medium text-sm flex items-center gap-2">
                                    {policy.client_name}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {policy.contract_product} ({policy.contract_number})
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {policy.client_address || 'Unknown Address'}
                                    </span>
                                </div>
                            </div>
                            <Button size="sm" variant="secondary">Ambil</Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
