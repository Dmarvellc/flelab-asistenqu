import { TransferRequestsTable } from "@/components/admin/transfer-requests-table";

export default function PendingTransfersPage() {
    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">Transfer Agen</h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        Tinjau dan setujui permintaan pemindahan agen antar agensi di sini.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-white flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-black">Permintaan Menunggu Keputusan</h2>
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
