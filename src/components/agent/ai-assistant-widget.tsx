"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Bot, X, Send, Copy, Check, Sparkles,
    ClipboardList, Users, Search, TriangleAlert,
    Loader2, ChevronDown, Zap, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useFabVisibility } from "@/hooks/use-fab-visibility";
import { usePathname } from "next/navigation";

const WELCOME_TEXT =
    "Halo! Saya Natalie, asisten AI Anda yang terhubung ke data klaim, klien, dan jaringan RS.\n\nSaya bisa bantu briefing harian, analisis klaim, cari klien, rekomendasi RS, atau buatkan draf pesan WhatsApp — cukup tanya saja.";

// ─── Tool call display names ───────────────────────────────────────────────────

const TOOL_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
    get_daily_briefing: { label: "Memeriksa agenda hari ini...", icon: ClipboardList },
    search_clients: { label: "Mencari klien...", icon: Search },
    get_client_details: { label: "Membuka profil klien...", icon: Users },
    get_claim_details: { label: "Memeriksa detail klaim...", icon: ClipboardList },
    find_hospitals: { label: "Mencari rumah sakit...", icon: Search },
    draft_whatsapp: { label: "Menyiapkan draf pesan...", icon: Sparkles },
    analyze_claim_risk: { label: "Menganalisis risiko klaim...", icon: TriangleAlert },
};

// ─── Predefined prompts (context-sensitive) ────────────────────────────────────

const QUICK_PROMPTS = [
    { label: "Briefing hari ini", prompt: "Apa yang perlu saya lakukan hari ini? Berikan briefing lengkap.", icon: ClipboardList },
    { label: "Cari klien", prompt: "Tolong carikan klien saya — ketikkan namanya setelah ini.", icon: Search },
    { label: "Analisis klaim", prompt: "Bantu saya analisis risiko klaim. Nomor klaimnya?", icon: TriangleAlert },
    { label: "Draf WA premi", prompt: "Buatkan draf WhatsApp pengingat premi yang hangat dan persuasif.", icon: Sparkles },
];

// ─── UIMessage helpers ─────────────────────────────────────────────────────────

function textFromMessage(msg: UIMessage): string {
    return msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map(p => p.text)
        .join("");
}

type ToolBadgeItem = { toolName: string; state: "call" | "result" };

function toolBadgesFromMessage(msg: UIMessage): ToolBadgeItem[] {
    const out: ToolBadgeItem[] = [];
    for (const p of msg.parts) {
        if (typeof p.type === "string" && p.type.startsWith("tool-")) {
            const toolName = p.type.slice("tool-".length);
            const st = (p as { state?: string }).state;
            out.push({
                toolName,
                state: st === "output-available" || st === "output-error" ? "result" : "call",
            });
        }
    }
    return out;
}

// ─── UI pieces ────────────────────────────────────────────────────────────────

function ToolCallBadge({ toolName, state }: { toolName: string; state: "call" | "result" }) {
    const meta = TOOL_LABELS[toolName] ?? { label: toolName, icon: Zap };
    const Icon = meta.icon;
    const isDone = state === "result";

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium w-fit",
                isDone
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
            )}
        >
            {isDone ? (
                <Check className="h-3 w-3 text-emerald-600 shrink-0" />
            ) : (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            )}
            <Icon className="h-3 w-3 shrink-0" />
            <span>{isDone ? meta.label.replace("...", " ✓") : meta.label}</span>
        </motion.div>
    );
}

function MessageBubble({
    msg,
    onCopy,
    copiedId,
}: {
    msg: UIMessage;
    onCopy: (text: string, id: string) => void;
    copiedId: string | null;
}) {
    const isUser = msg.role === "user";
    const content = textFromMessage(msg);
    const toolInvocations = toolBadgesFromMessage(msg);

    return (
        <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
            {!isUser && toolInvocations.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full">
                    {toolInvocations.map((inv, idx) => (
                        <ToolCallBadge
                            key={`${inv.toolName}-${idx}`}
                            toolName={inv.toolName}
                            state={inv.state}
                        />
                    ))}
                </div>
            )}

            {content ? (
                <div
                    className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap select-text",
                        isUser
                            ? "bg-black text-white rounded-br-sm"
                            : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm"
                    )}
                >
                    {content}
                </div>
            ) : null}

            {!isUser && content ? (
                <button
                    type="button"
                    onClick={() => onCopy(content, msg.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors w-max ml-1"
                >
                    {copiedId === msg.id ? (
                        <><Check className="h-3 w-3 text-emerald-500" /> Disalin</>
                    ) : (
                        <><Copy className="h-3 w-3" /> Salin</>
                    )}
                </button>
            ) : null}
        </div>
    );
}

// ─── Position constants ────────────────────────────────────────────────────────

const fabPosition =
    "fixed z-40 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 sm:bottom-6 sm:right-6";
const panelPosition =
    "fixed z-40 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 left-3 sm:left-auto sm:bottom-8 sm:right-8";

// ─── Main widget ───────────────────────────────────────────────────────────────

