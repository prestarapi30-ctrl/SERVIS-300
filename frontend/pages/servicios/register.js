import { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.post(`${API}/api/auth/register`, { name, email, password, phone });
      setSuccess(true);
      setTimeout(() => { window.location.href = '/login'; }, 1400);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="title gradient">Registrarse</div>
        {success && (
          <div className="badge success" style={{ margin: '10px 0' }}>
            <span className="spinner" />
            Cuenta creada. Redirigiendo al login…
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label className="label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label" style={{ marginTop: 10 }}>Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label" style={{ marginTop: 10 }}>Teléfono</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Número de contacto" />
          <label className="label" style={{ marginTop: 10 }}>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="cta-group" style={{ marginTop: 14 }}>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear cuenta'}
            </button>
            <a className="btn ghost" href="/login">Iniciar Sesión</a>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            Registra datos reales para recibir soporte y comprobantes.
          </div>
        </form>
      </div>
    </Layout>
  );
}