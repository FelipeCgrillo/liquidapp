'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Check, RefreshCw, Trash2, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function StepEvidence({ onNext, onBack }: StepEvidenceProps) {
    const webcamRef = useRef<Webcam>(null);
    const [images, setImages] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [flash, setFlash] = useState(false);

    const currentPhoto = REQUIRED_PHOTOS[currentStep];

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFlash(true);
            setTimeout(() => setFlash(false), 200);

            setImages(prev => ({
                ...prev,
                [currentPhoto.id]: imageSrc
            }));

            // Auto advance
            if (currentStep < REQUIRED_PHOTOS.length - 1) {
                setTimeout(() => setCurrentStep(prev => prev + 1), 500);
            }
        }
    }, [webcamRef, currentStep, currentPhoto]);

    const retake = (id: string) => {
        const stepIndex = REQUIRED_PHOTOS.findIndex(p => p.id === id);
        if (stepIndex !== -1) {
            setCurrentStep(stepIndex);
            setImages(prev => {
                const newImages = { ...prev };
                delete newImages[id];
                return newImages;
            });
        }
    };

    const isComplete = Object.keys(images).length === REQUIRED_PHOTOS.length;

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Evidencia del Daño</h2>
                <p className="text-sm text-gray-500">
                    Foto {currentStep + 1} de {REQUIRED_PHOTOS.length}: <span className="font-bold text-blue-600">{currentPhoto.label}</span>
                </p>
            </div>

            <div className="relative flex-grow overflow-hidden bg-black rounded-2xl shadow-inner">
                {!images[currentPhoto.id] ? (
                    <>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "environment" }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Ghost Overlay */}
                        <div className="absolute inset-0 pointer-events-none border-2 border-white/30 m-8 rounded-lg flex items-center justify-center">
                            <Car className="w-32 h-32 text-white/20" />
                            <p className="absolute bottom-4 text-white/80 text-sm font-medium bg-black/50 px-2 py-1 rounded">
                                Alinea el auto aquí
                            </p>
                        </div>
                        {flash && <div className="absolute inset-0 bg-white animate-pulse z-50"></div>}
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <img src={images[currentPhoto.id]} alt="Captured" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Check className="w-16 h-16 text-green-400 drop-shadow-lg" />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 gap-2 h-20">
                {REQUIRED_PHOTOS.map((photo, index) => (
                    <div
                        key={photo.id}
                        className={cn(
                            "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                            index === currentStep ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
                            images[photo.id] ? "bg-gray-800" : "bg-gray-100"
                        )}
                        onClick={() => images[photo.id] && retake(photo.id)}
                    >
                        {images[photo.id] ? (
                            <img src={images[photo.id]} className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <span className="text-xs">{index + 1}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    Atrás
                </Button>
                {isComplete ? (
                    <Button onClick={onNext} className="flex-[2] bg-green-600 hover:bg-green-700 font-bold">
                        Continuar
                    </Button>
                ) : (
                    <Button onClick={capture} className="flex-[2] bg-blue-600 hover:bg-blue-700 font-bold" disabled={!!images[currentPhoto.id]}>
                        <Camera className="w-6 h-6 mr-2" />
                        Capturar
                    </Button>
                )}
            </div>
        </div>
    );
}
