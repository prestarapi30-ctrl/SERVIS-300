import { useEffect, useState } from 'react';
import axios from 'axios';
import Shell from '../../components/Shell';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  async function load() {
    const token = localStorage.getItem('admin_token');
    if (!token) return (window.location.href = '/admin/login');
    const u = await axios.get(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    setUsers(u.data);
    const o = await axios.get(`${API}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(o.data);
  }

  async function updateStatus(id, status) {
    const token = localStorage.getItem('admin_token');
    const r = await axios.patch(`${API}/api/admin/orders/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(orders.map(x => x.id === id ? r.data : x));
  }

  async function recharge(id) {
    const token = localStorage.getItem('admin_token');
    const amt = Number(prompt('Monto a recargar:') || 0);
    if (!amt) return;
    await axios.post(`${API}/api/admin/users/${id}/recharge`, { amount: amt }, { headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell>
      <div className="row">
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