import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });


    // Si no existen las variables, permitimos el paso (modo debug/setup)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('⚠️ Supabase keys missing in Middleware!');
        return supabaseResponse;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Rutas públicas (no requieren autenticación)
    const rutasPublicas = ['/login', '/registro', '/', '/campo/nuevo-siniestro', '/claim/wizard', '/api/queue-analisis', '/api/buscar-cliente'];
    const esRutaPublica =
        rutasPublicas.includes(pathname) ||
        pathname.match(/^\/campo\/siniestro\/.*\/evidencias$/) ||
        pathname.startsWith('/claim/');

    // Si no está autenticado y accede a ruta protegida → redirigir a login
    if (!user && !esRutaPublica) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Si está autenticado y accede a login → redirigir al dashboard
    if (user && pathname === '/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.json
         * - icons
         * - sw.js (service worker)
         * - workbox-*.js (workbox scripts)
         * - presentation.html
         * - campo/nuevo-siniestro
         * - campo/siniestro/[id]/evidencias
         * - claim (client wizard)
         * - api/analizar-evidencia (public AI analysis)
         * - api/queue-analisis (public queued AI analysis)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*\\.js|presentation.html|campo/nuevo-siniestro|campo/siniestro/.*/evidencias|claim|api/analizar-evidencia|api/queue-analisis|api/buscar-cliente).*)',
    ],
};
