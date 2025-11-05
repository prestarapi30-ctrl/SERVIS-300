export default function Layout({ children }) {
  return (
    <div>
      <nav className="nav">
        <div className="logo">
          <img src="/LOGO.svg" alt="SERVIS-30" width={28} height={28} />
          <strong style={{ fontSize: 18 }}>SERVIS-30</strong>
          <span className="pill">Panel de Servicios</span>
        </div>
        <div>
          <a className="link" href="/" style={{ marginRight: 12 }}>Inicio</a>
          <a className="link" href="/servicios/taxi" style={{ marginRight: 12 }}>Servicios</a>
          <a className="link" href="/dashboard" style={{ marginRight: 12 }}>Dashboard</a>
          <a className="link" href="/admin/login" style={{ marginRight: 12 }}>Admin</a>
          <a className="btn" href="/login">Entrar</a>
        </div>
      </nav>
      <main className="container">{children}</main>
    </div>
  );
}