import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';

export default function ReferenciasAdmin() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No autenticado');
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/me`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Autenticación inválida');
        const me = await res.json();
        if (me.role !== 'admin') throw new Error('No autorizado');
        setAllowed(true);
        // cargar listado admin
        const listUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/referencias`;
        const lr = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
        const data = await lr.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (!file) throw new Error('Selecciona una imagen');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autenticado');
      const reader = new FileReader();
      const asPromise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await asPromise;
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/referencias`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, image_base64: base64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir');
      setSuccess('Captura subida correctamente');
      setTitle('');
      setDescription('');
      setFile(null);
      // actualizar lista
      try {
        const token = localStorage.getItem('token');
        const listUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/referencias`;
        const lr = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
        const data = await lr.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (_) {}
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autenticado');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/referencias/${id}`;
      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al borrar');
      setSuccess('Captura borrada');
      setItems(items.filter(it => it.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(item) {
    setEditId(item.id);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditFile(null);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autenticado');
      let image_base64 = null;
      if (editFile) {
        const reader = new FileReader();
        const prom = new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; });
        reader.readAsDataURL(editFile);
        image_base64 = await prom;
      }
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/referencias/${editId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, description: editDescription, image_base64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al editar');
      setSuccess('Captura actualizada');
      setItems(items.map(it => it.id === editId ? { ...it, title: editTitle, description: editDescription, image_url: data.image_url } : it));
      setEditId(null);
      setEditFile(null);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Shell title="Referencias (Admin)">
      <div className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ padding: 16 }}>
          <div className="title" style={{ fontSize: 22, marginBottom: 8 }}>Subir capturas</div>
          {loading && <div>Cargando...</div>}
          {!loading && !allowed && (
            <div className="error">{error || 'No autorizado'}</div>
          )}
          {!loading && allowed && (
            <form onSubmit={handleSubmit}>
              {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
              {success && <div className="success" style={{ marginBottom: 8 }}>{success}</div>}
              <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
                <label>
                  Título
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Pago ENTEL 50% completado" />
                </label>
                <label>
                  Descripción
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles de la evidencia" />
                </label>
                <label>
                  Imagen
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                <button className="btn" type="submit">Subir</button>
              </div>
            </form>
          )}
        </div>
        {allowed && (
          <div className="panel" style={{ padding: 16, marginTop: 16 }}>
            <div className="title" style={{ fontSize: 20 }}>Listado de capturas</div>
            {items.length === 0 && <div className="muted" style={{ marginTop: 8 }}>No hay capturas.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
              {items.map((item) => (
                <div key={item.id} className="panel" style={{ padding: 12 }}>
                  <img
                    src={(item.image_url && item.image_url.startsWith('http')) ? item.image_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${item.image_url?.startsWith('/') ? '' : '/'}${item.image_url || ''}`}
                    alt={item.title || 'Captura'}
                    style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }}
                    onClick={() => {
                      const src = (item.image_url && item.image_url.startsWith('http')) ? item.image_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${item.image_url?.startsWith('/') ? '' : '/'}${item.image_url || ''}`;
                      setPreviewUrl(src);
                    }}
                  />
                  {editId === item.id ? (
                    <form onSubmit={saveEdit} style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" />
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descripción" />
                      <input type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
                      <div className="cta-group" style={{ display: 'flex', gap: 8 }}>
                        <button className="btn sm" type="submit">Guardar</button>
                        <button className="btn sm secondary" type="button" onClick={() => setEditId(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="title" style={{ fontSize: 16, marginTop: 8 }}>{item.title || 'Sin título'}</div>
                      {item.description && <div className="muted" style={{ marginTop: 4 }}>{item.description}</div>}
                      <div className="cta-group" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn sm" onClick={() => startEdit(item)}>Editar</button>
                        <button className="btn sm danger" onClick={() => handleDelete(item.id)}>Borrar</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <img src={previewUrl} alt="Vista previa" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </Shell>
  );
}