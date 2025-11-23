import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import HeroModern from '../components/HeroModern';
import FeatureGrid from '../components/FeatureGrid';
import Testimonials from '../components/Testimonials';
import PricingBanner from '../components/PricingBanner';
import ServicesGallery from '../components/ServicesGallery';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [settings, setSettings] = useState({ global_discount_percent: 30, fixed_price_cambio_notas: 350 });
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    async function loadSettings() {
      try {
        const r = await axios.get(`${API}/api/settings`);
        setSettings({
          global_discount_percent: Number(r.data?.global_discount_percent ?? 30),
          fixed_price_cambio_notas: Number(r.data?.fixed_price_cambio_notas ?? 350)
        });
      } catch (e) {
        console.warn('No se pudieron cargar settings públicos:', e.response?.data?.error || e.message);
      }
    }
    loadSettings();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      setIsAuthed(!!token);
    } catch {}
  }, []);
  const discountPercent = Number(settings.global_discount_percent || 30);
  const fixedCambioNotas = Number(settings.fixed_price_cambio_notas || 350);
  return (
    <Layout>
      <HeroModern discountPercent={discountPercent} />

      {!isAuthed && (
        <div className="panel" style={{ marginBottom: 22 }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="title gradient">Empieza ahora</div>
              <div className="muted" style={{ marginTop: 6 }}>Crea tu cuenta o inicia sesión para gestionar servicios.</div>
            </div>
            <div className="cta-group">
              <a href="/login" className="btn">Iniciar Sesión</a>
              <a href="/register" className="btn secondary">Registrarse</a>
            </div>
          </div>
        </div>
      )}

      <FeatureGrid />
      <ServicesGallery />
      <PricingBanner discountPercent={discountPercent} fixedCambioNotas={fixedCambioNotas} />
      <Testimonials />

    </Layout>
  );
}