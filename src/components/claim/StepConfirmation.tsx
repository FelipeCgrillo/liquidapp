'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, FileText, MapPin, Camera, Mic } from 'lucide-react';
import Link from 'next/link';

interface StepConfirmationProps {
    onBack: () => void;
}

export default function StepConfirmation({ onBack }: StepConfirmationProps) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setSubmitting(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="flex flex-col h-full items-center justify-center space-y-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">¡Recibido!</h2>
                <p className="text-lg text-gray-600 max-w-xs">
                    Hemos recibido tu reporte. Un liquidador revisará tu caso en los próximos minutos.
                </p>
                <Card className="w-full bg-blue-50 border-blue-100 mt-8">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-blue-800">N° de Siniestro</p>
                        <p className="text-2xl font-mono text-blue-900">LIQ-2026-8492</p>
                    </CardContent>
                </Card>
                <div className="w-full pt-8">
                    <Link href="/">
                        <Button className="w-full h-14 text-lg font-bold" variant="outline">
                            Volver al Inicio
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Confirma tu Reporte</h2>
                <p className="text-gray-500">Revisa los datos antes de enviar.</p>
            </div>

            <Card className="flex-grow overflow-y-auto shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Resumen del Siniestro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-gray-900">Ubicación</p>
                            <p className="text-xs text-gray-500">Lat: -33.4372, Lng: -70.6506</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Camera className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-gray-900">Evidencias</p>
                            <p className="text-xs text-gray-500">4 Fotos adjuntas</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mic className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-sm text-gray-900">Relato</p>
                            <p className="text-xs text-gray-500">Audio de 0:45s listo para enviar.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3 pt-4">
                <Button
                    onClick={handleSubmit}
                    className="w-full h-14 text-lg font-bold bg-blue-700 hover:bg-blue-800 shadow-xl flex items-center justify-center gap-2"
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar Informe"
                    )}
                </Button>
                <Button variant="ghost" onClick={onBack} disabled={submitting} className="w-full text-gray-500">
                    Volver a editar
                </Button>
            </div>
        </div>
    );
}
