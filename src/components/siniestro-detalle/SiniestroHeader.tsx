import { ChevronLeft, Download, Loader2 } from 'lucide-react';

interface SiniestroHeaderProps {
    numero_siniestro: string;
    patente: string;
    nombre_asegurado: string;
    pre_informe_estado?: string;
    exportarPDF: () => void;
    exportandoPDF: boolean;
    onBack: () => void;
}

export function SiniestroHeader({
    numero_siniestro,
    patente,
    nombre_asegurado,
    pre_informe_estado,
    exportarPDF,
    exportandoPDF,
    onBack
}: SiniestroHeaderProps) {
    return (
        <div className="glass-dark border-b border-dark-700 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-dark-700">
                        <ChevronLeft className="w-5 h-5 text-dark-300" />
                    </button>
                    <div>
                        <h1 className="font-bold text-white">{numero_siniestro}</h1>
                        <p className="text-xs text-dark-400">{patente} · {nombre_asegurado}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pre_informe_estado === 'firmado' && (
                        <button
                            onClick={exportarPDF}
                            disabled={exportandoPDF}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            {exportandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
