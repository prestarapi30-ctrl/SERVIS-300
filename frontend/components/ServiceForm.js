import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

const API = process.env.NEXT_PUBLIC_API_URL;

const SERVICE_CONFIG = {
  'taxi': {
    priceLabel: 'Monto total',
    fields: [
      { name: 'ciudad', label: 'Ciudad' },
      { name: 'desde', label: 'Desde' },
      { name: 'hacia', label: 'Hacia' }
    ]
  },
  'vuelos-bus': {
    priceLabel: 'Precio total',
    fields: [
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['Vuelo', 'Bus'] },
      { name: 'aerolinea_agencia', label: 'Aerolínea / Agencia' },
      { name: 'ciudad_origen', label: 'Ciudad origen' },
      { name: 'ciudad_destino', label: 'Ciudad destino' },
      { name: 'fecha_viaje', label: 'Fecha de viaje', type: 'date' }
    ]
  },
  'pago-universidad': {
    priceLabel: 'Monto',
    fields: [
      { name: 'universidad', label: 'Universidad' },
      { name: 'link_campus', label: 'Link del campus' },
      { name: 'usuario_campus', label: 'Usuario del campus' },
      { name: 'contraseña_campus', label: 'Contraseña del campus', type: 'password' },
      { name: 'dni', label: 'DNI' },
      { name: 'nombres_completos', label: 'Nombres completos' }
    ]
  },
  'cambio-notas': {
    fixed: 350,
    fields: [
      { name: 'escuela_universidad', label: 'Escuela/Universidad' },
      { name: 'curso', label: 'Curso' },
      { name: 'profesor', label: 'Profesor' },
      { name: 'correo_institucional', label: 'Correo institucional' },
      { name: 'correo_personal', label: 'Correo personal' },
      { name: 'telefono', label: 'Teléfono' }
    ]
  },
  'pago-luz': {
    priceLabel: 'Monto',
    fields: [
      { name: 'empresa', label: 'Empresa' },
      { name: 'codigo_pago', label: 'Código de pago' },
      { name: 'usuario', label: 'Usuario' },
      { name: 'contraseña', label: 'Contraseña', type: 'password' }
    ]
  },
  'pago-internet': {
    priceLabel: 'Monto',
    fields: [
      { name: 'empresa', label: 'Empresa' },
      { name: 'usuario', label: 'Usuario' },
      { name: 'contraseña', label: 'Contraseña', type: 'password' },
      { name: 'codigo_pago', label: 'Código de pago' }
    ]
  },
  'pago-movil': {
    priceLabel: 'Monto',
    fields: [
      { name: 'operador', label: 'Operador', type: 'select', options: ['Bitel', 'Claro', 'Movistar', 'Entel'] },
      { name: 'numero', label: 'Número' },
      { name: 'contraseña_app', label: 'Contraseña de app', type: 'password' }
    ]
  }
};

export default function ServiceForm({ serviceKey, title, fixedPrice }) {
  const cfg = SERVICE_CONFIG[serviceKey] || { priceLabel: 'Monto', fields: [] };
  const [price, setPrice] = useState(fixedPrice || 0);
  const [form, setForm] = useState(() => Object.fromEntries((cfg.fields || []).map(f => [f.name, ''])));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Reset form when serviceKey changes
    const newCfg = SERVICE_CONFIG[serviceKey] || { fields: [] };
    setForm(Object.fromEntries((newCfg.fields || []).map(f => [f.name, ''])));
    setPrice(fixedPrice || newCfg.fixed || 0);
  }, [serviceKey, fixedPrice]);

  const calc = () => {
    if (serviceKey === 'cambio-notas') {
      return { original: 350, discount: 0, final: 350 };
    }
    const original = Number(price || 0);
    const discount = Number((original * 0.3).toFixed(2));
    const final = Number((original - discount).toFixed(2));
    return { original, discount, final };
  };

  async function createOrder() {
    const token = localStorage.getItem('token');
    try {
      const { final } = calc();
      const r = await axios.post(`${API}/api/services/${serviceKey}`, {
        price: serviceKey === 'cambio-notas' ? 350 : Number(price),
        meta: {
          ...form,
          descuento_aplicado: serviceKey === 'cambio-notas' ? '0%' : '30%',
          precio_final: final
        }
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data);
      setConfirmOpen(false);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  const { original, discount, final } = calc();

  return (
    <div className="panel">
      <div className="title" style={{ marginBottom: 12 }}>{title}</div>
      {/* Dynamic fields per service */}
      <div>
        {cfg.fields.map((f) => (
          <div key={f.name} style={{ marginBottom: 10 }}>
            <label className="label">{f.label}</label>
            {f.type === 'select' ? (
              <select className="input" value={form[f.name]}
                onChange={(e) => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}>
                <option value="">Selecciona</option>
                {(f.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={f.type || 'text'}
                value={form[f.name]}
                onChange={(e) => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      {serviceKey !== 'cambio-notas' && (
        <div style={{ marginBottom: 10 }}>
          <label className="label">{cfg.priceLabel || 'Monto'}</label>
          <input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      )}
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">Original: <strong>S/ {original}</strong></div>
        <div className="card">Descuento: <strong>S/ {discount}</strong></div>
        <div className="card">Final: <strong>S/ {final}</strong></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn secondary" onClick={() => setConfirmOpen(true)}>Confirmar</button>
      </div>

      <Modal open={confirmOpen} title="Confirmar orden" onClose={() => setConfirmOpen(false)}>
        <p>Se creará la orden por <strong>S/ {final}</strong>.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={createOrder}>Crear orden</button>
        </div>
      </Modal>

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div>Orden creada: <strong>{result.id}</strong></div>
          <div>Estado: {{ pending: 'Pendiente', processing: 'Procesando', completed: 'Completada', cancelled: 'Cancelada' }[result.status] || result.status}</div>
        </div>
      )}
    </div>
  );
}