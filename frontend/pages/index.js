import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      {/* Hero simplificado: solo un botón de servicios */}
      <div className="panel hero" style={{ marginBottom: 22 }}>
        <div>
          <div className="title">SERVIS-30 — moderno, confiable y con ahorro automático</div>
          <p className="subtitle">Aprovecha el 30% de descuento en la mayoría de servicios. Transparencia, soporte y atención rápida para que no te compliques.</p>
          <div className="cta-group" style={{ marginTop: 14 }}>
            {typeof window !== 'undefined' && localStorage.getItem('token') ? (
              <a className="btn sm" href="/dashboard#recargar">Recargar saldo</a>
            ) : (
              <>
                <a className="btn sm" href="/login">Ingresar</a>
                <a className="btn ghost sm" href="/register">Crear cuenta</a>
              </>
            )}
          </div>
          {/* Botón de servicios removido según indicación */}
          <div className="trust">
            <span className="badge">Seguro</span>
            <span className="badge">Descuento 30%</span>
            <span className="badge">Atención 24/7</span>
          </div>
        </div>
        <div>
          <div className="stat-grid">
            <div className="stat"><div className="muted">Usuarios</div><div style={{ fontSize: 22, fontWeight: 800 }}>+100</div></div>
            <div className="stat"><div className="muted">Órdenes</div><div style={{ fontSize: 22, fontWeight: 800 }}>+500</div></div>
            <div className="stat"><div className="muted">Ahorro</div><div style={{ fontSize: 22, fontWeight: 800 }}>30%</div></div>
          </div>
        </div>
      </div>

      {/* Servicios destacados - previsualización */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="title">Servicios destacados</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <a className="card hoverable link" href="/servicios/taxi">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Taxi</div>
            <div className="muted">Rápido y seguro. Pagas menos con SERVIS-30.</div>
          </a>
          <a className="card hoverable link" href="/servicios/vuelos-bus">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Vuelos/Bus</div>
            <div className="muted">Gestión y compra con soporte confiable.</div>
          </a>
          <a className="card hoverable link" href="/servicios/pago-universidad">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Pago Universidad</div>
            <div className="muted">Pagos asistidos y verificados.</div>
          </a>
          <a className="card hoverable link" href="/servicios/cambio-notas">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Cambio de notas</div>
            <div className="muted">Servicio especial a precio fijo S/ 350.</div>
          </a>
          <a className="card hoverable link" href="/servicios/pago-luz">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Pago Luz</div>
            <div className="muted">Ahorra y no te atrases nunca más.</div>
          </a>
          <a className="card hoverable link" href="/servicios/pago-internet">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Pago Internet</div>
            <div className="muted">Mantén tu conexión al día.</div>
          </a>
        </div>
      </div>

      {/* Se elimina grilla múltiple: solo CTA único arriba */}
    </Layout>
  );
}