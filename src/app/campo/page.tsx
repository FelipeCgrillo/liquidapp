'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    Plus, Car, Clock, CheckCircle, AlertTriangle,
    LogOut, User, ChevronRight, Shield, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Siniestro, Perfil } from '@/types';

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    borrador: { label: 'Borrador', color: 'badge-borrador', icon: Clock },
    en_revision: { label: 'En Revisión', color: 'badge-en_revision', icon: Clock },
    aprobado: { label: 'Aprobado', color: 'badge-aprobado', icon: CheckCircle },
    rechazado: { label: 'Rechazado', color: 'badge-rechazado', icon: AlertTriangle },
    cerrado: { label: 'Cerrado', color: 'badge-cerrado', icon: CheckCircle },
};

export default function CampoPage() {
    const router = useRouter();
    const [siniestros, setSiniestros] = useState<Siniestro[]>([]);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const [{ data: perfilData }, { data: siniestrosData }] = await Promise.all([
                supabase.from('perfiles').select('*').eq('id', user.id).single(),
                supabase
                    .from('siniestros')
                    .select('*')
                    .eq('liquidador_campo_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20),
            ]);

            if (perfilData) setPerfil(perfilData);
            if (siniestrosData) setSiniestros(siniestrosData);
            setLoading(false);
        };
        cargarDatos();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-dark-400">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 pb-8">
            {/* Header */}
            <div className="gradient-brand safe-top">
                <div className="px-4 pt-6 pb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-blue-200 text-xs">Liquidador de Campo</p>
                                <p className="text-white font-semibold text-sm">
                                    {perfil?.nombre_completo || 'Usuario'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Stats rápidas */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total', value: siniestros.length, icon: Car },
                            { label: 'En Revisión', value: siniestros.filter(s => s.estado === 'en_revision').length, icon: Clock },
                            { label: 'Aprobados', value: siniestros.filter(s => s.estado === 'aprobado').length, icon: CheckCircle },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white/10 rounded-2xl p-3 text-center">
                                <stat.icon className="w-4 h-4 text-blue-200 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-blue-200 text-xs">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-4 space-y-4">
                {/* Botón nuevo siniestro */}
                <button
                    onClick={() => router.push('/campo/nuevo-siniestro')}
                    className="w-full bg-dark-900 border-2 border-dashed border-brand-700 hover:border-brand-500 rounded-2xl p-5 flex items-center gap-4 transition-all group"
                >
                    <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-white">Nuevo Siniestro</p>
                        <p className="text-dark-400 text-sm">Registrar y fotografiar un siniestro</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-dark-500 ml-auto" />
                </button>

                {/* Lista de siniestros */}
                <div>
                    <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
                        Mis Siniestros Recientes
                    </h2>
                    {siniestros.length === 0 ? (
                        <div className="card text-center py-10">
                            <Car className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                            <p className="text-dark-400">No tienes siniestros registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {siniestros.map((s) => {
                                const config = ESTADO_CONFIG[s.estado];
                                const IconEstado = config.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => router.push(
                                            s.estado === 'borrador'
                                                ? `/campo/siniestro/${s.id}/evidencias`
                                                : `/campo/siniestro/${s.id}/resumen`
                                        )}
                                        className="card w-full text-left hover:border-dark-500 transition-all active:scale-98"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-white">{s.patente}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${config.color}`}>
                                                        <IconEstado className="w-3 h-3" />
                                                        {config.label}
                                                    </span>
                                                </div>
                                                <p className="text-dark-300 text-sm truncate">{s.nombre_asegurado}</p>
                                                <p className="text-dark-500 text-xs mt-1">{s.numero_siniestro}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {s.severidad_general && (
                                                    <div className="flex items-center gap-1 justify-end mb-1">
                                                        <Zap className="w-3 h-3 text-dark-400" />
                                                        <span className="text-xs text-dark-400 capitalize">{s.severidad_general}</span>
                                                    </div>
                                                )}
                                                {s.score_fraude_general !== undefined && s.score_fraude_general > 0.3 && (
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <Shield className="w-3 h-3 text-orange-400" />
                                                        <span className="text-xs text-orange-400">
                                                            {(s.score_fraude_general * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-dark-600 text-xs mt-1">
                                                    {new Date(s.created_at).toLocaleDateString('es-CL')}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
