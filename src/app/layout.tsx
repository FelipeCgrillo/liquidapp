import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'LiquidApp — Liquidación de Siniestros Automotrices',
    description: 'Plataforma inteligente para la liquidación automatizada de siniestros automotrices con análisis IA en tiempo real.',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'LiquidApp',
    },
    keywords: ['liquidación', 'siniestros', 'automotriz', 'seguros', 'IA', 'antifraude'],
    authors: [{ name: 'LiquidApp' }],
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#1e40af',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className={`${inter.className} bg-dark-950 text-dark-100 antialiased`}>
                {children}
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            background: '#1f2937',
                            color: '#f9fafb',
                            border: '1px solid #374151',
                        },
                        success: {
                            iconTheme: { primary: '#3b82f6', secondary: '#fff' },
                        },
                        error: {
                            iconTheme: { primary: '#f97316', secondary: '#fff' },
                        },
                    }}
                />
            </body>
        </html>
    );
}
