'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Check, Trash2, Car, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClaim } from '@/context/ClaimContext';
import { toast } from 'react-hot-toast';

interface StepEvidenceProps {
    onNext: () => void;
    onBack: () => void;
}

const REQUIRED_PHOTOS = [
    { id: 'front', label: 'Frente', icon: Car },
    { id: 'right', label: 'Lado Derecho', icon: Car },
    { id: 'rear', label: 'Trasera', icon: Car },
    { id: 'left', label: 'Lado Izquierdo', icon: Car },
];

const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

/** Determina si el análisis detectó un vehículo (al menos una parte dañada o severidad establecida) */
const esAnalisisDeAuto = (analisis: { partes_danadas?: string[]; severidad?: string } | null | undefined): boolean => {
    if (!analisis) return false;
    return (analisis.partes_danadas && analisis.partes_danadas.length > 0) ||
        (analisis.severidad !== undefined && analisis.severidad !== null);
};

export default function StepEvidence({ onNext, onBack }: StepEvidenceProps) {
    const webcamRef = useRef<Webcam>(null);
    const { evidencias, agregarEvidencia, eliminarEvidencia } = useClaim();
    const [currentStep, setCurrentStep] = useState(0);
    const [flash, setFlash] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Mapa de evidencias "confirmadas como auto" por descripcion/id de foto
    const [validadas, setValidadas] = useState<Record<string, boolean>>({});

    const currentPhoto = REQUIRED_PHOTOS[currentStep];

    // Buscar evidencia actual en el contexto
    const currentEvidence = evidencias.find(e => e.descripcion === currentPhoto.id);

    const handleCameraError = useCallback((error: string | DOMException) => {
        console.error("Camera error:", error);
        setCameraError(true);
        toast.error("No se pudo acceder a la cámara. Usa la opción de subir foto.");
    }, []);

    const processFile = useCallback(async (file: File) => {
        setIsCapturing(true);
        try {
            await agregarEvidencia(file, currentPhoto.id);
            // El análisis es síncrono — la evidencia ya tendrá analisis o no al terminar
            // La lógica de avance la maneja el efecto de checking en el overlay
        } catch (error) {
            console.error("Error saving file:", error);
            toast.error("Error al guardar la foto");
        } finally {
            setIsCapturing(false);
        }
    }, [agregarEvidencia, currentPhoto.id]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const capture = useCallback(async () => {
        if (cameraError) {
            fileInputRef.current?.click();
            return;
        }

        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFlash(true);
            setTimeout(() => setFlash(false), 200);
            setIsCapturing(true);

            try {
                const file = dataURLtoFile(imageSrc, `${currentPhoto.id}.jpg`);
                await processFile(file);
            } catch (error) {
                console.error("Error capturing:", error);
                setIsCapturing(false);
            }
        }
    }, [processFile, currentPhoto.id, cameraError]);

    const retake = (id: string) => {
        const ev = evidencias.find(e => e.descripcion === id);
        if (ev) {
            eliminarEvidencia(ev.id);
        }
        // Limpiar validación de esa foto
        setValidadas(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

        const stepIndex = REQUIRED_PHOTOS.findIndex(p => p.id === id);
        if (stepIndex !== -1) {
            setCurrentStep(stepIndex);
        }
    };

    /** Callback cuando el overlay detecta que el análisis terminó */
    const handleAnalisisCompletado = useCallback((evidenciaDescripcion: string, tieneAuto: boolean) => {
        if (tieneAuto) {
            setValidadas(prev => ({ ...prev, [evidenciaDescripcion]: true }));
            toast.success('✅ Vehículo detectado correctamente');
            // Avanzar al siguiente paso después de 1.5s
            setTimeout(() => {
                const nextStep = REQUIRED_PHOTOS.findIndex(p => p.id === evidenciaDescripcion) + 1;
                if (nextStep < REQUIRED_PHOTOS.length) {
                    setCurrentStep(nextStep);
                }
            }, 1500);
        } else {
            toast.error('⚠️ No se detectó un vehículo. Por favor retoma la foto enfocando el auto.', { duration: 5000 });
        }
    }, []);

    const isComplete = REQUIRED_PHOTOS.every(p =>
        evidencias.some(e => e.descripcion === p.id && validadas[p.id])
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Evidencia del Daño</h2>
                <div className="flex justify-center items-center gap-2">
                    <p className="text-sm text-gray-500">
                        Foto {currentStep + 1} de {REQUIRED_PHOTOS.length}:
                    </p>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide">
                        {currentPhoto.label}
                    </span>
                </div>
            </div>

            <div className="relative flex-grow overflow-hidden bg-black rounded-2xl shadow-inner group min-h-[300px]">
                {!currentEvidence ? (
                    <>
                        {!cameraError ? (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: "environment",
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 }
                                }}
                                onUserMediaError={handleCameraError}
                                playsInline={true}
                                muted={true}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                                <h3 className="text-lg font-bold mb-2">Cámara no disponible</h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    No pudimos acceder a tu cámara. Puedes subir una foto o tomarla con la app nativa.
                                </p>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="secondary"
                                    className="w-full max-w-xs"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    Abrir Cámara / Subir Foto
                                </Button>
                            </div>
                        )}

                        {/* Ghost Overlay (only if camera is working) */}
                        {!cameraError && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/30 m-8 rounded-2xl flex items-center justify-center">
                                <Car className="w-32 h-32 text-white/10" />
                                <p className="absolute bottom-8 text-white/90 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                    Alinea: {currentPhoto.label}
                                </p>
                            </div>
                        )}

                        {flash && <div className="absolute inset-0 bg-white animate-pulse z-50"></div>}
                    </>
                ) : (
                    <EvidenciaOverlay
                        evidence={currentEvidence}
                        validada={validadas[currentEvidence.descripcion || '']}
                        onAnalisisCompletado={handleAnalisisCompletado}
                    />
                )}
            </div>

            {/* Hidden File Input for Fallback */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
            />

            <div className="grid grid-cols-4 gap-2 h-20">
                {REQUIRED_PHOTOS.map((photo, index) => {
                    const evidence = evidencias.find(e => e.descripcion === photo.id);
                    const esValida = validadas[photo.id];
                    return (
                        <div
                            key={photo.id}
                            className={cn(
                                "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                                index === currentStep ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
                                esValida ? "border-green-500 ring-2 ring-green-200" : "",
                                evidence ? "bg-gray-800" : "bg-gray-100"
                            )}
                            onClick={() => evidence && retake(photo.id)}
                        >
                            {evidence ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={evidence.previewUrl} className="w-full h-full object-cover opacity-60" alt="" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {evidence.analizando ? (
                                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                        ) : esValida ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-400 drop-shadow" />
                                        ) : evidence.analisis ? (
                                            <div className={`w-2 h-2 rounded-full ${evidence.analisis.severidad === 'grave' || evidence.analisis.severidad === 'perdida_total' ? 'bg-red-500' : 'bg-green-500'
                                                }`} />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <span className="text-xs font-bold">{index + 1}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    Atrás
                </Button>
                {isComplete ? (
                    <Button onClick={onNext} className="flex-[2] bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-600/20">
                        Continuar
                    </Button>
                ) : (
                    <Button
                        onClick={capture}
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20"
                        disabled={!!currentEvidence || isCapturing}
                    >
                        {isCapturing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Camera className="w-5 h-5 mr-2" />}
                        {isCapturing ? 'Analizando...' : (cameraError ? 'Subir Foto' : 'Capturar')}
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── Sub-componente: Overlay del análisis ────────────────────────────────────

interface EvidenciaOverlayProps {
    evidence: {
        id: string;
        previewUrl?: string;
        storage_path: string;
        analizando?: boolean;
        analisis?: { severidad?: string; partes_danadas?: string[] } | null;
        descripcion?: string | null;
    };
    validada: boolean;
    onAnalisisCompletado: (descripcion: string, tieneAuto: boolean) => void;
}

function EvidenciaOverlay({ evidence, validada, onAnalisisCompletado }: EvidenciaOverlayProps) {
    // Disparar callback cuando el análisis termina (analizando pasa a false y hay analisis).
    // IMPORTANTE: esto debe hacerse en useEffect, nunca durante el render, para evitar
    // el error "Cannot update a component while rendering a different component".
    const [notificado, setNotificado] = useState(false);

    useEffect(() => {
        if (!notificado && !evidence.analizando && evidence.analisis !== undefined) {
            setNotificado(true);
            const tieneAuto = esAnalisisDeAuto(evidence.analisis);
            if (evidence.descripcion) {
                onAnalisisCompletado(evidence.descripcion, tieneAuto);
            }
        }
    }, [notificado, evidence.analizando, evidence.analisis, evidence.descripcion, onAnalisisCompletado]);

    return (
        <div className={cn(
            "absolute inset-0 bg-gray-900 flex items-center justify-center transition-all duration-500",
            validada ? "ring-4 ring-green-500 ring-inset" : ""
        )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={evidence.previewUrl || evidence.storage_path}
                alt="Captured"
                className="w-full h-full object-contain"
            />

            {/* Overlay de Estado */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                {evidence.analizando ? (
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                        <div className="relative">
                            <Sparkles className="w-12 h-12 text-blue-400" />
                            <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-white animate-spin" />
                        </div>
                        <p className="text-white font-medium text-sm">Verificando vehículo...</p>
                    </div>
                ) : validada ? (
                    <div className="text-center space-y-2 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30 ring-4 ring-green-300/40">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-white font-bold text-lg">Vehículo Confirmado</p>
                        {evidence.analisis?.severidad && (
                            <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${evidence.analisis.severidad === 'leve' ? 'bg-green-500/20 text-green-300' :
                                evidence.analisis.severidad === 'moderado' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-red-500/20 text-red-300'
                                }`}>
                                Daño {evidence.analisis.severidad}
                            </p>
                        )}
                    </div>
                ) : evidence.analisis === null ? (
                    // analisis es null: terminó pero no detectó auto
                    <div className="flex flex-col items-center text-yellow-400 text-center px-6">
                        <AlertTriangle className="w-10 h-10 mb-2" />
                        <p className="text-sm font-bold">No se detectó vehículo</p>
                        <p className="text-xs text-white/70 mt-1">Toca la miniatura para retomar la foto</p>
                    </div>
                ) : (
                    // analisis es undefined: estado inicial antes de que llegue el resultado
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                        <div className="relative">
                            <Sparkles className="w-12 h-12 text-blue-400" />
                            <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-white animate-spin" />
                        </div>
                        <p className="text-white font-medium text-sm">Procesando...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
