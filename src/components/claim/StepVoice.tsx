'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Square, Play, RefreshCw } from 'lucide-react';

interface StepVoiceProps {
    onNext: () => void;
    onBack: () => void;
}

export default function StepVoice({ onNext, onBack }: StepVoiceProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('No se pudo acceder al micrófono.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const resetRecording = () => {
        setAudioUrl(null);
    };

    return (
        <div className="flex flex-col h-full space-y-8 items-center justify-center">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Cuéntanos qué pasó</h2>
                <p className="text-gray-500">Graba un audio breve relatando el siniestro.</p>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center w-full relative">
                {/* Visualizer / Status */}
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-50 animate-pulse' : 'bg-blue-50'}`}>
                    {isRecording ? (
                        <div className="space-y-1 flex gap-1 items-end h-16">
                            <div className="w-2 bg-red-500 animate-[bounce_1s_infinite] h-8"></div>
                            <div className="w-2 bg-red-500 animate-[bounce_1.2s_infinite] h-12"></div>
                            <div className="w-2 bg-red-500 animate-[bounce_0.8s_infinite] h-6"></div>
                            <div className="w-2 bg-red-500 animate-[bounce_1.1s_infinite] h-10"></div>
                            <div className="w-2 bg-red-500 animate-[bounce_0.9s_infinite] h-7"></div>
                        </div>
                    ) : audioUrl ? (
                        <Play className="w-20 h-20 text-blue-600 ml-2" />
                    ) : (
                        <Mic className="w-20 h-20 text-blue-300" />
                    )}
                </div>

                {/* Instructions or specific controls */}
                <div className="mt-8">
                    {audioUrl && (
                        <audio controls src={audioUrl} className="mb-4" />
                    )}
                </div>
            </div>

            <div className="w-full space-y-4">
                {!audioUrl ? (
                    <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full h-20 text-xl font-bold rounded-full shadow-lg flex items-center justify-center gap-3 transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-8 h-8 fill-current" />
                                Detener
                            </>
                        ) : (
                            <>
                                <Mic className="w-8 h-8" />
                                Grabar Relato
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={resetRecording} className="h-16 text-lg border-red-200 text-red-600 hover:bg-red-50">
                            <RefreshCw className="w-6 h-6 mr-2" />
                            Grabar de nuevo
                        </Button>
                        <Button onClick={onNext} className="h-16 text-lg bg-green-600 hover:bg-green-700 shadow-md text-white font-bold">
                            Continuar
                        </Button>
                    </div>
                )}

                <Button variant="ghost" onClick={onBack} className="w-full text-gray-500">
                    Atrás
                </Button>
            </div>
        </div>
    );
}
