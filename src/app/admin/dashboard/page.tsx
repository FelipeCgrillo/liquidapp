'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Inbox } from '@/components/dashboard/Inbox';
import { ClaimDetail } from '@/components/dashboard/ClaimDetail';
import { ActionPanel } from '@/components/dashboard/ActionPanel';
import type { Siniestro, SiniestroCompleto } from '@/types';
import { Loader2 } from 'lucide-react';

import { useSignedUrl } from '@/hooks/useSignedUrl';

export default function AdminDashboardPage() {
    const [claims, setClaims] = useState<Siniestro[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedClaim, setSelectedClaim] = useState<SiniestroCompleto | null>(null);
    const [loadingInbox, setLoadingInbox] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const { getSignedUrl } = useSignedUrl();

    // 1. Fetch List of Claims (Inbox)
    useEffect(() => {
        const fetchClaims = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('siniestros')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Pagination could be added later

            if (!error && data) {
                setClaims(data);
                // Select first claim by default if available
                if (data.length > 0 && !selectedId) {
                    setSelectedId(data[0].id);
                }
            } else {
                console.error('Error fetching claims:', error);
            }
            setLoadingInbox(false);
        };

        fetchClaims();
    }, []);

    // 2. Fetch Selected Claim Details
    useEffect(() => {
        if (!selectedId) return;

        const fetchClaimDetail = async () => {
            setLoadingDetail(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('siniestros')
                .select(`
                    *,
                    liquidador_campo:perfiles!liquidador_campo_id(nombre_completo, telefono),
                    liquidador_senior:perfiles!liquidador_senior_id(nombre_completo, telefono),
                    evidencias (
                        *,
                        analisis_ia (*)
                    ),
                    pre_informe:pre_informes(*)
                `)
                .eq('id', selectedId)
                .single();

            if (!error && data) {
                // Generar URLs firmadas para las evidencias visuales
                const evidenciasConUrl = await Promise.all(
                    (data.evidencias || []).map(async (ev: any) => {
                        if (ev.storage_path) {
                            const url = await getSignedUrl(ev.storage_path);
                            return { ...ev, url_publica: url };
                        }
                        return ev;
                    })
                );

                const claimCompleto: SiniestroCompleto = {
                    ...data,
                    evidencias: evidenciasConUrl,
                    liquidador_campo: data.liquidador_campo || null,
                    liquidador_senior: data.liquidador_senior || null,
                    pre_informe: data.pre_informe || null
                };

                setSelectedClaim(claimCompleto);
            } else {
                console.error('Error fetching claim detail:', error);
            }
            setLoadingDetail(false);
        };

        fetchClaimDetail();
    }, [selectedId, getSignedUrl]);

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* Column 1: Inbox (Left) - 20% */}
            <aside className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100 font-bold text-lg text-gray-800">
                    Siniestros ({claims.length})
                </div>
                <Inbox
                    claims={claims}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    loading={loadingInbox}
                />
            </aside>

            {/* Column 2: The Expedient (Center) - 50% */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
                <header className="h-16 border-b border-gray-200 flex items-center px-6 justify-between bg-white/80 backdrop-blur-sm z-10">
                    {selectedClaim ? (
                        <div>
                            <h1 className="text-xl font-bold">Siniestro #{selectedClaim.numero_siniestro}</h1>
                            <p className="text-xs text-gray-500">
                                {selectedClaim.nombre_asegurado} | {selectedClaim.patente} | {selectedClaim.marca} {selectedClaim.modelo}
                            </p>
                        </div>
                    ) : (
                        <div className="h-full flex items-center">
                            <span className="text-gray-400 text-sm">Selecciona un siniestro...</span>
                        </div>
                    )}
                </header>
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {loadingDetail ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : (
                        <ClaimDetail siniestro={selectedClaim} />
                    )}
                </div>
            </main>

            {/* Column 3: The Brain (Right) - 30% */}
            <aside className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 font-bold text-sm text-gray-500 uppercase tracking-wider">
                    Análisis & Acción
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <ActionPanel />
                </div>
            </aside>
        </div>
    );
}
