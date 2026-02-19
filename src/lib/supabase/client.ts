import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para uso en el navegador (componentes cliente)
 */
export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error(
            '❌ FATAL: Faltan variables de entorno de Supabase.',
            '\nURL:', supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : '(undefined)',
            '\nKey:', supabaseKey ? '(set)' : '(undefined)'
        );
        throw new Error('Supabase environment variables are missing. Check your Vercel project settings.');
    }

    try {
        new URL(supabaseUrl);
    } catch (e) {
        console.error('❌ FATAL: NEXT_PUBLIC_SUPABASE_URL no es una URL válida:', supabaseUrl);
        throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL');
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
}
