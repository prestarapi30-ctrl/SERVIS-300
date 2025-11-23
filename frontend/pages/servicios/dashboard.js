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

  const statusClass = (s) => {
    switch (s) {
      case 'pending': return 'chip status-pending';
      case 'processing': return 'chip status-processing';
      case 'completed': return 'chip status-completed';
      case 'cancelled': return 'chip status-cancelled';
      default: return 'chip';
    }
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
      {/* Hero de bienvenida (sin botones) */}
      <div className="panel" style={{ marginBottom: 16, padding: 16 }}>
        <div className="title gradient">Órdenes al instante, sin complicaciones</div>
        <div className="muted" style={{ marginTop: 6 }}>
        gestiona tus servicios facil, rapido y seguro.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <span className="badge glow">🧭 Navegación simple</span>
        <span className="badge glow">🚀 Procesos optimizados</span>
        </div>
      </div>

      {/* Contenido detallado del panel se mantiene oculto por ahora */}
      {/* Modal de recarga */}
      <Modal open={rechargeOpen} title="Recargar saldo" onClose={() => setRechargeOpen(false)}>
        <div style={{ marginBottom: 10 }}>
          <label className="label">Método de pago</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="YAPE">YAPE</option>
            <option value="EFECTIVO">PAGO EFECTIVO</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="label">{method === 'USDT' ? 'Monto (mínimo $ 10)' : 'Monto (mínimo S/ 20)'}</label>
          <input className="input" type="number" min={method === 'USDT' ? 10 : 20} value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} />
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
              const minAllowed = method === 'USDT' ? 10 : 20;
              if (amount < minAllowed) return alert(`El monto mínimo es ${method === 'USDT' ? '$ 10' : 'S/ 20'}`);
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