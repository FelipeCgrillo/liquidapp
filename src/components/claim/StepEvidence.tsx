'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Check, RefreshCw, Trash2, Car, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
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

export default function StepEvidence({ onNext, onBack }: StepEvidenceProps) {
    const webcamRef = useRef<Webcam>(null);
    const { evidencias, agregarEvidencia, eliminarEvidencia } = useClaim();
    const [currentStep, setCurrentStep] = useState(0);
    const [flash, setFlash] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    const currentPhoto = REQUIRED_PHOTOS[currentStep];

    // Buscar evidencia actual en el contexto
    const currentEvidence = evidencias.find(e => e.descripcion === currentPhoto.id);

    const capture = useCallback(async () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFlash(true);
            setTimeout(() => setFlash(false), 200);
            setIsCapturing(true);

            try {
                const file = dataURLtoFile(imageSrc, `${currentPhoto.id}.jpg`);
                await agregarEvidencia(file, currentPhoto.id);

                // Auto advance only if successful
                if (currentStep < REQUIRED_PHOTOS.length - 1) {
                    setTimeout(() => setCurrentStep(prev => prev + 1), 500);
                }
            } catch (error) {
                console.error("Error capturing:", error);
                toast.error("Error al guardar la foto");
            } finally {
                setIsCapturing(false);
            }
        }
    }, [webcamRef, currentStep, currentPhoto, agregarEvidencia]);

    const retake = (id: string) => {
        // Encontrar evidencia por descripción (id del paso)
        const ev = evidencias.find(e => e.descripcion === id);
        if (ev) {
            eliminarEvidencia(ev.id);
        }

        const stepIndex = REQUIRED_PHOTOS.findIndex(p => p.id === id);
        if (stepIndex !== -1) {
            setCurrentStep(stepIndex);
        }
    };

    const isComplete = REQUIRED_PHOTOS.every(p =>
        evidencias.some(e => e.descripcion === p.id)
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

            <div className="relative flex-grow overflow-hidden bg-black rounded-2xl shadow-inner group">
                {!currentEvidence ? (
                    <>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "environment" }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Ghost Overlay */}
                        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/30 m-8 rounded-2xl flex items-center justify-center">
                            <Car className="w-32 h-32 text-white/10" />
                            <p className="absolute bottom-8 text-white/90 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                Alinea: {currentPhoto.label}
                            </p>
                        </div>
                        {flash && <div className="absolute inset-0 bg-white animate-pulse z-50"></div>}
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={currentEvidence.previewUrl || currentEvidence.storage_path} // Fallback to storage path if preview lost, though previewUrl should be there
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />

                        {/* Overlay de Estado */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                            {currentEvidence.analizando ? (
                                <div className="flex flex-col items-center gap-3 animate-pulse">
                                    <div className="relative">
                                        <Sparkles className="w-12 h-12 text-blue-400" />
                                        <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-white animate-spin" />
                                    </div>
                                    <p className="text-white font-medium text-sm">Analizando daños con IA...</p>
                                </div>
                            ) : currentEvidence.analisis ? (
                                <div className="text-center space-y-2 animate-in zoom-in duration-300">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                                        <Check className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">Análisis Completo</p>
                                        <p className={`text-sm font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${currentEvidence.analisis.severidad === 'leve' ? 'bg-green-500/20 text-green-300' :
                                                currentEvidence.analisis.severidad === 'moderado' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    'bg-red-500/20 text-red-300'
                                            }`}>
                                            Daño {currentEvidence.analisis.severidad}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-red-400">
                                    <AlertTriangle className="w-10 h-10 mb-2" />
                                    <p className="text-sm font-medium">Error en análisis</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 gap-2 h-20">
                {REQUIRED_PHOTOS.map((photo, index) => {
                    const evidence = evidencias.find(e => e.descripcion === photo.id);
                    return (
                        <div
                            key={photo.id}
                            className={cn(
                                "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                                index === currentStep ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
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
                                        ) : evidence.analisis ? (
                                            <div className={`w-2 h-2 rounded-full ${evidence.analisis.severidad === 'grave' || evidence.analisis.severidad === 'perdida_total' ? 'bg-red-500' : 'bg-green-500'
                                                }`} />
                                        ) : null}
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
                        {isCapturing ? 'Guardando...' : 'Capturar'}
                    </Button>
                )}
            </div>
        </div>
    );
}
