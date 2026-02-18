'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, FileText, Calendar, MapPin, User, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const MOCK_PHOTOS = [
    {
        id: 1,
        src: 'https://images.unsplash.com/photo-1599525626243-77227e742886?q=80&w=600&auto=format&fit=crop', // Dented bumper
        label: 'Frontal',
        annotations: [
            { x: 30, y: 40, width: 40, height: 30, label: 'Parachoques: Abolladura (Severo)' }
        ]
    },
    {
        id: 2,
        src: 'https://images.unsplash.com/photo-1562920610-1845bb0e816a?q=80&w=600&auto=format&fit=crop', // Side scratch
        label: 'Lateral',
        annotations: [
            { x: 50, y: 50, width: 20, height: 10, label: 'Puerta: Rayón (Leve)' }
        ]
    },
    {
        id: 3,
        src: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=600&auto=format&fit=crop', // Car interior/dashboard
        label: 'Interior',
        annotations: []
    }
];

export function ClaimDetail() {
    const [playing, setPlaying] = useState(false);

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
                        <span>18 Feb 2026, 14:30</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>Av. Apoquindo 4500, Las Condes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Rut: 12.345.678-9</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 font-medium">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Riesgo Detectado</span>
                    </div>
                </CardContent>
            </Card>

            {/* Smart Gallery */}
            <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    Evidencia Visual
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">AI Analyzed</Badge>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {MOCK_PHOTOS.map((photo) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden cursor-pointer border border-gray-200 shadow-sm aspect-video">
                            <img src={photo.src} alt={photo.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                {photo.label}
                            </span>

                            {/* AI Annotations (Ghost Overlay) */}
                            {photo.annotations.map((ann, i) => (
                                <div
                                    key={i}
                                    className="absolute border-2 border-red-500 bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{
                                        left: `${ann.x}%`,
                                        top: `${ann.y}%`,
                                        width: `${ann.width}%`,
                                        height: `${ann.height}%`
                                    }}
                                >
                                    <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] px-1 py-0.5 rounded shadow-sm whitespace-nowrap">
                                        {ann.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
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
                            {/* Fake waveform */}
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="w-1 bg-indigo-200 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                            ))}
                        </div>
                        <span className="text-xs font-mono text-gray-500">0:45</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-700 leading-relaxed">
                        <span className="font-bold block text-xs text-gray-400 mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> TRANSCRIPCIÓN IA
                        </span>
                        &quot;Iba circulando por Avenida Apoquindo cuando un vehículo rojo intentó adelantarme por la derecha y golpeó mi parachoques delantero. Me detuve a intercambiar datos y...&quot;
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
