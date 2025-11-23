export default function ServicesGallery() {
  const services = [
    { key: 'taxi', title: 'Taxi', desc: 'Solicita viajes rápidos y seguros.', href: '/servicios/taxi' },
    { key: 'vuelos-bus', title: 'Vuelos / Bus', desc: 'Gestión de pasajes y rutas.', href: '/servicios/vuelos-bus' },
    { key: 'pago-universidad', title: 'Pago Universidad', desc: 'Pagos verificados y soporte.', href: '/servicios/pago-universidad' },
    { key: 'cambio-notas', title: 'Cambio de notas', desc: 'Precio fijo transparente.', href: '/servicios/cambio-notas' },
    { key: 'pago-luz', title: 'Pago Luz', desc: 'Pagos de servicios de luz.', href: '/servicios/pago-luz' },
    { key: 'pago-internet', title: 'Pago Internet', desc: 'Pagos de internet domiciliario.', href: '/servicios/pago-internet' },
    { key: 'pago-movil', title: 'Pago Móvil', desc: 'Recargas y pagos de telefonía.', href: '/servicios/pago-movil' },
  ];
  return (
    <div className="panel section">
      <div className="title" style={{ marginBottom: 14 }}>Catálogo de servicios</div>
      <div className="grid">
        {services.map(s => (
          <a key={s.key} href={s.href} className="card hoverable" style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10 }}>
            <div style={{ opacity: 0.9 }}>
              {/* Ícono minimal */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3Zm3-1a1 1 0 0 0-1 1v2h16V7a1 1 0 0 0-1-1Zm-1 6h6v2H4Zm10 0h6v2h-6Z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{s.title}</div>
              <div className="muted" style={{ marginTop: 6 }}>{s.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}