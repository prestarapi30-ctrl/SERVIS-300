import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, query } from './src/db.js';
import { sanitizeOrigin } from './src/utils.js';
import { registerUser, loginUser, authMiddleware, adminMiddleware } from './src/auth.js';
import { createOrder, creditUserBalanceByToken } from './src/services.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Static serving for uploaded references
app.use('/static', express.static(path.join(process.cwd(), 'public')));

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
  const r = await query('SELECT id, name, email, role, token_saldo, balance, phone FROM users WHERE id=$1', [req.user.sub]);
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
  try {
    const r = await query(`
      SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    // Obtener orden actual para decidir si corresponde reembolso
    const cur = await query('SELECT * FROM orders WHERE id=$1', [id]);
    const order = cur.rows[0];
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    // Actualizar estado
    const r = await query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
    const updated = r.rows[0];
    // Si se cancela y no estaba cancelada, reembolsar automáticamente
    if (status === 'cancelled' && order.status !== 'cancelled') {
      const userId = order.user_id;
      const amount = Number(order.final_price);
      // Operar en transacción: acreditar saldo y registrar transacción
      await query('BEGIN');
      try {
        const ur = await query('SELECT id, balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
        if (!ur.rows[0]) throw new Error('Usuario no encontrado');
        const newBalance = Number(ur.rows[0].balance) + amount;
        await query('UPDATE users SET balance=$1 WHERE id=$2', [newBalance, userId]);
        await query(
          `INSERT INTO transactions(user_id, amount, type, source, reference)
           VALUES($1,$2,'credit','refund',$3)`,
          [userId, amount, order.service_type]
        );
        await query('COMMIT');
      } catch (e) {
        await query('ROLLBACK');
        throw e;
      }
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin metrics: total recargas hoy y órdenes pendientes
app.get('/api/admin/metrics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rec = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type='credit' AND DATE(created_at) = CURRENT_DATE`
    );
    const pend = await query(
      `SELECT COUNT(*)::INT AS count FROM orders WHERE status='pending'`
    );
    res.json({ recharges_today: Number(rec.rows[0].total), pending_orders: Number(pend.rows[0].count) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin settings: descuento global y precio fijo de cambio-notas
app.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // asegurar tabla
    await query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value NUMERIC(12,2) NOT NULL, updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW())`);
    // defaults
    await query(`INSERT INTO settings(key, value) VALUES('global_discount_percent', 30) ON CONFLICT (key) DO NOTHING`);
    await query(`INSERT INTO settings(key, value) VALUES('fixed_price_cambio_notas', 350) ON CONFLICT (key) DO NOTHING`);
    const r = await query(`SELECT key, value FROM settings WHERE key IN ('global_discount_percent','fixed_price_cambio_notas')`);
    res.json(Object.fromEntries(r.rows.map(row => [row.key, Number(row.value)])));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { global_discount_percent, fixed_price_cambio_notas } = req.body;
    // Validaciones
    if (global_discount_percent !== undefined) {
      const v = Number(global_discount_percent);
      if (Number.isNaN(v) || v < 0 || v > 100) return res.status(400).json({ error: 'Descuento debe estar entre 0 y 100' });
      await query(`INSERT INTO settings(key, value) VALUES('global_discount_percent',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [v]);
    }
    if (fixed_price_cambio_notas !== undefined) {
      const v = Number(fixed_price_cambio_notas);
      if (Number.isNaN(v) || v <= 0) return res.status(400).json({ error: 'Precio fijo debe ser mayor a 0' });
      await query(`INSERT INTO settings(key, value) VALUES('fixed_price_cambio_notas',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [v]);
    }
    const r = await query(`SELECT key, value FROM settings WHERE key IN ('global_discount_percent','fixed_price_cambio_notas')`);
    res.json(Object.fromEntries(r.rows.map(row => [row.key, Number(row.value)])));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Settings públicos (solo lectura) para reflejar cambios en la UI
app.get('/api/settings', async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value NUMERIC(12,2) NOT NULL, updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW())`);
    await query(`INSERT INTO settings(key, value) VALUES('global_discount_percent', 30) ON CONFLICT (key) DO NOTHING`);
    await query(`INSERT INTO settings(key, value) VALUES('fixed_price_cambio_notas', 350) ON CONFLICT (key) DO NOTHING`);
    const r = await query(`SELECT key, value FROM settings WHERE key IN ('global_discount_percent','fixed_price_cambio_notas')`);
    res.json(Object.fromEntries(r.rows.map(row => [row.key, Number(row.value)])));
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

// Catálogo dinámico de servicios
// Asegurar tabla servicio_catalog
async function ensureServiceCatalog() {
  await query(`CREATE TABLE IF NOT EXISTS service_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    pricing_type TEXT NOT NULL, -- 'fixed' | 'discount'
    fixed_price NUMERIC(12,2),
    discount_percent NUMERIC(12,2),
    required_fields JSONB, -- array de definiciones {key,label,type,required}
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
  )`);
}

// Público: lista de servicios activos
app.get('/api/services/public', async (req, res) => {
  try {
    await ensureServiceCatalog();
    const r = await query('SELECT key, name, pricing_type, fixed_price, discount_percent, required_fields FROM service_catalog WHERE active=true ORDER BY name ASC');
    res.json(r.rows.map(row => ({
      key: row.key,
      name: row.name,
      pricing_type: row.pricing_type,
      fixed_price: row.fixed_price,
      discount_percent: row.discount_percent,
      required_fields: row.required_fields || []
    })));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Público: obtener definición de servicio por key
app.get('/api/services/:key', async (req, res) => {
  try {
    await ensureServiceCatalog();
    const { key } = req.params;
    const r = await query('SELECT key, name, pricing_type, fixed_price, discount_percent, required_fields, active FROM service_catalog WHERE key=$1', [key]);
    const row = r.rows[0];
    if (!row || !row.active) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json({
      key: row.key,
      name: row.name,
      pricing_type: row.pricing_type,
      fixed_price: row.fixed_price,
      discount_percent: row.discount_percent,
      required_fields: row.required_fields || []
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: listar catálogo completo
app.get('/api/admin/services', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await ensureServiceCatalog();
    const r = await query('SELECT * FROM service_catalog ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: crear servicio
app.post('/api/admin/services', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await ensureServiceCatalog();
    const { key, name, pricing_type, fixed_price, discount_percent, required_fields, active } = req.body;
    if (!key || !name || !pricing_type) return res.status(400).json({ error: 'key, name y pricing_type son requeridos' });
    const pt = String(pricing_type).toLowerCase();
    if (!['fixed','discount'].includes(pt)) return res.status(400).json({ error: 'pricing_type inválido' });
    if (pt === 'fixed' && (fixed_price === undefined || Number(fixed_price) <= 0)) return res.status(400).json({ error: 'fixed_price requerido para tipo fixed' });
    if (pt === 'discount' && discount_percent !== undefined && (Number(discount_percent) < 0 || Number(discount_percent) > 100)) return res.status(400).json({ error: 'discount_percent debe estar entre 0 y 100' });
    const r = await query(
      `INSERT INTO service_catalog(key, name, pricing_type, fixed_price, discount_percent, required_fields, active)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [key, name, pt, pt === 'fixed' ? Number(fixed_price) : null, pt === 'discount' ? (discount_percent !== undefined ? Number(discount_percent) : null) : null, required_fields ? JSON.stringify(required_fields) : null, active !== undefined ? !!active : true]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: actualizar servicio por key
app.patch('/api/admin/services/:key', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await ensureServiceCatalog();
    const { key } = req.params;
    const prevRes = await query('SELECT * FROM service_catalog WHERE key=$1', [key]);
    const prev = prevRes.rows[0];
    if (!prev) return res.status(404).json({ error: 'Servicio no encontrado' });
    const body = req.body || {};
    const name = body.name ?? prev.name;
    const pricing_type = body.pricing_type ? String(body.pricing_type).toLowerCase() : prev.pricing_type;
    if (!['fixed','discount'].includes(pricing_type)) return res.status(400).json({ error: 'pricing_type inválido' });
    const fixed_price = pricing_type === 'fixed' ? (body.fixed_price !== undefined ? Number(body.fixed_price) : Number(prev.fixed_price)) : null;
    const discount_percent = pricing_type === 'discount' ? (body.discount_percent !== undefined ? Number(body.discount_percent) : (prev.discount_percent !== null ? Number(prev.discount_percent) : null)) : null;
    const required_fields = body.required_fields !== undefined ? JSON.stringify(body.required_fields) : prev.required_fields;
    const active = body.active !== undefined ? !!body.active : prev.active;
    if (pricing_type === 'fixed' && (!fixed_price || fixed_price <= 0)) return res.status(400).json({ error: 'fixed_price requerido para tipo fixed' });
    if (pricing_type === 'discount' && discount_percent !== null && (discount_percent < 0 || discount_percent > 100)) return res.status(400).json({ error: 'discount_percent debe estar entre 0 y 100' });
    const r = await query(
      `UPDATE service_catalog SET name=$1, pricing_type=$2, fixed_price=$3, discount_percent=$4, required_fields=$5, active=$6, updated_at=NOW() WHERE key=$7 RETURNING *`,
      [name, pricing_type, fixed_price, discount_percent, required_fields, active, key]
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: eliminar servicio por key
app.delete('/api/admin/services/:key', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await ensureServiceCatalog();
    const { key } = req.params;
    const prevRes = await query('SELECT * FROM service_catalog WHERE key=$1', [key]);
    const prev = prevRes.rows[0];
    if (!prev) return res.status(404).json({ error: 'Servicio no encontrado' });
    await query('DELETE FROM service_catalog WHERE key=$1', [key]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint dinámico de creación de orden para servicios del catálogo
app.post('/api/services/:key', authMiddleware, async (req, res) => {
  try {
    await ensureServiceCatalog();
    const { key } = req.params;
    const defRes = await query('SELECT * FROM service_catalog WHERE key=$1 AND active=true', [key]);
    const def = defRes.rows[0];
    if (!def) return res.status(404).json({ error: 'Servicio no encontrado' });
    const { price, meta } = req.body;
    // Validar según tipo de precio
    if (def.pricing_type === 'discount') {
      const original = Number(price);
      if (!original || original <= 0) return res.status(400).json({ error: 'Precio original requerido para servicio con descuento' });
      const order = await createOrder({ userId: req.user.sub, serviceType: key, originalPrice: original, meta });
      return res.json(order);
    } else {
      // fixed: originalPrice puede ignorarse en createOrder; compute ahí
      const order = await createOrder({ userId: req.user.sub, serviceType: key, originalPrice: 0, meta });
      return res.json(order);
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
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

    if (status !== 'cancelled') {
      const r = await query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, order_id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Orden no encontrada' });
      return res.json(r.rows[0]);
    }

    // Cancelación con reembolso automático
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const or = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [order_id]);
      const prev = or.rows[0];
      if (!prev) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Actualizar estado a cancelado
      const upd = await client.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', ['cancelled', order_id]);
      const order = upd.rows[0];

      // Evitar doble reembolso: revisar transacción previa
      const existing = await client.query(
        `SELECT id FROM transactions WHERE user_id=$1 AND type='credit' AND source='refund' AND reference=$2`,
        [prev.user_id, order_id]
      );
      let refundApplied = false;
      let newBalance = null;
      if (!existing.rows[0]) {
        // Reembolsar el final_price al usuario
        const ur = await client.query('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [prev.user_id]);
        const currentBalance = Number(ur.rows[0].balance);
        const nextBalance = currentBalance + Number(prev.final_price);
        await client.query('UPDATE users SET balance=$1 WHERE id=$2', [nextBalance, prev.user_id]);
        await client.query(
          `INSERT INTO transactions(user_id, amount, type, source, reference)
           VALUES($1,$2,'credit','refund',$3)`,
          [prev.user_id, prev.final_price, order_id]
        );
        refundApplied = true;
        newBalance = nextBalance;
      }
      await client.query('COMMIT');
      return res.json({ ...order, refund_applied: refundApplied, new_balance: newBalance });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      return res.status(400).json({ error: e.message });
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Referencias (capturas)
// Lista pública de capturas
app.get('/api/referencias', async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS referencias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT,
      description TEXT,
      image_path TEXT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`);
    const r = await query('SELECT id, title, description, image_path FROM referencias ORDER BY created_at DESC');
    const base = process.env.BACKEND_URL || '';
    const items = r.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      image_url: `${base}/static/referencias/${row.image_path}`
    }));
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Lista admin de capturas (incluye metadatos completos)
app.get('/api/admin/referencias', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query('SELECT id, title, description, image_path, created_at FROM referencias ORDER BY created_at DESC');
    const base = process.env.BACKEND_URL || '';
    const items = r.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      image_path: row.image_path,
      image_url: `${base}/static/referencias/${row.image_path}`,
      created_at: row.created_at
    }));
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Subida de capturas (solo admin)
app.post('/api/admin/referencias', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, image_base64 } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'Imagen requerida (base64)' });

    // Asegurar carpeta
    const dir = path.join(process.cwd(), 'public', 'referencias');
    fs.mkdirSync(dir, { recursive: true });

    // Decodificar base64
    const m = String(image_base64).match(/^data:(.*);base64,(.*)$/);
    const mime = m ? m[1] : 'image/jpeg';
    const b64 = m ? m[2] : image_base64;
    const buf = Buffer.from(b64, 'base64');
    // Determinar extensión por mime
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';

    // Guardar registro y archivo en transacción
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO referencias(title, description, image_path) VALUES($1,$2,$3) RETURNING id`,
        [title || null, description || null, 'pending']
      );
      const id = r.rows[0].id;
      const fileName = `${id}.${ext}`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, buf);
      await client.query('UPDATE referencias SET image_path=$1 WHERE id=$2', [fileName, id]);
      await client.query('COMMIT');
      const base = process.env.BACKEND_URL || '';
      res.json({ id, image_url: `${base}/static/referencias/${fileName}` });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Editar captura (solo admin)
app.patch('/api/admin/referencias/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, image_base64 } = req.body;
    const dir = path.join(process.cwd(), 'public', 'referencias');
    fs.mkdirSync(dir, { recursive: true });

    const prevRes = await query('SELECT * FROM referencias WHERE id=$1', [id]);
    const prev = prevRes.rows[0];
    if (!prev) return res.status(404).json({ error: 'Referencia no encontrada' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let imagePath = prev.image_path;
      if (image_base64) {
        const m = String(image_base64).match(/^data:(.*);base64,(.*)$/);
        const mime = m ? m[1] : 'image/jpeg';
        const b64 = m ? m[2] : image_base64;
        const buf = Buffer.from(b64, 'base64');
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const newFileName = `${id}.${ext}`;
        const filePath = path.join(dir, newFileName);
        fs.writeFileSync(filePath, buf);
        // borrar anterior si diferente
        if (prev.image_path && prev.image_path !== newFileName) {
          const oldPath = path.join(dir, prev.image_path);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (_) {}
          }
        }
        imagePath = newFileName;
      }
      await client.query('UPDATE referencias SET title=$1, description=$2, image_path=$3 WHERE id=$4', [title || prev.title, description || prev.description, imagePath, id]);
      await client.query('COMMIT');
      const base = process.env.BACKEND_URL || '';
      res.json({ id, title: title || prev.title, description: description || prev.description, image_url: `${base}/static/referencias/${imagePath}` });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Borrar captura (solo admin)
app.delete('/api/admin/referencias/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const dir = path.join(process.cwd(), 'public', 'referencias');
    const prevRes = await query('SELECT * FROM referencias WHERE id=$1', [id]);
    const prev = prevRes.rows[0];
    if (!prev) return res.status(404).json({ error: 'Referencia no encontrada' });
    // borrar archivo
    if (prev.image_path) {
      const p = path.join(dir, prev.image_path);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (_) {}
      }
    }
    await query('DELETE FROM referencias WHERE id=$1', [id]);
    res.json({ ok: true });
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
    const upperMethod = String(method).toUpperCase();
    const minByMethod = upperMethod === 'USDT' ? 10 : 20;
    if (!amt || amt < minByMethod) {
      return res.status(400).json({ error: upperMethod === 'USDT' ? 'El monto mínimo es $ 10' : 'El monto mínimo es S/ 20' });
    }
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