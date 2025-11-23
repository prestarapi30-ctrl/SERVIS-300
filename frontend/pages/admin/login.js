import { useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Si ya estoy logueado como admin con token de usuario, no pedir login admin
  useEffect(() => {
    async function maybeRedirect() {
      try {
        const userToken = localStorage.getItem('token');
        if (!userToken) return;
        const me = await axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${userToken}` } });
        if (me.data?.role === 'admin') {
          window.location.href = '/admin';
        }
      } catch (_) {}
    }
    maybeRedirect();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const r = await axios.post(`${API}/api/admin/login`, { email, password });
      localStorage.setItem('admin_token', r.data.token);
      window.location.href = '/admin';
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  return (
    <Layout>
      <div className="panel" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="title">Admin Login</div>
        <form onSubmit={onSubmit}>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label" style={{ marginTop: 10 }}>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div style={{ marginTop: 14 }}>
            <button className="btn" type="submit">Entrar</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}