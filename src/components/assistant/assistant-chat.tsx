"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, MessageSquare, Zap, Copy, Check } from "lucide-react";
import { useChat } from "ai/react";
import { cn } from "@/lib/utils";

interface Props {
    api: string;
    initialAssistantMessage: string;
    quickPrompts?: string[];
    title?: string;
    subtitle?: string;
    placeholder?: string;
}

export function AssistantChat({
    api,
    initialAssistantMessage,
    quickPrompts = [],
    title = "AI Asisten",
    subtitle = "Online",
    placeholder = "Tanya performa atau minta AI...",
}: Props) {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
        api,
        initialMessages: [{ id: "1", role: "assistant", content: initialAssistantMessage }],
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto rounded-2xl sm:rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="relative flex items-center justify-between bg-black px-5 py-4 text-white shrink-0">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
                </div>
                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[15px] leading-none">{title}</h3>
                        <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-400" /> {subtitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 min-h-0">
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-max max-w-[85%] flex-col gap-1 text-[14px]",
                                msg.role === "user" ? "ml-auto" : "mr-auto",
                            )}
                        >
                            <div
                                className={cn(
                                    "rounded-2xl px-4 py-2.5 whitespace-pre-wrap select-text",
                                    msg.role === "user"
                                        ? "bg-black text-white rounded-br-sm inline-block"
                                        : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm inline-block",
                                )}
                            >
                                {msg.content}
                            </div>
                            {msg.role === "assistant" && (
                                <button
                                    onClick={() => handleCopy(msg.content, msg.id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mt-1 ml-1 hover:text-gray-700 transition-colors w-max"
                                >
                                    {copiedId === msg.id ? (
                                        <><Check className="h-3 w-3 text-emerald-500" /> Disalin</>
                                    ) : (
                                        <><Copy className="h-3 w-3" /> Salin Teks</>
                                    )}
                                </button>
                            )}
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
            {messages.length === 1 && !isLoading && quickPrompts.length > 0 && (
                <div className="px-4 py-2 flex flex-wrap gap-2 bg-white border-t border-gray-50 shrink-0">
                    {quickPrompts.map((prompt) => (
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
            )}

            {/* Input */}
            <div className="border-t border-gray-100 bg-white p-4 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
                    <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                const form = e.currentTarget.form;
                                if (form) form.requestSubmit();
                            }
                        }}
                        placeholder={placeholder}
                        className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none min-h-[48px] max-h-[120px] leading-relaxed pr-12"
                        rows={1}
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-4 w-4 ml-0.5" />
                    </button>
                </form>
                <div className="mt-2 text-center">
                    <span className="text-[10px] text-gray-400">Telah tersambung ke database. AI tetap berpotensi keliru.</span>
                </div>
            </div>
        </div>
    );
}
