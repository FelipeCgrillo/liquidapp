import { Inbox } from '../../../components/dashboard/Inbox';
import { ClaimDetail } from '../../../components/dashboard/ClaimDetail';
import { ActionPanel } from '../../../components/dashboard/ActionPanel';
import { Separator } from '@/components/ui/separator';

export default function AdminDashboardPage() {
    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* Column 1: Inbox (Left) - 20% */}
            <aside className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100 font-bold text-lg text-gray-800">
                    Siniestros (12)
                </div>
                <Inbox />
            </aside>

            {/* Column 2: The Expedient (Center) - 50% */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
                <header className="h-16 border-b border-gray-200 flex items-center px-6 justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Siniestro #LIQ-2026-8492</h1>
                        <p className="text-xs text-gray-500">Asegurado: Juan Pérez | Hyundai Tucson | Póliza: 93821-X</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Status badges could go here */}
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <ClaimDetail />
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
