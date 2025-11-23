export default function PricingBanner({ discountPercent = 30, fixedCambioNotas = 350 }) {
  const isAuthed = (typeof window !== 'undefined' && localStorage.getItem('token'));
  return (
    <div className="panel section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
      <div>
        <div className="title">Precios claros y ahorro automático</div>
        <div className="muted" style={{ marginTop: 6 }}>La mayoría de servicios aplican un descuento del {discountPercent}%. "Cambio de notas" tiene precio fijo transparente.</div>
        {isAuthed ? (
          <div className="cta-group" style={{ marginTop: 12 }}>
            <a className="btn sm" href="/servicios/cambio-notas">Solicitar cambio de notas</a>
            <a className="btn ghost sm" href="/dashboard#recargar">Recargar saldo</a>
          </div>
        ) : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card hoverable" style={{ textAlign: 'center' }}>
          <div className="muted">Descuento general</div>
          <div className="title" style={{ fontSize: 28 }}>{discountPercent}%</div>
          <div className="muted" style={{ fontSize: 13 }}>Aplicado automáticamente</div>
        </div>
        <div className="card hoverable" style={{ textAlign: 'center' }}>
          <div className="muted">Cambio de notas</div>
          <div className="title" style={{ fontSize: 28 }}>S/ {Number(fixedCambioNotas)}</div>
          <div className="muted" style={{ fontSize: 13 }}>Precio fijo transparente</div>
        </div>
      </div>
    </div>
  );
}