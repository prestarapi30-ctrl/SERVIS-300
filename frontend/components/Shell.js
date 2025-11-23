import { useEffect } from 'react';
import Sidebar from './Sidebar';

export default function Shell({ children }) {
  useEffect(() => {
    let timer = null;
    const RESET_MS = 10 * 60 * 1000; // 10 minutos
    function reset() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, RESET_MS);
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, reset));
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, []);

  return (
    <div>
      <nav className="nav">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}>
          <div className="logo">
            <img src="/logo.svg" alt="SERVIS-30" width={28} height={28} />
            <strong style={{ fontSize: 18 }}>SERVIS-30</strong>
            <span className="pill">Panel</span>
          </div>
          <div className="auth-box">
            <a className="link" href="/dashboard">Dashboard</a>
            <a className="link" href="/perfil">Perfil</a>
            <a className="btn ghost sm" href="/dashboard#recargar">Recargar saldo</a>
            <button className="btn secondary sm" onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}>Cerrar sesión</button>
          </div>
        </div>
      </nav>
      <main className="container row">
        <Sidebar />
        <div className="col">
          {children}
        </div>
      </main>
      <footer className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="title" style={{ fontSize: 18 }}>Contacto</div>
            <div className="muted">Soporte y asistencia del panel disponibles.</div>
          </div>
          <div className="cta-group">
            <a className="pill link" href="https://t.me/Servis30z" target="_blank" rel="noopener noreferrer">Telegram: @Servis30z</a>
            <a className="pill link" href="mailto:contactrecia24@gmail.com">Correo: contactrecia24@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}