import { useEffect, useState } from 'react';
import axios from 'axios';
import Shell from '../../components/Shell';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({ global_discount_percent: 30, fixed_price_cambio_notas: 350 });
  const [saving, setSaving] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const totalBalance = users.reduce((sum, u) => sum + Number(u.balance || 0), 0);
  const [metrics, setMetrics] = useState({ recharges_today: 0, pending_orders: 0 });

  async function load() {
    // Elegir token admin: preferir token de usuario con rol admin
    let tokenToUse = null;
    try {
      const userToken = localStorage.getItem('token');
      if (userToken) {
        const me = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${userToken}` } });
        if (me.data?.role === 'admin') {
          tokenToUse = userToken;
        }
      }
    } catch (_) {}
    if (!tokenToUse) {
      const adminLoginToken = localStorage.getItem('admin_token');
      if (adminLoginToken) tokenToUse = adminLoginToken;
    }
    if (!tokenToUse) return (window.location.href = '/admin/login');
    setAdminToken(tokenToUse);
    const u = await axios.get(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
    setUsers(u.data);
    const o = await axios.get(`${API}/api/admin/orders`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
    setOrders(o.data);
    const s = await axios.get(`${API}/api/admin/settings`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
    setSettings(s.data);
    try {
      const m = await axios.get(`${API}/api/admin/metrics`, { headers: { Authorization: `Bearer ${tokenToUse}` } });
      setMetrics(m.data);
    } catch (_) {}
  }

  async function updateStatus(id, status) {
    const token = adminToken || localStorage.getItem('admin_token');
    const r = await axios.patch(`${API}/api/admin/orders/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(orders.map(x => x.id === id ? r.data : x));
  }

  async function recharge(id) {
    const token = adminToken || localStorage.getItem('admin_token');
    const amt = Number(prompt('Monto a recargar:') || 0);
    if (!amt) return;
    await axios.post(`${API}/api/admin/users/${id}/recharge`, { amount: amt }, { headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  useEffect(() => { load(); }, []);

  async function saveSettings() {
    const token = adminToken || localStorage.getItem('admin_token');
    setSaving(true);
    try {
      const payload = {
        global_discount_percent: Number(settings.global_discount_percent),
        fixed_price_cambio_notas: Number(settings.fixed_price_cambio_notas)
      };
      const s = await axios.patch(`${API}/api/admin/settings`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setSettings(s.data);
      alert('Configuración actualizada');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="title">Resumen del sistema</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted">Usuarios registrados</div>
            <div className="title" style={{ fontSize: 22 }}>{users.length}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted">Saldo total</div>
            <div className="title" style={{ fontSize: 22 }}>S/ {Number(totalBalance).toFixed(2)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted">Monto total de recargas hoy</div>
            <div className="title" style={{ fontSize: 22 }}>S/ {Number(metrics.recharges_today || 0).toFixed(2)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted">Órdenes pendientes</div>
            <div className="title" style={{ fontSize: 22 }}>{Number(metrics.pending_orders || orders.filter(o => o.status==='pending').length)}</div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="panel">
            <div className="title">Configuración de precios</div>
            <div className="card" style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Porcentaje de descuento global (%)</label>
              <input type="number" min="0" max="100" value={settings.global_discount_percent}
                     onChange={e => setSettings({ ...settings, global_discount_percent: e.target.value })} />
            </div>
            <div className="card" style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Precio fijo de "cambio-notas" (S/)</label>
              <input type="number" min="1" step="0.01" value={settings.fixed_price_cambio_notas}
                     onChange={e => setSettings({ ...settings, fixed_price_cambio_notas: e.target.value })} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn" disabled={saving} onClick={saveSettings}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="panel">
            <div className="title">Usuarios <span className="pill">Total: {users.length}</span></div>
            {users.map(u => (
              <div className="card" key={u.id} style={{ marginBottom: 10 }}>
                <div><strong>{u.name}</strong> — {u.email}</div>
                <div className="muted">Saldo: S/ {u.balance} | Token: {u.token_saldo}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn secondary" onClick={() => recharge(u.id)}>Recargar saldo</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col">
          <div className="panel">
            <div className="title">Órdenes</div>
            {orders.map(o => (
              <div className="card" key={o.id} style={{ marginBottom: 10 }}>
                <div><strong>{o.service_type}</strong> — S/ {o.final_price}</div>
                <div className="muted">Solicitado por: {o.user_name} — {o.user_email}{o.user_phone ? ` — Tel: ${o.user_phone}` : ''}</div>
                <div className="muted">Estado: {o.status}</div>
                <div style={{ marginTop: 8 }}>
                  {['pending','processing','completed','cancelled'].map(s => (
                    <button key={s} className="btn" style={{ marginRight: 6 }} onClick={() => updateStatus(o.id, s)}>{s}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}