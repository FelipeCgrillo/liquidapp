export const dynamic = 'force-static';

export default function ProbePage() {
    return (
        <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1 style={{ color: 'green' }}>✅ PROBE STATUS: OK</h1>
            <p>If you see this, Vercel is serving static pages correctly.</p>
            <p>Timestamp: {new Date().toISOString()}</p>
        </div>
    );
}
