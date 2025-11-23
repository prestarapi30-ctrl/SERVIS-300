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

export default function ServiceForm({ serviceKey, title, fixedPrice, fields, pricingType, discountPercentOverride }) {
  const baseCfg = SERVICE_CONFIG[serviceKey] || { priceLabel: 'Monto', fields: [] };
  const cfgFields = Array.isArray(fields) && fields.length ? fields.map(f => ({ name: f.key || f.name, label: f.label, type: f.type })) : (baseCfg.fields || []);
  const [price, setPrice] = useState(fixedPrice || baseCfg.fixed || 0);
  const [form, setForm] = useState(() => Object.fromEntries((cfgFields || []).map(f => [f.name, ''])));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [me, setMe] = useState(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeMethod, setRechargeMethod] = useState('YAPE');
  const [rechargeAmount, setRechargeAmount] = useState(20);
  const [settings, setSettings] = useState({ global_discount_percent: 30, fixed_price_cambio_notas: 350 });

  useEffect(() => {
    // Reset form when serviceKey or fields change
    const newFields = Array.isArray(cfgFields) ? cfgFields : [];
    setForm(Object.fromEntries((newFields || []).map(f => [f.name, ''])));
    const newCfg = SERVICE_CONFIG[serviceKey] || {};
    setPrice(fixedPrice || newCfg.fixed || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKey, fixedPrice, fields]);

  // Cargar settings públicos (descuento global y precio fijo)
  useEffect(() => {
    async function loadSettings() {
      try {
        const r = await axios.get(`${API}/api/settings`);
        const s = {
          global_discount_percent: Number(r.data?.global_discount_percent ?? 30),
          fixed_price_cambio_notas: Number(r.data?.fixed_price_cambio_notas ?? 350)
        };
        setSettings(s);
        // si es cambio-notas, fijar precio
        if (serviceKey === 'cambio-notas') {
          setPrice(s.fixed_price_cambio_notas);
        }
      } catch (e) {
        console.warn('No se pudieron cargar settings públicos:', e.response?.data?.error || e.message);
      }
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKey]);

  // Prefill from current user
  useEffect(() => {
    async function prefill() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const r = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        setMe(r.data);
        const newCfg = SERVICE_CONFIG[serviceKey] || { fields: [] };
        setForm(prev => {
          const next = { ...prev };
          const wants = newCfg.fields.map(f => f.name);
          if (wants.includes('telefono') && r.data.phone) next['telefono'] = r.data.phone;
          if (wants.includes('correo_personal') && r.data.email) next['correo_personal'] = r.data.email;
          if (wants.includes('nombres_completos') && r.data.name) next['nombres_completos'] = r.data.name;
          return next;
        });
      } catch (e) {
        // No bloquear si falla
        console.warn('Prefill error:', e.response?.data?.error || e.message);
      }
    }
    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKey]);

  function validateForm() {
    const newCfg = { fields: cfgFields };
    const errs = [];
    for (const f of (newCfg.fields || [])) {
      const val = String(form[f.name] || '').trim();
      if (!val) errs.push(`${f.label} es obligatorio`);
      if (f.name === 'telefono' || f.name === 'numero') {
        const justDigits = val.replace(/\D+/g, '');
        if (justDigits.length < 7) errs.push(`${f.label} debe tener al menos 7 dígitos`);
      }
      if (f.name === 'correo_personal' || f.name === 'correo_institucional') {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        if (!ok) errs.push(`${f.label} no es válido`);
      }
    }
    const isFixed = pricingType === 'fixed' || serviceKey === 'cambio-notas';
    if (!isFixed) {
      const p = Number(price);
      if (!p || p <= 0) errs.push(`${cfg.priceLabel || 'Monto'} debe ser mayor a 0`);
    }
    return errs;
  }

  const calc = () => {
    const dp = discountPercentOverride !== undefined ? Number(discountPercentOverride) : Number(settings.global_discount_percent || 30);
    const fijoCambio = Number(settings.fixed_price_cambio_notas || 350);
    const isFixed = pricingType === 'fixed' || serviceKey === 'cambio-notas';
    if (isFixed) {
      const fixedOriginal = serviceKey === 'cambio-notas' ? fijoCambio : Number(fixedPrice || 0);
      const original = Number(Number(fixedOriginal).toFixed(2));
      return { original, discount: 0, final: original };
    }
    const original = Number(price || 0);
    const discount = Number(((original * dp) / 100).toFixed(2));
    const final = Number((original - discount).toFixed(2));
    return { original, discount, final };
  };

  async function createOrder() {
    const token = localStorage.getItem('token');
    try {
      const { final } = calc();
      const r = await axios.post(`${API}/api/services/${serviceKey}`, {
        price: (pricingType === 'fixed' || serviceKey === 'cambio-notas') ? Number(settings.fixed_price_cambio_notas || fixedPrice || 350) : Number(price),
        meta: {
          ...form,
          descuento_aplicado: (pricingType === 'fixed' || serviceKey === 'cambio-notas') ? '0%' : `${Number(discountPercentOverride !== undefined ? discountPercentOverride : (settings.global_discount_percent || 30))}%`,
          precio_final: final
        }
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResult(r.data);
      setConfirmOpen(false);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  async function onConfirmClick() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Debes iniciar sesión para generar una orden.');
      window.location.href = '/login';
      return;
    }
    const errs = validateForm();
    if (errs.length > 0) {
      alert(`Revisa los datos:\n- ${errs.join('\n- ')}`);
      return;
    }
    try {
      const { final } = calc();
      const r = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      setMe(r.data);
      if (Number(r.data.balance) < Number(final)) {
        setRechargeAmount(Math.max(20, Number(final) - Number(r.data.balance)));
        setRechargeOpen(true);
        return;
      }
      setConfirmOpen(true);
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
      {(cfgFields || []).map((f) => (
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

      {(pricingType !== 'fixed' && serviceKey !== 'cambio-notas') && (
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
        <button className="btn secondary" onClick={onConfirmClick}>Confirmar</button>
      </div>

      <Modal open={confirmOpen} title="Confirmar orden" onClose={() => setConfirmOpen(false)}>
        <p>Se creará la orden por <strong>S/ {final}</strong>.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={createOrder}>Crear orden</button>
        </div>
      </Modal>

      {/* Modal de recarga cuando saldo insuficiente */}
      <Modal open={rechargeOpen} title="Saldo insuficiente" onClose={() => setRechargeOpen(false)}>
        <p>Tu saldo actual es <strong>S/ {me?.balance ?? 0}</strong> y el monto final es <strong>S/ {final}</strong>.</p>
        {rechargeMethod === 'USDT' ? (
          <p>Para USDT, el monto mínimo de recarga es <strong>$ 10</strong>.</p>
        ) : (
          <p>Por favor, recarga al menos <strong>S/ {Math.max(20, Number(final) - Number(me?.balance || 0))}</strong>.</p>
        )}
        <div style={{ marginTop: 10 }}>
          <label className="label">Método de pago</label>
          <select className="input" value={rechargeMethod} onChange={(e) => setRechargeMethod(e.target.value)}>
            <option value="YAPE">YAPE</option>
            <option value="EFECTIVO">PAGO EFECTIVO</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">{rechargeMethod === 'USDT' ? 'Monto a recargar (mínimo $ 10)' : 'Monto a recargar (mínimo S/ 20)'}</label>
          <input className="input" type="number" min={rechargeMethod === 'USDT' ? 10 : 20} value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value || 0))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => {
            const minAllowed = rechargeMethod === 'USDT' ? 10 : 20;
            const payload = `${rechargeMethod}_${Math.max(minAllowed, rechargeAmount)}_${me?.token_saldo}`;
            window.open(`https://t.me/PAGASEGUROBOT?start=${encodeURIComponent(payload)}`, '_blank');
          }}>Recargar en Telegram</button>
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