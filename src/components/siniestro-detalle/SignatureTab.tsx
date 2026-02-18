'use client';

import { CheckCircle, Download, Loader2, AlertTriangle, PenTool, Trash2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import type { PreInforme } from '@/types';
import type { RefObject } from 'react';

interface SignatureTabProps {
    pre_informe: PreInforme | null;
    firmando: boolean;
    firmarInforme: () => void;
    exportarPDF: () => void;
    exportandoPDF: boolean;
    sigRef: RefObject<SignatureCanvas>;
}

export function SignatureTab({
    pre_informe,
    firmando,
    firmarInforme,
    exportarPDF,
    exportandoPDF,
    sigRef
}: SignatureTabProps) {
    return (
        <div className="space-y-4">
            {pre_informe?.estado === 'firmado' ? (
                <div className="card text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold text-lg">Informe Firmado</p>
                    <p className="text-dark-400 text-sm mt-1">
                        Firmado el {pre_informe.firmado_at ? new Date(pre_informe.firmado_at).toLocaleString('es-CL') : ''}
                    </p>
                    {pre_informe.firma_imagen_base64 && (
                        <div className="mt-4 bg-white rounded-xl p-4 max-w-xs mx-auto">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={pre_informe.firma_imagen_base64}
                                alt="Firma digital"
                                className="w-full"
                            />
                        </div>
                    )}
                    <button onClick={exportarPDF} disabled={exportandoPDF} className="btn-primary mt-4 mx-auto">
                        {exportandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Exportar PDF
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {!pre_informe && (
                        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                <p className="text-yellow-400 text-sm font-medium">
                                    Debes generar el pre-informe antes de firmar
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-brand-400" />
                            Firma del Liquidador
                        </h3>
                        <p className="text-dark-400 text-sm mb-4">
                            Dibuja tu firma en el recuadro a continuación para aprobar y cerrar este siniestro.
                        </p>

                        <div className="bg-white rounded-xl overflow-hidden border-2 border-dark-600">
                            <SignatureCanvas
                                ref={sigRef}
                                canvasProps={{
                                    width: 600,
                                    height: 200,
                                    className: 'w-full',
                                    style: { touchAction: 'none' },
                                }}
                                backgroundColor="white"
                                penColor="#1e40af"
                            />
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => sigRef.current?.clear()}
                                className="btn-secondary flex-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpiar
                            </button>
                            <button
                                onClick={firmarInforme}
                                disabled={firmando || !pre_informe}
                                className="btn-primary flex-1"
                            >
                                {firmando ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Firmando...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4" /> Firmar y Aprobar</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
