import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Layout({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      setIsAuthed(!!token);
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return setBalance(null);
        const r = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        const b = Number(r.data?.balance ?? 0);
        setBalance(isNaN(b) ? null : b);
      } catch {
        setBalance(null);
      }
    }
    fetchBalance();
  }, [isAuthed]);

  return (
    <div>
      <nav className="nav">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="logo">
            <img src="/logo.svg" alt="SERVIS-30" width={28} height={28} />
            <strong style={{ fontSize: 18 }}>SERVIS-30</strong>
            <span className="pill glow-pulse">Servicios</span>
          </div>
          <div className="cta-group" style={{ alignItems: 'center' }}>
            <a className="link" href="/" style={{ marginRight: 12 }}>Inicio</a>
            <a className="link" href={isAuthed ? '/dashboard' : '/servicios'} style={{ marginRight: 12 }}>Servicios</a>
            <a className="link" href="/referencias" style={{ marginRight: 12 }}>Referencias</a>
            <a className="pill link" href="https://www.tiktok.com/@servis30p?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer" style={{ marginRight: 12 }}>TikTok</a>
            {isAuthed ? (
              <>
                <a className="link" href="/dashboard" style={{ marginRight: 12 }}>Dashboard</a>
                <a className="link" href="/perfil" style={{ marginRight: 12 }}>Perfil</a>
                {balance !== null && (
                  <span className="pill glow" style={{ marginRight: 12 }} title="Saldo disponible">Saldo: S/ {balance}</span>
                )}
                <button
                  className="btn secondary sm"
                  style={{ marginLeft: 4 }}
                  onClick={() => {
                    try {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      localStorage.removeItem('admin_token');
                    } catch {}
                    window.location.href = '/login';
                  }}
                >Cerrar sesión</button>
              </>
            ) : (
              <>
                <a className="link" href="/login" style={{ marginRight: 12 }}>Login</a>
                <a className="btn sm" href="/register">Registro</a>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="container">{children}</main>
      <footer className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="title" style={{ fontSize: 18 }}>Contacto</div>
            <div className="muted">¿Necesitas ayuda? Escríbenos y te respondemos rápido.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <a className="pill link" href="https://t.me/Servis30z" target="_blank" rel="noopener noreferrer">Telegram: @Servis30z</a>
            <a className="pill link" href="mailto:contactrecia24@gmail.com">Correo: contactrecia24@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}