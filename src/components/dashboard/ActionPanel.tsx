'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertOctagon, Wrench, Shield, DollarSign } from 'lucide-react';

export function ActionPanel() {
    return (
        <div className="space-y-6">
            {/* Fraud Widget */}
            <Card className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        Probabilidad de Fraude
                        <Shield className="w-4 h-4 text-green-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-3xl font-bold text-green-600">4%</span>
                        <span className="text-xs text-gray-500 mb-1">Riesgo Bajo</span>
                    </div>
                    <Progress value={4} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />
                    <p className="text-xs text-gray-500 mt-3">
                        ✓ Metadata coincide con relato <br />
                        ✓ Ubicación verificada <br />
                        ✓ Historial limpio
                    </p>
                </CardContent>
            </Card>

            {/* Budget Widget */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        Presupuesto Estimado
                        <DollarSign className="w-4 h-4 text-gray-500" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-4">$350.000 <span className="text-sm text-gray-400 font-normal">CLP</span></div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Parachoques (Repuesto)</span>
                            <span className="font-medium">$180.000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Mano de Obra (4h)</span>
                            <span className="font-medium">$120.000</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Pintura</span>
                            <span className="font-medium">$50.000</span>
                        </div>
                    </div>

                    <Separator className="my-3" />

                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        Ver desglose detallado
                    </Button>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="pt-4 space-y-3 sticky bottom-4">
                <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-md font-bold text-white shadow-md transition-all hover:translate-y-[-1px]">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aprobar (Fast Track)
                </Button>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md font-bold text-white shadow-sm">
                    <Wrench className="w-5 h-5 mr-2" />
                    Derivar a Taller
                </Button>

                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 h-10">
                    <AlertOctagon className="w-4 h-4 mr-2" />
                    Rechazar / Investigar
                </Button>
            </div>
        </div>
    );
}
