export default function FeatureGrid() {
  const features = [
    { title: 'Experiencia fluida', desc: 'Interfaz clara y rápida para pedir servicios sin fricción.', icon: '🧭' },
    { title: 'Seguridad primero', desc: 'Tokens y autenticación segura para proteger tu cuenta.', icon: '🛡️' },
    { title: 'Ahorro inteligente', desc: 'Descuento automático aplicado en la mayoría de servicios.', icon: '💡' },
    { title: 'Soporte humano', desc: 'Te ayudamos por Telegram con respuestas útiles y rápidas.', icon: '🤝' },
    { title: 'Pagos verificados', desc: 'Confirmaciones y comprobantes para tu tranquilidad.', icon: '✅' },
    { title: 'Velocidad real', desc: 'Procesos optimizados para resolver en minutos.', icon: '⚡' },
  ];
  return (
    <div className="panel section">
      <div className="title" style={{ marginBottom: 14 }}>Por qué elegirnos</div>
      <div className="grid">
        {features.map((f, i) => (
          <div key={i} className="card hoverable" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
            <div style={{ fontSize: 24, lineHeight: '32px' }}>{f.icon}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{f.title}</div>
              <div className="muted" style={{ marginTop: 6 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}