'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

interface StepGeolocationProps {
    onNext: () => void;
}

export default function StepGeolocation({ onNext }: StepGeolocationProps) {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setLoading(false);
                },
                (err) => {
                    setError('No pudimos obtener tu ubicación. Por favor, actívala manualemente.');
                    setLoading(false);
                }
            );
        } else {
            setError('Geolocalización no soportada en este dispositivo.');
            setLoading(false);
        }
    }, []);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">¿Dónde estás?</h2>
                <p className="text-gray-500">Confirma la ubicación del siniestro para enviar ayuda.</p>
            </div>

            <Card className="flex-grow overflow-hidden relative border-none shadow-lg">
                {/* Mock Map View */}
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    {loading ? (
                        <div className="animate-pulse flex flex-col items-center">
                            <Navigation className="w-12 h-12 text-blue-500 animate-bounce" />
                            <span className="text-blue-500 font-medium mt-2">Buscando señal...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center text-red-500 p-4 text-center">
                            <AlertTriangle className="w-12 h-12 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="w-full h-full bg-blue-50 relative">
                            {/* Abstract Map Pattern */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <MapPin className="w-16 h-16 text-blue-600 relative z-10 drop-shadow-xl" />
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg text-xs font-mono text-gray-600 border border-gray-200 shadow-sm">
                                Lat: {location?.lat.toFixed(6)} <br />
                                Lng: {location?.lng.toFixed(6)}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Button
                onClick={onNext}
                className="w-full h-14 text-lg font-bold bg-blue-700 hover:bg-blue-800 shadow-lg"
                disabled={loading}
            >
                Confirmar Ubicación
            </Button>

            {!isOnline && (
                <div className="text-center text-amber-600 text-sm font-medium flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Modo Offline: Guardaremos los datos localmente.
                </div>
            )}
        </div>
    );
}
