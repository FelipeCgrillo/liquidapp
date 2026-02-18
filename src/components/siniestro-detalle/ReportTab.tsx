import { FileText, RefreshCw, PenTool, Loader2, Save } from 'lucide-react';
import type { PreInforme } from '@/types';

interface ReportTabProps {
    pre_informe: PreInforme | null;
    contenidoInforme: string;
    setContenidoInforme: (val: string) => void;
    editandoInforme: boolean;
    setEditandoInforme: (val: boolean) => void;
    guardandoInforme: boolean;
    guardarInforme: () => void;
    generandoInforme: boolean;
    generarInformeIA: () => void;
}

export function ReportTab({
    pre_informe,
    contenidoInforme,
    setContenidoInforme,
    editandoInforme,
    setEditandoInforme,
    guardandoInforme,
    guardarInforme,
    generandoInforme,
    generarInformeIA
}: ReportTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-400" />
                    <h2 className="font-semibold text-white">Pre-Informe Técnico</h2>
                    {pre_informe && (
                        <span className={`px-2 py-0.5 text-xs rounded-lg border ${pre_informe.estado === 'firmado' ? 'badge-aprobado' :
                            pre_informe.estado === 'revisado' ? 'badge-en_revision' : 'badge-borrador'
                            }`}>
                            {pre_informe.estado}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={generarInformeIA}
                        disabled={generandoInforme}
                        className="btn-secondary text-sm py-2 px-3"
                    >
                        {generandoInforme ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Regenerar IA</span>
                    </button>
                    {!editandoInforme && (
                        <button
                            onClick={() => setEditandoInforme(true)}
                            className="btn-secondary text-sm py-2 px-3"
                        >
                            <PenTool className="w-4 h-4" />
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                    )}
                </div>
            </div>

            {editandoInforme ? (
                <div className="space-y-3">
                    <textarea
                        value={contenidoInforme}
                        onChange={(e) => setContenidoInforme(e.target.value)}
                        className="input-base font-mono text-sm resize-none"
                        rows={20}
                        placeholder="Escribe el informe en formato Markdown..."
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={guardarInforme}
                            disabled={guardandoInforme}
                            className="btn-primary"
                        >
                            {guardandoInforme ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar
                        </button>
                        <button
                            onClick={() => setEditandoInforme(false)}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : contenidoInforme ? (
                <div
                    id="informe-para-pdf"
                    className="card prose prose-invert prose-sm max-w-none"
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}
                >
                    {contenidoInforme}
                </div>
            ) : (
                <div className="card text-center py-10">
                    <FileText className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400 mb-4">No hay pre-informe generado aún</p>
                    <button onClick={generarInformeIA} disabled={generandoInforme} className="btn-primary mx-auto">
                        {generandoInforme ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Generar con IA
                    </button>
                </div>
            )}
        </div>
    );
}