export function AIAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pathname = usePathname();
    const fabVisible = useFabVisibility({ enabled: !isOpen });

    const initialMessages = useMemo<UIMessage[]>(
        () => [
            {
                id: "welcome",
                role: "assistant",
                parts: [{ type: "text", text: WELCOME_TEXT }],
            },
        ],
        [],
    );

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/ai/agent",
                credentials: "include",
                prepareSendMessagesRequest: ({ messages: reqMessages, body }) => ({
                    body: {
                        ...(typeof body === "object" && body !== null ? body : {}),
                        messages: reqMessages,
                        pageContext: pathname,
                    },
                }),
            }),
        [pathname],
    );

    const { messages, sendMessage, status } = useChat({
        id: "asistenqu-natalie-agent",
        messages: initialMessages,
        transport,
        onError: () => {
            setHasError(true);
            setTimeout(() => setHasError(false), 5000);
        },
    });

    const isBusy = status === "submitted" || status === "streaming";

    const handleCopy = useCallback((text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    const handleOpen = () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    const handleBriefing = () => {
        void sendMessage({
            text: "Berikan briefing harian saya sekarang — klaim prioritas, premi jatuh tempo, dan hal yang perlu saya selesaikan hari ini.",
        });
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isBusy]);

    const hasMessages = messages.length > 1;

    return (
        <>
            {/* ── FAB ── */}
            <motion.button
                data-natalie-fab
                onClick={handleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                aria-label="Buka Natalie AI"
                aria-hidden={!fabVisible}
                tabIndex={fabVisible ? 0 : -1}
                animate={{ y: fabVisible ? 0 : 96, opacity: fabVisible ? 1 : 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={cn(
                    fabPosition,
                    "flex h-12 w-12 sm:h-14 sm:w-auto items-center justify-center sm:justify-start gap-0 sm:gap-3 rounded-full sm:px-5 shadow-lg",
                    "bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.25)] border border-gray-800 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.45)]",
                    !fabVisible && "pointer-events-none",
                    isOpen && "hidden"
                )}
            >
                <div className="relative">
                    <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-black" />
                </div>
                <span className="font-semibold text-[15px] hidden sm:inline">Natalie AI</span>
            </motion.button>

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{
                            opacity: 1, y: 0, scale: 1,
                            height: isExpanded ? "85dvh" : "min(600px, calc(100dvh - 5rem))",
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={cn(
                            panelPosition,
                            "w-full sm:max-w-[380px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl flex flex-col",
                        )}
                    >
                        {/* ── Header ── */}
                        <div className="relative flex items-center justify-between bg-black px-5 py-4 text-white shrink-0">
                            <div className="absolute inset-0 overflow-hidden rounded-t-3xl pointer-events-none">
                                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                                <div className="absolute right-10 -bottom-8 h-24 w-24 rounded-full bg-violet-500/15 blur-2xl" />
                            </div>
                            <div className="relative flex items-center gap-3">
                                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                                    <Bot className="h-4.5 w-4.5 text-white" />
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[14px] leading-none">Natalie AI</h3>
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        Terhubung ke database
                                    </p>
                                </div>
                            </div>
                            <div className="relative flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(v => !v)}
                                    className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                    title={isExpanded ? "Perkecil" : "Perbesar"}
                                >
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {!hasMessages && (
                            <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-blue-50 border-b border-gray-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleBriefing}
                                    disabled={isBusy}
                                    className="w-full flex items-center gap-3 rounded-xl bg-white border border-violet-200 px-4 py-2.5 text-[13px] font-medium text-violet-800 hover:bg-violet-50 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                                    <span className="text-left">Lihat briefing & prioritas hari ini</span>
                                    <span className="ml-auto text-[11px] text-violet-400 font-normal whitespace-nowrap">Tap untuk mulai</span>
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/40">
                            {messages.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    onCopy={handleCopy}
                                    copiedId={copiedId}
                                />
                            ))}

                            <AnimatePresence>
                                {hasError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-[12px] text-red-700"
                                    >
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            Asisten AI tidak dapat dihubungi sementara. Silakan coba lagi dalam beberapa
                                            saat.
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isBusy && (
                                <div className="flex items-start gap-2">
                                    <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-bl-sm flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                        <span className="text-[11px] text-gray-400">Natalie sedang berpikir...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {!hasMessages && !isBusy && (
                            <div className="px-4 py-2.5 flex flex-wrap gap-2 bg-white border-t border-gray-50 shrink-0">
                                {QUICK_PROMPTS.map(({ label, prompt, icon: Icon }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => void sendMessage({ text: prompt })}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 hover:text-black transition-colors"
                                    >
                                        <Icon className="h-3 w-3 text-gray-400 shrink-0" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="border-t border-gray-100 bg-white p-4 shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const t = input.trim();
                                    if (!t || isBusy) return;
                                    void sendMessage({ text: t });
                                    setInput("");
                                }}
                                className="relative flex items-end gap-2"
                            >
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            e.currentTarget.form?.requestSubmit();
                                        }
                                    }}
                                    placeholder="Tanya Natalie apa saja..."
                                    className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none min-h-[48px] max-h-[120px] leading-relaxed pr-12"
                                    rows={1}
                                    disabled={isBusy}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isBusy}
                                    className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isBusy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </form>
                            <p className="mt-2 text-center text-[10px] text-gray-400">
                                Natalie terhubung ke data real-time · AI dapat keliru
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
