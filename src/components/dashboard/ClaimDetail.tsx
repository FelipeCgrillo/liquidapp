'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, FileText, Calendar, MapPin, User, ShieldAlert, Car, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import type { SiniestroCompleto } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClaimDetailProps {
    siniestro: SiniestroCompleto | null;
}

export function ClaimDetail({ siniestro }: ClaimDetailProps) {
    const [playing, setPlaying] = useState(false);

    if (!siniestro) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Car className="w-16 h-16 mb-4 text-gray-200" />
                <p>Selecciona un siniestro para ver los detalles</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Metadata Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Metadatos del Siniestro</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{format(new Date(siniestro.created_at), 'd MMM yyyy, HH:mm', { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{siniestro.direccion || 'Ubicación no registrada'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{siniestro.nombre_asegurado}</span>
                    </div>
                    {siniestro.score_fraude_general && siniestro.score_fraude_general > 0.6 && (
                        <div className="flex items-center gap-2 text-red-600 font-medium">
                            <ShieldAlert className="w-4 h-4" />
                            <span>Alto Riesgo Detectado</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Smart Gallery */}
            <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    Evidencia Visual
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">AI Analyzed</Badge>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {siniestro.evidencias?.map((ev) => {
                        // Usar url_publica (inyectada por el padre)
                        const imgSrc = ev.url_publica || '';
                        // En SiniestroCompleto, las evidencias tienen analisis_ia[]
                        const analisis = ev.analisis_ia?.[0];

                        return (
                            <div key={ev.id} className="relative group rounded-lg overflow-hidden cursor-pointer border border-gray-200 shadow-sm aspect-video bg-gray-100">
                                {imgSrc ? (
                                    <img src={imgSrc} alt={ev.descripcion || 'Evidencia'} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                    {ev.descripcion || 'Sin etiqueta'}
                                </span>

                                {/* AI Annotations (Ghost Overlay) */}
                                {analisis?.partes_danadas?.map((parte: string, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute top-2 right-2"
                                    >
                                        <span className="bg-red-600 text-white text-[10px] px-1 py-0.5 rounded shadow-sm whitespace-nowrap">
                                            {parte.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {(!siniestro.evidencias || siniestro.evidencias.length === 0) && (
                        <div className="col-span-2 text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            No hay evidencias visuales
                        </div>
                    )}
                </div>
            </div>

            {/* Audio & Transcription */}
            <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button
                            size="icon"
                            variant="default"
                            className="rounded-full w-10 h-10 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => setPlaying(!playing)}
                        >
                            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </Button>
                        <div className="h-10 flex-1 bg-white rounded-lg border border-gray-200 flex items-center px-3 gap-1 overflow-hidden">
                            {/* Fake waveform placeholder */}
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="w-1 bg-indigo-200 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                            ))}
                        </div>
                        <span className="text-xs font-mono text-gray-500">00:00</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-700 leading-relaxed">
                        <span className="font-bold block text-xs text-gray-400 mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> DESCRIPCIÓN DEL SINIESTRO
                        </span>
                        {siniestro.descripcion || "Sin descripción disponible."}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
