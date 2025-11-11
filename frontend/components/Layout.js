export default function Layout({ children }) {
  return (
    <div>
      <nav className="nav">
        <div className="logo">
          <img src="/logo.svg" alt="SERVIS-30" width={28} height={28} />
          <strong style={{ fontSize: 18 }}>SERVIS-30</strong>
          <span className="pill">Panel de Servicios</span>
        </div>
        <div className="cta-group" style={{ alignItems: 'center' }}>
          <a className="link" href="/" style={{ marginRight: 12 }}>Inicio</a>
          <a className="link" href="/servicios/taxi" style={{ marginRight: 12 }}>Servicios</a>
          <a className="link" href="/dashboard" style={{ marginRight: 12 }}>Dashboard</a>
          {!(typeof window !== 'undefined' && localStorage.getItem('token')) && (
            <a className="link" href="/admin/login" style={{ marginRight: 12 }}>Admin</a>
          )}
          {typeof window !== 'undefined' && localStorage.getItem('token') ? (
            <>
              <a className="link" href="/perfil" style={{ marginRight: 12 }}>Perfil</a>
              <a className="btn ghost sm" href="/dashboard#recargar">Recargar saldo</a>
              <button className="btn secondary sm" onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}>Cerrar sesión</button>
            </>
          ) : null}
        </div>
      </nav>
      <main className="container">{children}</main>
    </div>
  );
}