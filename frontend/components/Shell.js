import Sidebar from './Sidebar';

export default function Shell({ children }) {
  return (
    <div>
      <nav className="nav">
        <div className="logo">
          <img src="/LOGO.svg" alt="SERVIS-30" width={28} height={28} />
          <strong style={{ fontSize: 18 }}>SERVIS-30</strong>
          <span className="pill">Panel</span>
        </div>
        <div>
          <a className="link" href="/" style={{ marginRight: 12 }}>Inicio</a>
          <a className="link" href="/dashboard" style={{ marginRight: 12 }}>Dashboard</a>
          <a className="link" href="/admin" style={{ marginRight: 12 }}>Admin</a>
          <a className="btn" href="/servicios/taxi">Nueva orden</a>
        </div>
      </nav>
      <main className="container row">
        <Sidebar />
        <div className="col">
          {children}
        </div>
      </main>
    </div>
  );
}