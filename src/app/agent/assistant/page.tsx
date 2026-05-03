import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AgentAssistantPage() {
    return (
        <div className="flex flex-col h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-6rem)]">
            <div className="mb-4 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight">AI Asisten</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Tersambung ke data performa Anda. Tanya analisis, draf pesan, atau pengingat klaim.
                </p>
            </div>
            <div className="flex-1 min-h-0">
                <AssistantChat
                    api="/api/ai/agent"
                    initialAssistantMessage="Halo! Saya Asisten AI Anda yang tersambung ke data performa Anda. Saya siap membantu menyusun draf pesan ke klien, mengingatkan syarat klaim, atau menganalisis pencapaian polis hari ini."
                    quickPrompts={[
                        "Draf rekapan performa saya bulan ini",
                        "Syarat klaim rawat inap?",
                        "Ucapan ultah untuk klien",
                    ]}
                />
            </div>
        </div>
    );
}
