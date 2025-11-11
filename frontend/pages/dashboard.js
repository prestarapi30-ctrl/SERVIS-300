import { useEffect, useState } from 'react';
import axios from 'axios';
import Shell from '../components/Shell';
import Modal from '../components/Modal';

const API = process.env.NEXT_PUBLIC_API_URL;
const RECHARGE_BOT_USERNAME = 'PAGASEGUROBOT';

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [method, setMethod] = useState('YAPE');
  const [amount, setAmount] = useState(20);
  const [confirmed, setConfirmed] = useState(false);
  const statusMap = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };

  async function load() {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/login');
    const r = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    setMe(r.data);
    const o = await axios.get(`${API}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
    setOrders(o.data);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <Shell>
      <div className="row">
        <div className="col">
          <div className="panel">
            <div className="title">Mi saldo</div>
            <p>Balance: <strong>S/ {me?.balance ?? 0}</strong></p>
            <p>Token de saldo: <span className="pill">{me?.token_saldo}</span></p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setRechargeOpen(true)}>Recargar saldo</button>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="panel">
            <div className="title">Historial de órdenes</div>
            <div>
              {orders.length === 0 && <div className="muted">Sin órdenes</div>}
              {orders.map(o => (
                <div className="card" key={o.id} style={{ marginBottom: 10 }}>
                  <div><strong>{o.service_type}</strong> — S/ {o.final_price}</div>
                  <div className="muted">Estado: {statusMap[o.status] || o.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Modal de recarga */}
      <Modal open={rechargeOpen} title="Recargar saldo" onClose={() => setRechargeOpen(false)}>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Método de pago</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>YAPE</option>
            <option>EFECTIVO</option>
            <option>USDT</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Monto (mínimo S/ 20)</label>
          <input className="input" type="number" min={20} value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>Confirmo que el método y el monto son correctos.</span>
          </label>
          <div className="muted" style={{ marginTop: 6 }}>El bot solo acepta enlaces generados desde el Panel.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" disabled={!confirmed} onClick={async () => {
            try {
              if (amount < 20) return alert('El monto mínimo es S/ 20');
              const token = localStorage.getItem('token');
              if (!token) {
                alert('Debes iniciar sesión.');
                window.location.href = '/login';
                return;
              }
              const r = await axios.post(`${API}/api/recharge/intents`, { method, amount }, { headers: { Authorization: `Bearer ${token}` } });
              const intentId = r.data.intent_id;
              if (!intentId) return alert('No se pudo crear la solicitud de recarga.');
              const startParam = `INTENT_${intentId}`;
              window.open(`https://t.me/${RECHARGE_BOT_USERNAME}?start=${encodeURIComponent(startParam)}`,'_blank');
            } catch (e) {
              alert(e.response?.data?.error || e.message);
            }
          }}>Confirmar</button>
          <button className="btn secondary" onClick={() => setRechargeOpen(false)}>Cancelar</button>
        </div>
      </Modal>
    </Shell>
  );
}