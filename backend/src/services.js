import axios from 'axios';
import { query, pool } from './db.js';
import { toCurrency } from './utils.js';

// Bot de notificación de órdenes (usar variables dedicadas si están disponibles)
const ORDERS_TELEGRAM_BOT_TOKEN = process.env.ORDERS_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const ORDERS_TELEGRAM_CHAT_ID = process.env.ORDERS_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

export async function createOrder({ userId, serviceType, originalPrice, meta }) {
  // Leer configuración de precios desde settings; usar defaults si falla
  let discountPercent = 30; // default
  let fixedCambioNotas = 350; // default
  try {
    const sres = await query(
      "SELECT key, value FROM settings WHERE key IN ('global_discount_percent','fixed_price_cambio_notas')"
    );
    const map = Object.fromEntries(sres.rows.map(r => [r.key, Number(r.value)]));
    if (typeof map.global_discount_percent === 'number' && !Number.isNaN(map.global_discount_percent)) {
      discountPercent = map.global_discount_percent;
    }
    if (typeof map.fixed_price_cambio_notas === 'number' && !Number.isNaN(map.fixed_price_cambio_notas)) {
      fixedCambioNotas = map.fixed_price_cambio_notas;
    }
  } catch (_) {
    // si la tabla no existe o hay error, usamos los defaults
  }

  // Intentar encontrar definición en catálogo de servicios
  let original = toCurrency(originalPrice);
  let discount = 0;
  let final = original;
  try {
    await query(`CREATE TABLE IF NOT EXISTS service_catalog (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      pricing_type TEXT NOT NULL,
      fixed_price NUMERIC(12,2),
      discount_percent NUMERIC(12,2),
      required_fields JSONB,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )`);
    const defRes = await query('SELECT * FROM service_catalog WHERE key=$1 AND active=true', [serviceType]);
    const def = defRes.rows[0];
    if (def) {
      if (def.pricing_type === 'fixed') {
        original = toCurrency(def.fixed_price);
        discount = 0;
        final = original;
      } else {
        // descuento: usar el propio del servicio si existe; sino usar global
        const d = (def.discount_percent !== null && def.discount_percent !== undefined) ? Number(def.discount_percent) : discountPercent;
        discount = toCurrency((original * d) / 100);
        final = toCurrency(original - discount);
      }
    } else {
      // fallback a reglas existentes
      if (serviceType === 'cambio-notas') {
        original = toCurrency(fixedCambioNotas);
        discount = 0;
        final = original;
      } else {
        discount = toCurrency((original * discountPercent) / 100);
        final = toCurrency(original - discount);
      }
    }
  } catch (_) {
    // si falla catálogo, aplicar reglas clásicas
    if (serviceType === 'cambio-notas') {
      original = toCurrency(fixedCambioNotas);
      discount = 0;
      final = original;
    } else {
      discount = toCurrency((original * discountPercent) / 100);
      final = toCurrency(original - discount);
    }
  }

  // Operar en transacción para evitar condiciones de carrera con el saldo
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloqueo de fila de usuario mientras se verifica y descuenta
    const ur = await client.query('SELECT id, balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const user = ur.rows[0];
    if (!user) throw new Error('Usuario no encontrado');
    if (Number(user.balance) < Number(final)) {
      throw new Error('Saldo insuficiente. Debe recargar para generar la orden');
    }

    const res = await client.query(
      `INSERT INTO orders(user_id, service_type, original_price, discount, final_price, status, meta)
       VALUES($1,$2,$3,$4,$5,'pending',$6)
       RETURNING *`,
      [userId, serviceType, original, discount, final, meta ? JSON.stringify(meta) : null]
    );
    const order = res.rows[0];

    // Descuento de saldo y registro de transacción (débito)
    const newBalance = toCurrency(Number(user.balance) - Number(final));
    await client.query('UPDATE users SET balance=$1 WHERE id=$2', [newBalance, userId]);
    await client.query(
      `INSERT INTO transactions(user_id, amount, type, source, reference)
       VALUES($1,$2,'debit','order',$3)`,
      [userId, final, serviceType]
    );

    await client.query('COMMIT');
    // Notificar fuera de la transacción
    await notifyAdminNewOrder(order);
    return order;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

export async function notifyAdminNewOrder(order) {
  if (!ORDERS_TELEGRAM_BOT_TOKEN || !ORDERS_TELEGRAM_CHAT_ID) {
    console.warn('Order notify disabled: missing ORDERS_TELEGRAM_BOT_TOKEN or ORDERS_TELEGRAM_CHAT_ID');
    return;
  }
  try {
    // Obtener datos del usuario para enriquecer el mensaje
    const userRes = await query('SELECT name, email, phone, token_saldo FROM users WHERE id=$1', [order.user_id]);
    const user = userRes.rows[0] || {};

    // Meta puede venir como objeto JSON o string; normalizamos
    let meta = {};
    try {
      meta = typeof order.meta === 'string' ? JSON.parse(order.meta) : (order.meta || {});
    } catch (_) {
      meta = {};
    }

    // Construir detalles completos y sección de contraseñas explícita
    const sensitiveKeys = ['contraseña', 'contraseña_campus', 'contraseña_app', 'password'];
    const allDetailLines = Object.entries(meta)
      .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const sensitiveLines = Object.entries(meta)
      .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .filter(([k]) => sensitiveKeys.some(s => k.toLowerCase().includes(s)))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    // Teléfono: intentamos extraer de meta si existe (p. ej., "telefono" en cambio-notas o "numero" en pago-movil)
    const telefono = user.phone || meta.telefono || meta.numero || 'no registrado';

    const text = [
      `Nueva orden`,
      `Orden ID: ${order.id}`,
      `Usuario: ${user.name || 'N/A'}`,
      `Email: ${user.email || 'N/A'}`,
      `Token: ${user.token_saldo || 'N/A'}`,
      `Teléfono: ${telefono}`,
      `Servicio: ${order.service_type}`,
      `Precio: S/ ${order.final_price}`,
      `Estado: ${order.status}`,
      `Detalles:`,
      allDetailLines || 'Sin detalles',
      sensitiveLines ? '\nContraseñas:\n' + sensitiveLines : ''
    ].join('\n');

    const resp = await axios.post(`https://api.telegram.org/bot${ORDERS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: ORDERS_TELEGRAM_CHAT_ID,
      text
    });
    if (resp.status !== 200 || !resp.data?.ok) {
      console.error('Failed to send Telegram order notify:', resp.data);
    }
  } catch (e) {
    console.error('Error sending Telegram order notify:', e.message);
  }
}

export async function creditUserBalanceByToken({ tokenSaldo, amount, source = 'bot', reference }) {
  const amt = toCurrency(amount);
  const userRes = await query(`SELECT * FROM users WHERE token_saldo=$1`, [tokenSaldo]);
  const user = userRes.rows[0];
  if (!user) throw new Error('Usuario no encontrado');
  const newBalance = toCurrency(Number(user.balance) + amt);
  await query(`UPDATE users SET balance=$1 WHERE id=$2`, [newBalance, user.id]);
  await query(
    `INSERT INTO transactions(user_id, amount, type, source, reference)
     VALUES($1,$2,'credit',$3,$4)`,
    [user.id, amt, source, reference || 'recarga']
  );
  return { userId: user.id, balance: newBalance };
}