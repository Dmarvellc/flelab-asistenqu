import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AdminAgencyAssistantPage() {
    return (
        <div className="flex flex-col h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-6rem)]">
            <div className="mb-4 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight">AI Asisten</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Asisten AI untuk admin agensi — kinerja live, draf komunikasi, analisis tren.
                </p>
            </div>
            <div className="flex-1 min-h-0">
                <AssistantChat
                    api="/api/ai/agency"
                    initialAssistantMessage="Halo Admin Agensi! Saya adalah Asisten AI Anda. Saya telah membaca kinerja live perusahaan Anda dari database."
                    quickPrompts={[
                        "Draft email motivasi ke agen",
                        "Analisis tren performa saat ini",
                        "Apa itu Rasio Lapse?",
                    ]}
                />
            </div>
        </div>
    );
}
