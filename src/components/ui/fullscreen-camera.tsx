"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface FullScreenCameraProps {
    onCapture: (base64: string) => void;
    onClose: () => void;
    mode: "user" | "environment";
}

export function FullScreenCamera({ onCapture, onClose, mode }: FullScreenCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">(mode);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setError(null);
        } catch (err) {
            console.error("Camera Error:", err);
            setError("Gagal mengakses kamera. Pastikan izin diberikan.");
            toast({
                title: "Gagal Mengakses Kamera",
                description: "Pastikan Anda memberikan izin akses kamera di browser.",
                variant: "destructive"
            });
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const handleSwitchCamera = () => {
        setFacingMode(prev => (prev === "user" ? "environment" : "user"));
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (context) {
                // Set canvas to video dimensions to capture full resolution
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Mirror if user facing
                if (facingMode === "user") {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to base64
                const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                setCapturedImage(dataUrl);
            }
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
            onClose();
        }
    };

    if (error) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 text-white">
                <p className="mb-4 text-center">{error}</p>
                <Button variant="secondary" onClick={onClose}>Tutup</Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header / Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={onClose}
                >
                    <X className="w-8 h-8" />
                </Button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                            "absolute w-full h-full object-cover",
                            facingMode === "user" && "scale-x-[-1]"
                        )}
                    />
                ) : (
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="absolute w-full h-full object-contain bg-black"
                    />
                )}

                {/* Visual Guide (Optional - keep it simple per user request for "normal photo") */}
                {!capturedImage && (
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30" />
                )}
            </div>

            {/* Controls / Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 z-20 flex justify-center items-center gap-8 bg-gradient-to-t from-black/80 to-transparent">
                {!capturedImage ? (
                    <>
                        {/* Switch Camera */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-8 text-white hover:bg-white/20 rounded-full h-12 w-12"
                            onClick={handleSwitchCamera}
                        >
                            <RefreshCw className="w-6 h-6" />
                        </Button>

                        {/* Capture Button */}
                        <button
                            onClick={handleCapture}
                            className="h-20 w-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center hover:bg-white/40 active:scale-95 transition-all shadow-xl"
                        >
                            <div className="h-16 w-16 bg-white rounded-full" />
                        </button>
                    </>
                ) : (
                    <div className="flex gap-4 w-full justify-center">
                        <Button
                            variant="destructive"
                            size="lg"
                            className="rounded-full px-8 h-12 text-base font-medium"
                            onClick={handleRetake}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Foto Ulang
                        </Button>
                        <Button
                            variant="default" // Using default (usually primary color)
                            size="lg"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 h-12 text-base font-medium border-0"
                            onClick={handleConfirm}
                        >
                            <Check className="w-4 h-4 mr-2" /> Gunakan Foto
                        </Button>
                    </div>
                )}
            </div>

            {/* Hidden Canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
