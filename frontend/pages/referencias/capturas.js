import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function Capturas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/referencias`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudieron cargar las capturas');
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Capturas">
      <div className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ padding: 16 }}>
          <div className="title" style={{ fontSize: 22, marginBottom: 8 }}>Capturas</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            Evidencias de pagos y procesos completados.
          </div>
          {loading && <div>Cargando...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="muted">Aún no hay capturas disponibles.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {items.map((item) => (
              <div key={item.id} className="panel" style={{ padding: 12 }}>
                <div style={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 8, marginBottom: 8, background: '#f4f4f4' }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title || 'Captura'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="muted" style={{ padding: 16 }}>Sin imagen</div>
                  )}
                </div>
                <div className="title" style={{ fontSize: 16 }}>{item.title || 'Sin título'}</div>
                {item.description && <div className="muted" style={{ marginTop: 4 }}>{item.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}