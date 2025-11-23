import { useMemo } from 'react';

export default function HeroModern({ discountPercent = 30 }) {
  const badges = useMemo(() => [
    { label: 'Atención rápida', icon: '⚡' },
    { label: 'Pagos seguros', icon: '🔒' },
    { label: 'Soporte humano', icon: '💬' },
    { label: 'Ahorro automático', icon: '💸' },
  ], []);

  return (
    <div className="panel hero section">
      <div>
        <div className="title gradient">SERVIS-30 — moderno, confiable y con ahorro automático</div>
        <p className="subtitle">Aprovecha el {discountPercent}% de descuento en la mayoría de servicios. Transparencia, soporte y atención rápida para que no te compliques.</p>
        {/* Antes del login, no mostrar acciones internas aquí para evitar duplicación;
            las CTAs de Iniciar Sesión/Registrarse viven en Home. */}
        <div className="trust">
          {badges.map((b, i) => (
            <span key={i} className="badge glow">
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span>{b.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="stat-grid">
          <div className="stat">
            <div className="muted">Tiempo de respuesta</div>
            <div className="title" style={{ fontSize: 22 }}>minutos</div>
          </div>
          <div className="stat">
            <div className="muted">Usuarios activos</div>
            <div className="title" style={{ fontSize: 22 }}>+1,000</div>
          </div>
          <div className="stat">
            <div className="muted">Descuento aplicado</div>
            <div className="title" style={{ fontSize: 22 }}>{discountPercent}%</div>
          </div>
        </div>
        {/* Se elimina marquesina redundante para mantener secciones únicas */}
      </div>
    </div>
  );
}