'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import type { Siniestro } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InboxProps {
    claims: Siniestro[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    loading?: boolean;
}

export function Inbox({ claims, selectedId, onSelect, loading = false }: InboxProps) {
    if (loading) {
        return <div className="p-4 text-center text-gray-400 text-sm">Cargando siniestros...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input placeholder="Buscar patente o ID..." className="pl-8" />
                </div>
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="pending">Pend.</TabsTrigger>
                        <TabsTrigger value="urgent">Urgente</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    {claims.map((claim) => {
                        const isSelected = claim.id === selectedId;
                        const timeAgo = formatDistanceToNow(new Date(claim.created_at), { addSuffix: true, locale: es });

                        const score = claim.score_fraude_general || 0;
                        const riskColor = score > 0.6 ? 'bg-red-500' :
                            score > 0.3 ? 'bg-yellow-500' : 'bg-green-500';

                        return (
                            <div
                                key={claim.id}
                                onClick={() => onSelect(claim.id)}
                                className={`
                                    group flex items-center p-3 rounded-lg border border-gray-100 hover:bg-blue-50 cursor-pointer transition-all relative overflow-hidden bg-white shadow-sm
                                    ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : ''}
                                `}
                            >
                                {/* Status Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskColor}`} />

                                <div className="ml-3 flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-900">{claim.patente}</span>
                                        <span className="text-xs text-gray-400 font-mono whitespace-nowrap ml-2">{timeAgo}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-gray-500 truncate mr-2">{claim.numero_siniestro}</span>
                                        <Badge variant="outline" className={`text-[10px] px-1 h-5 ${claim.estado === 'borrador' ? 'text-gray-600 bg-gray-50' :
                                            claim.estado === 'en_revision' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                                                claim.estado === 'aprobado' ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-600'
                                            }`}>
                                            {claim.estado.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {claims.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No hay siniestros registrados.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
