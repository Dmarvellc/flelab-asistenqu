
import { Button } from "@/components/ui/button"
import { OrphanPolicy } from "@/services/policies"
import { UserPlus, MapPin, FileText, Sparkles } from "lucide-react"

interface LeadsSectionProps {
    policies: OrphanPolicy[];
}

export function LeadsSection({ policies }: LeadsSectionProps) {
    if (policies.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gray-900 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Polis Tersedia (Leads)</h3>
                        <p className="text-xs text-gray-400">{policies.length} polis tanpa agen</p>
                    </div>
                </div>
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black text-white text-xs font-bold px-2">
                    {policies.length}
                </span>
            </div>

            <div className="divide-y divide-gray-50">
                {policies.map((policy) => (
                    <div
                        key={policy.contract_id}
                        className="group flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600 font-bold text-sm group-hover:bg-gray-900 group-hover:text-white transition-all duration-200">
                                {policy.client_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{policy.client_name}</p>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {policy.contract_product} · {policy.contract_number}
                                    </span>
                                    {policy.client_address && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {policy.client_address}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="h-8 rounded-xl bg-black hover:bg-gray-900 text-white text-xs font-medium gap-1.5 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            Ambil
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
