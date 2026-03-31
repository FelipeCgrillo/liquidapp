"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, Clock, CarFront, FileSearch, ShieldCheck, XCircle, ShieldAlert, Loader2, Scale, AlertTriangle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Cliente público
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SeguimientoPage() {
    const params = useParams();
    const siniestro_id = params.id as string;
    
    const [siniestro, setSiniestro] = useState<any>(null);
    const [decision, setDecision] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Formulario de apelación
    const [apelacionMotivo, setApelacionMotivo] = useState('');
    const [enviandoApelacion, setEnviandoApelacion] = useState(false);
    const [errorApelacion, setErrorApelacion] = useState('');

    const fetchData = async () => {
        try {
            // Reusar nuestro nuevo endpoint para obtener la data inicial
            const response = await fetch(`/api/siniestros/${siniestro_id}/estado-autoliquidacion`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                setSiniestro({ estado: data.estado });
                setDecision(data.autoliquidacion);
            } else {
                setError(data.error || 'No se encontró el siniestro solicitado.');
            }
        } catch (e: any) {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!siniestro_id) return;
        
        // 1. Fetch inicial
        fetchData();

        // 2. Suscribirse a cambios en realtime
        const channel = supabase
            .channel(`public:siniestros:id=eq.${siniestro_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'siniestros',
                    filter: `id=eq.${siniestro_id}`
                },
                (payload) => {
                    console.log('Realtime Update:', payload);
                    setSiniestro((prev: any) => ({ ...prev, ...payload.new }));
                    // Refrescar para ver si hay decisiones nuevas
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [siniestro_id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p>Cargando información del siniestro...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
                    <XCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    // Config de timeline
    const timeline = [
        { key: 'borrador', icon: CarFront, title: 'Declaración Iniciada', desc: 'Ingreso de datos y fotos' },
        { key: 'en_revision', icon: FileSearch, title: 'Análisis IA', desc: 'Validación anti-fraude y evaluación de daños' },
        { key: 'autoaprobado', icon: ShieldCheck, title: 'Dictamen Automático', desc: 'Resolución generada (Aprobada)' },
        { key: 'rechazado', icon: ShieldAlert, title: 'Rechazado / Revisión Humana', desc: 'Siniestro fue rechazado y requiere perito humano' },
        { key: 'apelado', icon: Scale, title: 'Impugnación en Curso', desc: 'Apelación Art. 70 levantada' },
        { key: 'pagado', icon: CheckCircle2, title: 'Indemnizado', desc: 'Liquidación transferida exitosamente' }
    ];

    const currentState = siniestro?.estado || 'borrador';
    
    const stateIndexMap: Record<string, number> = {
        'borrador': 0,
        'en_revision': 1,
        'autoaprobado': 2,
        'revision_senior': 2,
        'rechazado': 3,
        'apelado': 4,
        'pagado': 5
    };
    
    let currentIndex = stateIndexMap[currentState] ?? 0;
    if (currentState === 'rechazado') currentIndex = 3;
    if (currentState === 'apelado') currentIndex = 4;

    const postApelar = async () => {
        if (!apelacionMotivo.trim()) {
            setErrorApelacion('Por favor ingresa un motivo antes de enviar.');
            return;
        }
        setEnviandoApelacion(true);
        setErrorApelacion('');
        try {
            const res = await fetch(`/api/siniestros/${siniestro_id}/apelar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo: apelacionMotivo })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
            setApelacionMotivo('');
            // No seteamos nada manualmente, esperamos a Supabase Realtime para transicionar a Apelado!
        } catch (e: any) {
            setErrorApelacion(e.message);
        } finally {
            setEnviandoApelacion(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header premium */}
            <div className="bg-gradient-to-br from-blue-900 via-slate-800 to-slate-900 border-b border-white/10 px-6 py-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                
                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="text-blue-200 text-sm font-semibold tracking-wider uppercase mb-2">
                        Tracking en Tiempo Real
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Estado de tu Siniestro</h1>
                    <p className="text-slate-300">
                        Sigue en vivo el avance de tu solicitud. Nuestra Inteligencia Artificial está evaluando la evidencia provista.
                    </p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-8 -mt-6">
                {/* Flow Timeline */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                        {timeline.map((step, idx) => {
                            let isActive = false;
                            let isCompleted = false;

                            if (idx === currentIndex) isActive = true;
                            if (idx < currentIndex) isCompleted = true;
                            
                            // Lógica visual condicional de ramas (Autoaprobado vs Rechazado vs Apelado)
                            if (currentState === 'rechazado' && step.key === 'autoaprobado') { isActive = false; isCompleted = false; }
                            if (currentState === 'apelado' && step.key === 'autoaprobado') { isActive = false; isCompleted = false; }
                            if (currentState === 'autoaprobado' && (step.key === 'rechazado' || step.key === 'apelado')) { isActive = false; isCompleted = false; }
                            if (currentState === 'rechazado' && step.key === 'apelado') { isActive = false; isCompleted = false; }

                            return (
                                <div key={step.key} className="relative pl-8">
                                    {/* Punto */}
                                    <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white transition-colors duration-500
                                        ${isCompleted ? 'bg-blue-600 text-white' : 
                                          isActive && step.key === 'rechazado' ? 'bg-red-500 text-white animate-pulse' :
                                          isActive && step.key === 'autoaprobado' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                          isActive ? 'bg-blue-500 text-white' : 
                                          'bg-slate-100 text-slate-400'}`}>
                                        <step.icon className="w-4 h-4" />
                                    </div>
                                    
                                    <div>
                                        <h3 className={`font-semibold text-lg ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                                            {step.title}
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-1">{step.desc}</p>
                                        
                                        {/* Status pulse icon if Active y esperando */}
                                        {isActive && step.key === 'en_revision' && (
                                            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full inline-flex">
                                                <Loader2 className="w-3 h-3 animate-spin inline" />
                                                La IA está evaluando daños e historial
                                            </div>
                                        )}
                                        
                                        {/* Decision box content */}
                                        {isCompleted && step.key === 'en_revision' && decision && (
                                            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600">
                                                Análisis finalizado en <span className="font-semibold">{new Date(decision.created_at).toLocaleTimeString()}</span>. Score ACL: {decision.acl_score}/100.
                                            </div>
                                        )}

                                        {isActive && step.key === 'autoaprobado' && decision && (
                                            <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-[inset_0_2px_10px_rgba(16,185,129,0.05)]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-emerald-800 font-semibold">Resolución Autoaprobada</span>
                                                    <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-1 rounded-md font-bold">Fast-Track</span>
                                                </div>
                                                <p className="text-emerald-700 text-sm mb-4">
                                                    {decision.explicacion_asegurado || 'Tu siniestro ha sido aprobado automáticamente. Procederemos con la liquidación express a la cuenta ingresada.'}
                                                </p>
                                                {decision.monto_final > 0 && (
                                                    <div className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                                                        <div className="text-xs text-slate-500 uppercase font-semibold">Monto Adjudicado</div>
                                                        <div className="text-2xl font-bold text-slate-800">${decision.monto_final.toLocaleString('es-CL')}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isActive && step.key === 'rechazado' && decision && (
                                            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-5">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <span className="text-red-800 font-semibold block mb-1">Motivo de Resolución</span>
                                                        <p className="text-red-700 text-sm mb-4">
                                                            {decision.explicacion_asegurado || 'Lo sentimos, las políticas automáticas no pueden aprobar esto en su estado actual, escalando a agente humano.'}
                                                        </p>
                                                        
                                                        {/* Formulario Impugnación */}
                                                        {siniestro?.apelacion_plazo_vence && new Date() < new Date(siniestro.apelacion_plazo_vence) && (
                                                            <div className="border-t border-red-200 pt-4 mt-2">
                                                                <label className="block text-red-900 font-medium text-sm mb-2">
                                                                    Plazo Válido para Apelar hasta {new Date(siniestro.apelacion_plazo_vence).toLocaleDateString()}
                                                                </label>
                                                                <textarea
                                                                    value={apelacionMotivo}
                                                                    onChange={(e) => setApelacionMotivo(e.target.value)}
                                                                    placeholder="Describe por qué esta resolución es errónea (Art. 70)"
                                                                    className="w-full bg-white border border-red-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-3"
                                                                    rows={3}
                                                                    disabled={enviandoApelacion}
                                                                />
                                                                {errorApelacion && <p className="text-xs text-red-600 mb-2 font-semibold">! {errorApelacion}</p>}
                                                                <button 
                                                                    onClick={postApelar}
                                                                    disabled={enviandoApelacion || !apelacionMotivo.trim()}
                                                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    {enviandoApelacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                                                                    Impugnar Resolución
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {isActive && step.key === 'apelado' && (
                                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-[inset_0_2px_10px_rgba(245,158,11,0.05)]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-amber-800 font-semibold">Caso en Revisión Extraordinaria</span>
                                                    <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-md font-bold">Humano</span>
                                                </div>
                                                <p className="text-amber-700 text-sm italic mb-2">
                                                    "{siniestro?.apelacion_motivo}"
                                                </p>
                                                <p className="text-amber-800/70 py-2 border-t border-amber-200 text-sm mt-2">
                                                    Tu apelación tramitada el {new Date(siniestro?.apelacion_fecha).toLocaleDateString()} a las {new Date(siniestro?.apelacion_fecha).toLocaleTimeString()} está en revisión por nuestros liquidadores directos. Notificaremos cuando haya un veredicto.
                                                </p>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Info adicional o soporte */}
                <div className="mt-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Actualizado en tiempo real conectándose por WebSockets
                </div>
            </div>
        </div>
    );
}
