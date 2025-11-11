import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, query } from './src/db.js';
import { sanitizeOrigin } from './src/utils.js';
import { registerUser, loginUser, authMiddleware, adminMiddleware } from './src/auth.js';
import { createOrder, creditUserBalanceByToken } from './src/services.js';

dotenv.config();

const app = express();
app.use(express.json());

const origin = sanitizeOrigin(process.env.CORS_ORIGIN || 'http://localhost:3000');
app.use(cors({ origin, credentials: true }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const user = await registerUser({ name, email, password, phone });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await loginUser({ email, password });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin login (opcional)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await loginUser({ email, password });
    if (data.user.role !== 'admin') return res.status(403).json({ error: 'No es admin' });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Current user
app.get('/api/users/me', authMiddleware, async (req, res) => {
  const r = await query('SELECT id, name, email, role, token_saldo, balance FROM users WHERE id=$1', [req.user.sub]);
  res.json(r.rows[0]);
});

// Admin list users
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const r = await query('SELECT id, name, email, role, token_saldo, balance, created_at FROM users ORDER BY created_at DESC');
  res.json(r.rows);
});

// Admin recharge
app.post('/api/admin/users/:id/recharge', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const uid = req.params.id;
    const ur = await query('SELECT * FROM users WHERE id=$1', [uid]);
    if (!ur.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    const balance = Number(ur.rows[0].balance) + Number(amount);
    await query('UPDATE users SET balance=$1 WHERE id=$2', [balance, uid]);
    await query('INSERT INTO transactions(user_id, amount, type, source, reference) VALUES($1,$2,\'credit\',\'manual\',\'admin\')', [uid, amount]);
    res.json({ ok: true, balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Orders CRUD
app.get('/api/orders', authMiddleware, async (req, res) => {
  const r = await query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.user.sub]);
  res.json(r.rows);
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { serviceType, originalPrice, meta } = req.body;
    const order = await createOrder({ userId: req.user.sub, serviceType, originalPrice, meta });
    res.json(order);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin orders
app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req, res) => {
  const r = await query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(r.rows);
});

app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    const r = await query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Service endpoints (30% off except cambio-notas)
const serviceEndpoints = [
  'taxi', 'vuelos-bus', 'pago-universidad', 'cambio-notas', 'pago-luz', 'pago-internet', 'pago-movil'
];

for (const s of serviceEndpoints) {
  app.post(`/api/services/${s}`, authMiddleware, async (req, res) => {
    try {
      const { price, meta } = req.body;
      const order = await createOrder({ userId: req.user.sub, serviceType: s, originalPrice: price, meta });
      res.json(order);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
}

// Bot endpoints
app.post('/api/bot/recarga', async (req, res) => {
  try {
    const apiKey = req.body.api_key;
    if (apiKey !== process.env.BOT_API_KEY) return res.status(403).json({ error: 'API KEY inválida' });
    const { user_token, monto } = req.body;
    const upd = await creditUserBalanceByToken({ tokenSaldo: user_token, amount: monto, source: 'bot', reference: 'telegram' });
    res.json({ ok: true, balance: upd.balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/bot/saldo', async (req, res) => {
  try {
    const apiKey = req.query.api_key;
    if (apiKey !== process.env.BOT_API_KEY) return res.status(403).json({ error: 'API KEY inválida' });
    const token = req.query.user_token;
    const r = await query('SELECT balance FROM users WHERE token_saldo=$1', [token]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ balance: r.rows[0].balance });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Bot: actualizar estado de orden
app.post('/api/bot/order-update', async (req, res) => {
  try {
    const apiKey = req.body.api_key;
    if (apiKey !== process.env.BOT_API_KEY) return res.status(403).json({ error: 'API KEY inválida' });
    const { order_id, status } = req.body;
    const allowed = ['pending','processing','completed','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const r = await query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, order_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Intents de recarga: asegurar que el bot solo responda a llamadas iniciadas desde el panel
app.post('/api/recharge/intents', authMiddleware, async (req, res) => {
  try {
    const allowed = ['YAPE','EFECTIVO','USDT'];
    const { method, amount } = req.body;
    const amt = Number(amount);
    if (!allowed.includes(String(method).toUpperCase())) return res.status(400).json({ error: 'Método inválido' });
    if (!amt || amt < 20) return res.status(400).json({ error: 'El monto mínimo es S/ 20' });
    const ur = await query('SELECT id, token_saldo FROM users WHERE id=$1', [req.user.sub]);
    const user = ur.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const r = await query(
      `INSERT INTO recharge_intents(user_id, token_saldo, method, amount, status)
       VALUES($1,$2,$3,$4,'created') RETURNING id`,
      [user.id, user.token_saldo, String(method).toUpperCase(), amt]
    );
    res.json({ intent_id: r.rows[0].id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/bot/intent/verify', async (req, res) => {
  try {
    const apiKey = req.body.api_key;
    if (apiKey !== process.env.BOT_API_KEY) return res.status(403).json({ error: 'API KEY inválida' });
    const { intent_id } = req.body;
    const r = await query('SELECT * FROM recharge_intents WHERE id=$1', [intent_id]);
    const intent = r.rows[0];
    if (!intent) return res.status(404).json({ error: 'Intent no encontrado' });
    if (intent.status !== 'created') return res.status(400).json({ error: 'Intent no válido' });
    // Expiración: 30 minutos
    const createdMs = new Date(intent.created_at).getTime();
    if (Date.now() - createdMs > 30 * 60 * 1000) {
      await query('UPDATE recharge_intents SET status=$1 WHERE id=$2', ['expired', intent_id]);
      return res.status(400).json({ error: 'Intent expirado' });
    }
    await query('UPDATE recharge_intents SET status=$1 WHERE id=$2', ['verified', intent_id]);
    res.json({ ok: true, method: intent.method, amount: intent.amount, token_saldo: intent.token_saldo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`SERVIS-30 backend escuchando en puerto ${port}, CORS origin: ${origin}`);
});