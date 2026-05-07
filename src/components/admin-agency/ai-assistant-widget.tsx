"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, MessageSquare, Zap, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useFabVisibility } from "@/hooks/use-fab-visibility";

const PREDEFINED_PROMPTS = [
    "Draft email motivasi ke agen",
    "Analisis tren performa saat ini",
    "Apa itu Rasio Lapse?"
];

function textFromMessage(msg: UIMessage): string {
    return msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map(p => p.text)
        .join("");
}

const fabPosition =
    "fixed z-40 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 sm:bottom-6 sm:right-6";
const panelPosition =
    "fixed z-40 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-3 left-3 sm:left-auto sm:bottom-8 sm:right-8";

export function AIAgencyAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fabVisible = useFabVisibility({ enabled: !isOpen });

    const initialMessages = useMemo<UIMessage[]>(
        () => [
            {
                id: "1",
                role: "assistant",
                parts: [{
                    type: "text",
                    text: "Halo Admin Agensi! Saya adalah Asisten AI Anda. Saya telah membaca kinerja live perusahaan Anda dari database.",
                }],
            },
        ],
        [],
    );

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/ai/agency",
                credentials: "include",
            }),
        [],
    );

    const { messages, sendMessage, status } = useChat({
        id: "asistenqu-admin-agency-ai",
        messages: initialMessages,
        transport,
    });

    const isBusy = status === "submitted" || status === "streaming";

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isBusy]);

    return (
        <>
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                aria-label="Buka AI Asisten"
                aria-hidden={!fabVisible}
                tabIndex={fabVisible ? 0 : -1}
                animate={{
                    y: fabVisible ? 0 : 96,
                    opacity: fabVisible ? 1 : 0,
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={cn(
                    fabPosition,
                    "flex h-12 w-12 sm:h-14 sm:w-auto items-center justify-center sm:justify-start gap-0 sm:gap-3 rounded-full sm:px-5 shadow-lg",
                    "bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-800 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
                    !fabVisible && "pointer-events-none",
                    isOpen && "hidden"
                )}
            >
                <div className="relative flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                </div>
                <span className="font-semibold text-[15px] hidden sm:inline">AI Asisten</span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            panelPosition,
                            "w-full sm:max-w-[360px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl flex flex-col h-[600px] max-h-[min(85vh,calc(100dvh-5rem))]",
                        )}
                    >
                        <div className="relative flex items-center justify-between bg-black px-5 py-4 text-white">
                            <div className="absolute inset-0 overflow-hidden rounded-t-3xl">
                                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                                <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
                            </div>
                            <div className="relative flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[15px] leading-none">AI Asisten</h3>
                                    <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-emerald-400" /> Online
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="relative rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 dark-scrollbar bg-gray-50/50">
                            <div className="flex flex-col gap-4">
                                {messages.map((msg) => {
                                    const content = textFromMessage(msg);
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-max max-w-[85%] flex-col gap-1 text-[14px]",
                                                msg.role === "user" ? "ml-auto" : "mr-auto"
                                            )}
                                        >
                                            {content ? (
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-4 py-2.5 whitespace-pre-wrap select-text",
                                                        msg.role === "user"
                                                            ? "bg-black text-white rounded-br-sm inline-block"
                                                            : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm inline-block markdown-body text-[14px]"
                                                    )}
                                                >
                                                    {content}
                                                </div>
                                            ) : null}
                                            {msg.role === "assistant" && content ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(content, msg.id)}
                                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mt-1 ml-1 hover:text-gray-700 transition-colors w-max"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <><Check className="h-3 w-3 text-emerald-500" /> Disalin</>
                                                    ) : (
                                                        <><Copy className="h-3 w-3" /> Salin Teks</>
                                                    )}
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}

                                {isBusy && messages[messages.length - 1]?.role === "user" && (
                                    <div className="flex w-max max-w-[85%] flex-col gap-1 mr-auto">
                                        <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-bl-sm flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {messages.length === 1 && !isBusy && (
                            <div className="px-4 py-2 flex flex-wrap gap-2 dark-scrollbar bg-white border-t border-gray-50">
                                {PREDEFINED_PROMPTS.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        onClick={() => void sendMessage({ text: prompt })}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <MessageSquare className="h-3 w-3 text-gray-400" />
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="border-t border-gray-100 bg-white p-4">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const t = input.trim();
                                    if (!t || isBusy) return;
                                    void sendMessage({ text: t });
                                    setInput("");
                                }}
                                className="flex items-end gap-2 relative"
                            >
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            const form = e.currentTarget.form;
                                            if (form) form.requestSubmit();
                                        }
                                    }}
                                    placeholder="Instruksikan Assistant AI..."
                                    className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none min-h-[48px] max-h-[120px] dark-scrollbar leading-relaxed"
                                    rows={1}
                                    disabled={isBusy}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isBusy}
                                    className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    <Send className="h-4 w-4 ml-0.5" />
                                </button>
                            </form>
                            <div className="mt-2 text-center">
                                <span className="text-[10px] text-gray-400">Analisis berdasarkan data agensi Anda (Live DB).</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
