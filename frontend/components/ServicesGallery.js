import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ServicesGallery() {
  const fallback = [
    { key: 'taxi', name: 'Taxi' },
    { key: 'vuelos-bus', name: 'Vuelos / Bus' },
    { key: 'pago-universidad', name: 'Pago Universidad' },
    { key: 'cambio-notas', name: 'Cambio de notas' },
    { key: 'pago-luz', name: 'Pago Luz' },
    { key: 'pago-internet', name: 'Pago Internet' },
    { key: 'pago-movil', name: 'Pago Móvil' },
  ];
  const [items, setItems] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await fetch(`${API}/api/services/public`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo cargar el catálogo');
        const apiList = Array.isArray(data) ? data.filter(s => s.active !== false) : [];
        const byKey = new Map();
        // Preferir datos del backend
        apiList.forEach(s => {
          const k = String(s.key || '').trim();
          if (!k) return;
          byKey.set(k, { key: k, name: s.name || k });
        });
        // Completar con fallback si faltan
        fallback.forEach(f => {
          if (!byKey.has(f.key)) byKey.set(f.key, { key: f.key, name: f.name });
        });
        const merged = Array.from(byKey.values())
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        if (mounted) setItems(merged);
        setError(null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="panel section">
      <div className="title" style={{ marginBottom: 14 }}>Catálogo de servicios</div>
      {loading && <div className="muted">Cargando catálogo...</div>}
      {error && <div className="error">{error}</div>}
      <div className="grid">
        {items.map(s => (
          <a key={s.key} href={`/servicios/${s.key}`} className="card hoverable service-item">
            <div style={{ opacity: 0.9 }}>
              {/* Ícono minimal */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3Zm3-1a1 1 0 0 0-1 1v2h16V7a1 1 0 0 0-1-1Zm-1 6h6v2H4Zm10 0h6v2h-6Z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div className="muted" style={{ marginTop: 6 }}>Haz clic para previsualizar y gestionar.</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}