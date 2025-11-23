import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';

export default function ServiciosAdmin() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [items, setItems] = useState([]);

  // Form crear
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [pricingType, setPricingType] = useState('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [fields, setFields] = useState([]);
  const [active, setActive] = useState(true);

  // Edit
  const [editKey, setEditKey] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPricingType, setEditPricingType] = useState('fixed');
  const [editFixedPrice, setEditFixedPrice] = useState('');
  const [editDiscountPercent, setEditDiscountPercent] = useState('');
  const [editFields, setEditFields] = useState([]);
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No autenticado');
        const meUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me`;
        const meRes = await fetch(meUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!meRes.ok) throw new Error('Autenticación inválida');
        const me = await meRes.json();
        if (me.role !== 'admin') throw new Error('No autorizado');
        setAllowed(true);
        const listUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/services`;
        const lr = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
        const data = await lr.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function addField() {
    setFields([...fields, { key: '', label: '', type: 'text', required: true }]);
  }
  function updateField(idx, prop, value) {
    const next = [...fields];
    next[idx] = { ...next[idx], [prop]: value };
    setFields(next);
  }
  function removeField(idx) {
    const next = [...fields];
    next.splice(idx, 1);
    setFields(next);
  }

  async function createService(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autenticado');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/services`;
      const body = {
        key: key.trim(),
        name: name.trim(),
        pricing_type: pricingType,
        fixed_price: pricingType === 'fixed' ? Number(fixedPrice) : undefined,
        discount_percent: pricingType === 'discount' ? (discountPercent !== '' ? Number(discountPercent) : undefined) : undefined,
        required_fields: fields,
        active
      };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear servicio');
      setSuccess('Servicio creado');
      setItems([data, ...items]);
      setKey(''); setName(''); setPricingType('fixed'); setFixedPrice(''); setDiscountPercent(''); setFields([]); setActive(true);
    } catch (e) { setError(e.message); }
  }

  function startEdit(item) {
    setEditKey(item.key);
    setEditName(item.name);
    setEditPricingType(item.pricing_type);
    setEditFixedPrice(item.fixed_price || '');
    setEditDiscountPercent(item.discount_percent ?? '');
    setEditFields(Array.isArray(item.required_fields) ? item.required_fields : []);
    setEditActive(!!item.active);
  }

  function updateEditField(idx, prop, value) {
    const next = [...editFields];
    next[idx] = { ...next[idx], [prop]: value };
    setEditFields(next);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/services/${editKey}`;
      const body = {
        name: editName,
        pricing_type: editPricingType,
        fixed_price: editPricingType === 'fixed' ? Number(editFixedPrice) : undefined,
        discount_percent: editPricingType === 'discount' ? (editDiscountPercent !== '' ? Number(editDiscountPercent) : null) : undefined,
        required_fields: editFields,
        active: editActive
      };
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      setSuccess('Servicio actualizado');
      setItems(items.map(it => it.key === editKey ? data : it));
      setEditKey(null);
    } catch (e) { setError(e.message); }
  }

  async function deleteService(key) {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/services/${key}`;
      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al borrar');
      setSuccess('Servicio borrado');
      setItems(items.filter(it => it.key !== key));
    } catch (e) { setError(e.message); }
  }

  return (
    <Shell title="Servicios (Admin)">
      <div className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ padding: 16 }}>
          <div className="title" style={{ fontSize: 22 }}>Crear servicio</div>
          {loading && <div>Cargando...</div>}
          {!loading && !allowed && <div className="error">{error || 'No autorizado'}</div>}
          {!loading && allowed && (
            <form onSubmit={createService} style={{ display: 'grid', gap: 12, maxWidth: 700 }}>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label>Key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ej. pago-entel" /></label>
                <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Pago ENTEL" /></label>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label><input type="radio" name="pt" checked={pricingType==='fixed'} onChange={() => setPricingType('fixed')} /> Precio fijo</label>
                <label><input type="radio" name="pt" checked={pricingType==='discount'} onChange={() => setPricingType('discount')} /> Con descuento</label>
              </div>
              {pricingType === 'fixed' ? (
                <label>Precio fijo<input type="number" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} placeholder="S/" /></label>
              ) : (
                <label>Descuento (%)<input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="Ej. 30" /></label>
              )}
              <div>
                <div className="title" style={{ fontSize: 16 }}>Campos requeridos</div>
                <button type="button" className="btn sm" onClick={addField} style={{ marginTop: 8 }}>Añadir campo</button>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {fields.map((f, idx) => (
                    <div key={idx} className="panel" style={{ padding: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 8 }}>
                        <input value={f.key} onChange={(e) => updateField(idx, 'key', e.target.value)} placeholder="clave (ej. numero_cuenta)" />
                        <input value={f.label} onChange={(e) => updateField(idx, 'label', e.target.value)} placeholder="Etiqueta (ej. Número de cuenta)" />
                        <select value={f.type} onChange={(e) => updateField(idx, 'type', e.target.value)}>
                          <option value="text">Texto</option>
                          <option value="number">Número</option>
                          <option value="password">Contraseña</option>
                          <option value="textarea">Texto largo</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} /> Requerido
                        </label>
                      </div>
                      <div className="cta-group" style={{ marginTop: 8 }}>
                        <button type="button" className="btn sm danger" onClick={() => removeField(idx)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
              </label>
              <button className="btn" type="submit">Crear servicio</button>
            </form>
          )}
        </div>
        {allowed && (
          <div className="panel" style={{ padding: 16, marginTop: 16 }}>
            <div className="title" style={{ fontSize: 20 }}>Listado</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginTop: 12 }}>
              {items.map((item) => (
                <div key={item.id} className="panel" style={{ padding: 12 }}>
                  {editKey === item.key ? (
                    <form onSubmit={saveEdit} style={{ display: 'grid', gap: 8 }}>
                      <div className="muted">Key: {item.key}</div>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label><input type="radio" name="ept" checked={editPricingType==='fixed'} onChange={() => setEditPricingType('fixed')} /> Precio fijo</label>
                        <label><input type="radio" name="ept" checked={editPricingType==='discount'} onChange={() => setEditPricingType('discount')} /> Con descuento</label>
                      </div>
                      {editPricingType==='fixed' ? (
                        <input type="number" value={editFixedPrice} onChange={(e) => setEditFixedPrice(e.target.value)} placeholder="Precio fijo" />
                      ) : (
                        <input type="number" value={editDiscountPercent} onChange={(e) => setEditDiscountPercent(e.target.value)} placeholder="Descuento (%)" />
                      )}
                      <div>
                        <div className="title" style={{ fontSize: 16 }}>Campos requeridos</div>
                        <button type="button" className="btn sm" onClick={() => setEditFields([...editFields, { key: '', label: '', type: 'text', required: true }])} style={{ marginTop: 8 }}>Añadir campo</button>
                        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                          {editFields.map((f, idx) => (
                            <div key={idx} className="panel" style={{ padding: 8 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 8 }}>
                                <input value={f.key} onChange={(e) => updateEditField(idx, 'key', e.target.value)} placeholder="clave" />
                                <input value={f.label} onChange={(e) => updateEditField(idx, 'label', e.target.value)} placeholder="etiqueta" />
                                <select value={f.type} onChange={(e) => updateEditField(idx, 'type', e.target.value)}>
                                  <option value="text">Texto</option>
                                  <option value="number">Número</option>
                                  <option value="password">Contraseña</option>
                                  <option value="textarea">Texto largo</option>
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input type="checkbox" checked={f.required} onChange={(e) => updateEditField(idx, 'required', e.target.checked)} /> Requerido
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} /> Activo
                      </label>
                      <div className="cta-group" style={{ display: 'flex', gap: 8 }}>
                        <button className="btn sm" type="submit">Guardar</button>
                        <button className="btn sm secondary" type="button" onClick={() => setEditKey(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="title" style={{ fontSize: 16 }}>{item.name} <span className="muted">({item.key})</span></div>
                      <div className="muted">Tipo: {item.pricing_type}
                        {item.pricing_type === 'fixed' ? ` — S/ ${item.fixed_price}` : (item.discount_percent !== null ? ` — ${item.discount_percent}%` : ' — descuento global')}
                      </div>
                      <div className="muted">Activo: {item.active ? 'Sí' : 'No'}</div>
                      <div className="cta-group" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn sm" onClick={() => startEdit(item)}>Editar</button>
                        <button className="btn sm danger" onClick={() => deleteService(item.key)}>Borrar</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}