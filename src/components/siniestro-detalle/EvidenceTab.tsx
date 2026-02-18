import { Car, Zap, AlertTriangle } from 'lucide-react';
import type { EvidenciaConAnalisis, SeveridadDano } from '@/types';

interface EvidenceTabProps {
    evidencias: EvidenciaConAnalisis[] | null;
    urlsEvidencias: Record<string, string>;
    coloresSeveridad: Record<SeveridadDano, string>;
    labelsSeveridad: Record<SeveridadDano, string>;
}

export function EvidenceTab({ evidencias, urlsEvidencias, coloresSeveridad, labelsSeveridad }: EvidenceTabProps) {
    if (!evidencias || evidencias.length === 0) {
        return (
            <div className="card text-center py-10">
                <p className="text-dark-400">No hay evidencias registradas</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {evidencias.map((ev) => {
                const analisis = ev.analisis_ia?.[0];
                return (
                    <div key={ev.id} className="card overflow-hidden">
                        <div className="flex gap-4">
                            {/* Imagen */}
                            <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-dark-800">
                                {urlsEvidencias[ev.id] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={urlsEvidencias[ev.id]}
                                        alt="Evidencia"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Car className="w-8 h-8 text-dark-600" />
                                    </div>
                                )}
                            </div>

                            {/* Análisis */}
                            <div className="flex-1">
                                {analisis ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${coloresSeveridad[analisis.severidad]}`}>
                                                <Zap className="w-3 h-3" />
                                                {labelsSeveridad[analisis.severidad]}
                                            </span>
                                            {(analisis.nivel_fraude === 'alto' || analisis.nivel_fraude === 'critico') && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border badge-rechazado">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Fraude {analisis.nivel_fraude}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-dark-500 text-xs mb-1">Score Fraude</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-dark-700 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${analisis.score_fraude < 0.3 ? 'bg-green-500' :
                                                                analisis.score_fraude < 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                            style={{ width: `${analisis.score_fraude * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-dark-300">
                                                        {(analisis.score_fraude * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-dark-500 text-xs mb-1">Costo Estimado</p>
                                                <p className="text-dark-200 text-xs font-medium">
                                                    ${analisis.costo_estimado_min.toLocaleString('es-CL')} –
                                                    ${analisis.costo_estimado_max.toLocaleString('es-CL')}
                                                </p>
                                            </div>
                                        </div>

                                        {analisis.partes_danadas && analisis.partes_danadas.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {analisis.partes_danadas.map((parte: string) => (
                                                    <span key={parte} className="px-2 py-0.5 bg-dark-700 text-dark-300 text-xs rounded-lg">
                                                        {parte.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {analisis.descripcion_danos && (
                                            <p className="text-dark-400 text-xs leading-relaxed">
                                                {analisis.descripcion_danos}
                                            </p>
                                        )}

                                        {analisis.indicadores_fraude && analisis.indicadores_fraude.length > 0 && (
                                            <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-3">
                                                <p className="text-orange-400 text-xs font-semibold mb-1">
                                                    ⚠️ Indicadores de Fraude:
                                                </p>
                                                <ul className="text-orange-300 text-xs space-y-0.5">
                                                    {analisis.indicadores_fraude.map((ind: string, i: number) => (
                                                        <li key={i}>• {ind}</li>
                                                    ))}
                                                </ul>
                                                {analisis.justificacion_fraude && (
                                                    <p className="text-orange-400/70 text-xs mt-2 italic">
                                                        {analisis.justificacion_fraude}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-dark-500 text-sm">Sin análisis IA</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
