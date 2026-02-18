'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    Car, Clock, CheckCircle, AlertTriangle, TrendingUp,
    Shield, DollarSign, FileText, LogOut, User,
    ChevronRight, Search, Filter, BarChart3, Zap
} from 'lucide-react';
import type { Siniestro, Perfil } from '@/types';

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
    borrador: { label: 'Borrador', color: 'badge-borrador' },
    en_revision: { label: 'En Revisión', color: 'badge-en_revision' },
    aprobado: { label: 'Aprobado', color: 'badge-aprobado' },
    rechazado: { label: 'Rechazado', color: 'badge-rechazado' },
    cerrado: { label: 'Cerrado', color: 'badge-cerrado' },
};

export default function DashboardPage() {
    const router = useRouter();
    const [siniestros, setSiniestros] = useState<Siniestro[]>([]);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const [{ data: perfilData }, { data: siniestrosData }] = await Promise.all([
            supabase.from('perfiles').select('*').eq('id', user.id).single(),
            supabase
                .from('siniestros')
                .select('*, liquidador_campo:perfiles!liquidador_campo_id(nombre_completo)')
                .order('created_at', { ascending: false })
                .limit(50),
        ]);

        if (perfilData) setPerfil(perfilData);
        if (siniestrosData) setSiniestros(siniestrosData as unknown as Siniestro[]);
        setLoading(false);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Métricas
    const totalSiniestros = siniestros.length;
    const enRevision = siniestros.filter(s => s.estado === 'en_revision').length;
    const aprobados = siniestros.filter(s => s.estado === 'aprobado').length;
    const costoTotalMin = siniestros.reduce((sum, s) => sum + (s.costo_estimado_min || 0), 0);
    const costoTotalMax = siniestros.reduce((sum, s) => sum + (s.costo_estimado_max || 0), 0);
    const alertasFraude = siniestros.filter(s => (s.score_fraude_general || 0) > 0.5).length;

    // Filtrar siniestros
    const siniestrosFiltrados = siniestros.filter(s => {
        const matchBusqueda = !busqueda ||
            s.patente.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.nombre_asegurado.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.numero_siniestro.toLowerCase().includes(busqueda.toLowerCase());
        const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
        return matchBusqueda && matchEstado;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Sidebar / Header */}
            <div className="glass-dark border-b border-dark-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center">
                            <Car className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">LiquidApp</h1>
                            <p className="text-xs text-dark-400">Dashboard Administrativo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-sm text-dark-400">
                            <User className="w-4 h-4" />
                            <span>{perfil?.nombre_completo}</span>
                            <span className="px-2 py-0.5 bg-brand-900/50 text-brand-400 text-xs rounded-lg border border-brand-800/50">
                                {perfil?.rol?.replace('_', ' ')}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-xl hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Total Siniestros',
                            value: totalSiniestros,
                            icon: Car,
                            color: 'text-brand-400',
                            bg: 'bg-brand-900/20 border-brand-800/30',
                        },
                        {
                            label: 'En Revisión',
                            value: enRevision,
                            icon: Clock,
                            color: 'text-yellow-400',
                            bg: 'bg-yellow-900/20 border-yellow-800/30',
                        },
                        {
                            label: 'Aprobados',
                            value: aprobados,
                            icon: CheckCircle,
                            color: 'text-green-400',
                            bg: 'bg-green-900/20 border-green-800/30',
                        },
                        {
                            label: 'Alertas Fraude',
                            value: alertasFraude,
                            icon: AlertTriangle,
                            color: 'text-orange-400',
                            bg: 'bg-orange-900/20 border-orange-800/30',
                        },
                    ].map((kpi) => (
                        <div key={kpi.label} className={`card border ${kpi.bg}`}>
                            <div className="flex items-center justify-between mb-3">
                                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                <TrendingUp className="w-4 h-4 text-dark-600" />
                            </div>
                            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                            <p className="text-dark-400 text-sm mt-1">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Costo total estimado */}
                <div className="card border border-dark-700 bg-gradient-to-r from-dark-900 to-dark-800">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="w-5 h-5 text-accent-400" />
                        <h3 className="font-semibold text-white">Exposición Total Estimada</h3>
                    </div>
                    <p className="text-2xl font-bold text-accent-400">
                        ${costoTotalMin.toLocaleString('es-CL')} – ${costoTotalMax.toLocaleString('es-CL')} CLP
                    </p>
                    <p className="text-dark-500 text-sm mt-1">Suma de estimaciones IA de todos los siniestros</p>
                </div>

                {/* Filtros y búsqueda */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="input-base pl-11"
                            placeholder="Buscar por patente, asegurado o número..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-dark-500" />
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="input-base w-auto"
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="borrador">Borrador</option>
                            <option value="en_revision">En Revisión</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                            <option value="cerrado">Cerrado</option>
                        </select>
                    </div>
                </div>

                {/* Tabla de siniestros */}
                <div className="card overflow-hidden p-0">
                    <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-brand-400" />
                            <h2 className="font-semibold text-white">Siniestros</h2>
                            <span className="text-dark-500 text-sm">({siniestrosFiltrados.length})</span>
                        </div>
                    </div>

                    {siniestrosFiltrados.length === 0 ? (
                        <div className="text-center py-16">
                            <FileText className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                            <p className="text-dark-400">No hay siniestros que coincidan con los filtros</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-dark-800">
                            {siniestrosFiltrados.map((s) => {
                                const config = ESTADO_CONFIG[s.estado];
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => router.push(`/dashboard/siniestro/${s.id}`)}
                                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors text-left"
                                    >
                                        {/* Patente */}
                                        <div className="w-24 flex-shrink-0">
                                            <p className="font-bold text-white">{s.patente}</p>
                                            <p className="text-dark-500 text-xs">{s.numero_siniestro}</p>
                                        </div>

                                        {/* Asegurado */}
                                        <div className="flex-1 min-w-0 hidden sm:block">
                                            <p className="text-dark-200 text-sm truncate">{s.nombre_asegurado}</p>
                                            <p className="text-dark-500 text-xs">{s.tipo_siniestro}</p>
                                        </div>

                                        {/* Estado */}
                                        <div className="flex-shrink-0">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>

                                        {/* Severidad */}
                                        {s.severidad_general && (
                                            <div className="flex-shrink-0 hidden md:flex items-center gap-1">
                                                <Zap className="w-3.5 h-3.5 text-dark-500" />
                                                <span className="text-xs text-dark-400 capitalize">{s.severidad_general}</span>
                                            </div>
                                        )}

                                        {/* Fraude */}
                                        {(s.score_fraude_general || 0) > 0.3 && (
                                            <div className="flex-shrink-0 hidden lg:flex items-center gap-1">
                                                <Shield className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="text-xs text-orange-400">
                                                    {((s.score_fraude_general || 0) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Costo */}
                                        {s.costo_estimado_max ? (
                                            <div className="flex-shrink-0 hidden xl:block text-right">
                                                <p className="text-xs text-dark-300">
                                                    ${(s.costo_estimado_max).toLocaleString('es-CL')}
                                                </p>
                                                <p className="text-xs text-dark-600">máx. CLP</p>
                                            </div>
                                        ) : null}

                                        {/* Fecha */}
                                        <div className="flex-shrink-0 text-right hidden sm:block">
                                            <p className="text-xs text-dark-500">
                                                {new Date(s.created_at).toLocaleDateString('es-CL')}
                                            </p>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-dark-600 flex-shrink-0" />
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
