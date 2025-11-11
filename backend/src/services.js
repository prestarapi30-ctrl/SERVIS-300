import axios from 'axios';
import { query, pool } from './db.js';
import { calculateServicePrice, toCurrency } from './utils.js';

// Bot de notificación de órdenes (usar variables dedicadas si están disponibles)
const ORDERS_TELEGRAM_BOT_TOKEN = process.env.ORDERS_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const ORDERS_TELEGRAM_CHAT_ID = process.env.ORDERS_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

export async function createOrder({ userId, serviceType, originalPrice, meta }) {
  const { original, discount, final } = calculateServicePrice(serviceType, toCurrency(originalPrice));

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

    // Evitar exponer contraseñas u otros secretos en el mensaje
    const sensitiveKeys = ['contraseña', 'contraseña_campus', 'contraseña_app', 'password'];
    const metaLines = Object.entries(meta)
      .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .filter(([k]) => !sensitiveKeys.some(s => k.toLowerCase().includes(s)))
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
      metaLines || 'Sin detalles'
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