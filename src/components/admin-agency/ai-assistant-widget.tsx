"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Sparkles, MessageSquare, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";

const PREDEFINED_PROMPTS = [
    "Draft email motivasi ke agen",
    "Analisis tren performa saat ini",
    "Apa itu Rasio Lapse?"
];

export function AIAgencyAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
        api: "/api/ai/agency",
        initialMessages: [
            { id: "1", role: "assistant", content: "Halo Admin Agensi! Saya adalah Asisten AI Anda. Saya telah membaca kinerja live perusahaan Anda dari database." }
        ]
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex h-14 w-auto items-center gap-3 space-x-2 rounded-full px-5",
                    "bg-black text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-800 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
                    isOpen && "hidden"
                )}
            >
                <div className="relative flex items-center justify-center">
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-pulse" />
                    <Bot className="h-6 w-6 text-white" />
                </div>
                <span className="font-semibold text-[15px] hidden sm:block">AI Commander</span>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-full max-w-[360px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl flex flex-col h-[600px] max-h-[85vh]"
                    >
                        {/* Header */}
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
                                    <h3 className="font-bold text-[15px] leading-none">Agency AI</h3>
                                    <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-emerald-400" /> Live Data Mode
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="relative rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 dark-scrollbar bg-gray-50/50">
                            <div className="flex flex-col gap-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex w-max max-w-[85%] flex-col gap-1 text-[14px]",
                                            msg.role === "user" ? "ml-auto" : "mr-auto"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-2xl px-4 py-2.5 whitespace-pre-wrap",
                                                msg.role === "user"
                                                    ? "bg-black text-white rounded-br-sm"
                                                    : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm markdown-body text-[14px]"
                                            )}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {isLoading && messages[messages.length - 1]?.role === "user" && (
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

                        {/* Quick Prompts */}
                        {messages.length === 1 && !isLoading && (
                            <div className="px-4 py-2 overflow-x-auto whitespace-nowrap dark-scrollbar bg-white border-t border-gray-50">
                                <div className="flex gap-2">
                                    {PREDEFINED_PROMPTS.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => append({ role: "user", content: prompt })}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                        >
                                            <MessageSquare className="h-3 w-3 text-gray-400" />
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="border-t border-gray-100 bg-white p-4">
                            <form
                                onSubmit={handleSubmit}
                                className="flex items-center gap-2 relative"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Instruksikan Assistant AI..."
                                    className="flex-1 bg-gray-50 rounded-full border border-gray-200 px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
