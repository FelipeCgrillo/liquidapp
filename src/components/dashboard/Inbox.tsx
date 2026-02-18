'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

const MOCK_CLAIMS = [
    { id: 'LIQ-8492', plate: 'KLPW-92', time: '5m', status: 'urgent', risk: 'high' },
    { id: 'LIQ-8491', plate: 'JJRS-11', time: '12m', status: 'pending', risk: 'medium' },
    { id: 'LIQ-8490', plate: 'PRTS-22', time: '34m', status: 'fast-track', risk: 'low' },
    { id: 'LIQ-8489', plate: 'ABCD-12', time: '1h', status: 'pending', risk: 'medium' },
    { id: 'LIQ-8488', plate: 'XYZW-33', time: '2h', status: 'urgent', risk: 'high' },
];

export function Inbox() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input placeholder="Buscar patente o ID..." className="pl-8" />
                </div>
                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pending">Pend.</TabsTrigger>
                        <TabsTrigger value="urgent">Urgente</TabsTrigger>
                        <TabsTrigger value="ai">AI</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    {MOCK_CLAIMS.map((claim) => (
                        <div
                            key={claim.id}
                            className={`
                                group flex items-center p-3 rounded-lg border border-gray-100 hover:bg-blue-50 cursor-pointer transition-all relative overflow-hidden bg-white shadow-sm
                                ${claim.id === 'LIQ-8492' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : ''}
                            `}
                        >
                            {/* Status Bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${claim.risk === 'high' ? 'bg-red-500' :
                                    claim.risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />

                            <div className="ml-3 flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-gray-900">{claim.plate}</span>
                                    <span className="text-xs text-gray-400 font-mono">{claim.time}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500">{claim.id}</span>
                                    <Badge variant="outline" className={`text-xs px-1 ${claim.status === 'urgent' ? 'text-red-600 bg-red-50 border-red-200' :
                                            claim.status === 'fast-track' ? 'text-green-600 bg-green-50 border-green-200' :
                                                'text-gray-600 bg-gray-50'
                                        }`}>
                                        {claim.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
