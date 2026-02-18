import { Car, Zap, Shield, DollarSign, MapPin } from 'lucide-react';
import type { SiniestroCompleto, SeveridadDano } from '@/types';

interface SiniestroInfoCardsProps {
    siniestro: SiniestroCompleto;
    coloresSeveridad: Record<SeveridadDano, string>;
    labelsSeveridad: Record<SeveridadDano, string>;
}

export function SiniestroInfoCards({ siniestro, coloresSeveridad, labelsSeveridad }: SiniestroInfoCardsProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Vehículo */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                        <Car className="w-4 h-4 text-brand-400" />
                        <span className="text-sm font-medium text-dark-300">Vehículo</span>
                    </div>
                    <p className="font-bold text-white text-lg">{siniestro.patente}</p>
                    <p className="text-dark-400 text-sm">{siniestro.marca} {siniestro.modelo} {siniestro.anio}</p>
                    <p className="text-dark-500 text-xs mt-1">{siniestro.tipo_siniestro}</p>
                </div>

                {/* Evaluación IA */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-dark-300">Evaluación IA</span>
                    </div>
                    {siniestro.severidad_general ? (
                        <>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold border ${coloresSeveridad[siniestro.severidad_general]}`}>
                                {labelsSeveridad[siniestro.severidad_general]}
                            </span>
                            <div className="mt-2 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-dark-400" />
                                <span className="text-xs text-dark-400">Fraude: {((siniestro.score_fraude_general || 0) * 100).toFixed(0)}%</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-dark-500 text-sm">Sin análisis IA</p>
                    )}
                </div>

                {/* Costo Estimado */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-accent-400" />
                        <span className="text-sm font-medium text-dark-300">Costo Estimado</span>
                    </div>
                    {siniestro.costo_estimado_max ? (
                        <>
                            <p className="font-bold text-accent-400">
                                ${(siniestro.costo_estimado_max).toLocaleString('es-CL')}
                            </p>
                            <p className="text-dark-500 text-xs">máximo CLP</p>
                            <p className="text-dark-600 text-xs">
                                mín: ${(siniestro.costo_estimado_min || 0).toLocaleString('es-CL')}
                            </p>
                        </>
                    ) : (
                        <p className="text-dark-500 text-sm">Sin estimación</p>
                    )}
                </div>
            </div>

            {/* Ubicación */}
            {siniestro.direccion && (
                <div className="flex items-start gap-2 text-sm text-dark-400 px-1">
                    <MapPin className="w-4 h-4 text-dark-500 mt-0.5 flex-shrink-0" />
                    <span>{siniestro.direccion}</span>
                </div>
            )}
        </div>
    );
}
