'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, RefreshCw, SkipForward } from 'lucide-react';

interface StepVoiceProps {
    onNext: () => void;
    onBack: () => void;
}

/** Detecta el primer MIME type de audio soportado por el browser actual */
function getSupportedAudioMimeType(): string {
    const candidatos = [
        'audio/mp4',                  // Safari / iOS (debe ser el primero)
        'audio/webm;codecs=opus',     // Chrome / Firefox
        'audio/webm',                 // Chrome / Firefox fallback
        'audio/ogg;codecs=opus',      // Firefox
        '',                           // Sin preferencia — dejar que el browser decida
    ];
    for (const tipo of candidatos) {
        if (tipo === '' || MediaRecorder.isTypeSupported(tipo)) {
            return tipo;
        }
    }
    return '';
}

export default function StepVoice({ onNext, onBack }: StepVoiceProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [micError, setMicError] = useState<'denied' | 'unsupported' | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        setMicError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedAudioMimeType();

            const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err: unknown) {
            console.error('Error accessing microphone:', err);
            const nombre = err instanceof Error ? err.name : '';
            if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
                setMicError('denied');
            } else {
                setMicError('unsupported');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Detener todos los tracks del stream
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const resetRecording = () => {
        setAudioUrl(null);
        setMicError(null);
    };

    return (
        <div className="flex flex-col h-full space-y-8 items-center justify-center">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Cuéntanos qué pasó</h2>
                <p className="text-gray-500">
                    Graba un audio breve relatando el siniestro.{' '}
                    <span className="text-xs text-gray-400">(opcional)</span>
                </p>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center w-full relative">
                {/* Visualizador / Estado */}
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-50 animate-pulse' : micError ? 'bg-orange-50' : 'bg-blue-50'}`}>
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
                        <Mic className={`w-20 h-20 ${micError ? 'text-orange-300' : 'text-blue-300'}`} />
                    )}
                </div>

                {/* Error de micrófono */}
                {micError && (
                    <div className="mt-4 text-center px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl max-w-xs">
                        {micError === 'denied' ? (
                            <>
                                <p className="text-sm font-bold text-orange-700">Permiso de micrófono denegado</p>
                                <p className="text-xs text-orange-500 mt-1">
                                    Ve a Configuración del navegador y activa el micrófono para este sitio, o continúa sin audio.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-bold text-orange-700">Micrófono no disponible</p>
                                <p className="text-xs text-orange-500 mt-1">
                                    Tu dispositivo no soporta grabación de audio. Puedes continuar sin relato de voz.
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Reproductor de audio grabado */}
                <div className="mt-8">
                    {audioUrl && (
                        <audio controls src={audioUrl} className="mb-4" />
                    )}
                </div>
            </div>

            <div className="w-full space-y-3">
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
                                {micError ? 'Intentar de nuevo' : 'Grabar Relato'}
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

                {/* Botones secundarios */}
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onBack} className="flex-1 text-gray-500">
                        Atrás
                    </Button>
                    {!isRecording && (
                        <Button
                            variant="ghost"
                            onClick={onNext}
                            className="flex-1 text-gray-400 text-sm"
                        >
                            <SkipForward className="w-4 h-4 mr-1" />
                            Omitir
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
