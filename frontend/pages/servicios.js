import { useEffect, useState } from 'react';
import ServicesGallery from '../components/ServicesGallery';
import Layout from '../components/Layout';

export default function ServiciosPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      setIsAuthed(!!token);
    } catch {}
  }, []);

  return (
    <Layout>
      <div className="section">
        <div className="title" style={{ marginBottom: 10 }}>Servicios disponibles</div>
        {!isAuthed && (
          <div className="muted" style={{ marginBottom: 12 }}>
            Explora el catálogo de servicios. Para generar órdenes necesitas iniciar sesión.
          </div>
        )}
        <ServicesGallery />
      </div>
    </Layout>
  );
}