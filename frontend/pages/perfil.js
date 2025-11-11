import { useEffect, useState } from 'react';
import axios from 'axios';
import Shell from '../components/Shell';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Perfil() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/login');
    try {
      const r = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      setMe(r.data);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell>
      <div className="row">
        <div className="col">
          <div className="panel">
            <div className="title">Mi perfil</div>
            {loading && <div className="muted">Cargando...</div>}
            {!loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'center' }}>
                <div className="muted">ID</div>
                <div className="pill" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.id}</div>

                <div className="muted">Nombres</div>
                <div><strong>{me?.name || 'N/A'}</strong></div>

                <div className="muted">Correo</div>
                <div>{me?.email || 'N/A'}</div>

                <div className="muted">Teléfono</div>
                <div>{me?.phone || 'N/A'}</div>

                <div className="muted">Token saldo</div>
                <div className="pill" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.token_saldo || 'N/A'}</div>

                <div className="muted">Saldo</div>
                <div><strong>S/ {me?.balance ?? 0}</strong></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}