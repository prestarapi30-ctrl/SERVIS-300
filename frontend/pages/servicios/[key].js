import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';
import ServicesGallery from '../../components/ServicesGallery';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ServicioDinamico() {
  const [def, setDef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        setIsAuthed(!!token);
        const key = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';
        const r = await fetch(`${API}/api/services/${key}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Servicio no encontrado');
        setDef(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <Layout>
      <div className="section">
        {loading && <div className="muted">Cargando servicio...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && !isAuthed && (
          <>
            <div className="panel" style={{ marginBottom: 14 }}>
              <div className="title" style={{ fontSize: 18 }}>Previsualización</div>
              <div className="muted">Para gestionar este servicio debes iniciar sesión.</div>
            </div>
            <ServicesGallery />
          </>
        )}
        {!loading && !error && isAuthed && def && (
          <ServiceForm
            serviceKey={def.key}
            title={def.name}
            fields={def.required_fields || []}
            pricingType={def.pricing_type}
            fixedPrice={def.pricing_type === 'fixed' ? Number(def.fixed_price || 0) : undefined}
            discountPercentOverride={def.pricing_type === 'discount' ? (def.discount_percent !== null && def.discount_percent !== undefined ? Number(def.discount_percent) : undefined) : undefined}
          />
        )}
      </div>
    </Layout>
  );
}