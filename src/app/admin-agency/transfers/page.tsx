import { TransferRequestsTable } from "@/components/admin/transfer-requests-table";

export default function PendingTransfersPage() {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">Transfer Agen</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Tinjau dan setujui permintaan pemindahan agen antar agensi di sini.
                </p>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Permintaan Menunggu Keputusan</h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">Daftar agen yang ingin masuk ke agensi Anda.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <TransferRequestsTable />
                </div>
            </div>
        </div>
    );
}
