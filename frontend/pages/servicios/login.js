import { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const r = await axios.post(`${API}/api/auth/login`, { email, password });
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      window.location.href = '/dashboard';
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  return (
    <Layout>
      <div className="panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="title gradient">Ingresar</div>
        <form onSubmit={onSubmit}>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label" style={{ marginTop: 10 }}>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="cta-group" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">Entrar</button>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>Usa credenciales registradas. Tu sesión se cerrará por inactividad.</div>
        </form>
      </div>
    </Layout>
  );
}