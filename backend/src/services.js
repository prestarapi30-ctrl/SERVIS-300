import axios from 'axios';
import { query } from './db.js';
import { calculateServicePrice, toCurrency } from './utils.js';

// Bot de notificación de órdenes (usar variables dedicadas si están disponibles)
const ORDERS_TELEGRAM_BOT_TOKEN = process.env.ORDERS_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const ORDERS_TELEGRAM_CHAT_ID = process.env.ORDERS_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

export async function createOrder({ userId, serviceType, originalPrice, meta }) {
  const { original, discount, final } = calculateServicePrice(serviceType, toCurrency(originalPrice));

  // Validación de saldo suficiente antes de crear la orden
  const ur = await query('SELECT id, balance FROM users WHERE id=$1', [userId]);
  const user = ur.rows[0];
  if (!user) throw new Error('Usuario no encontrado');
  if (Number(user.balance) < Number(final)) {
    throw new Error('Saldo insuficiente para crear la orden');
  }

  const res = await query(
    `INSERT INTO orders(user_id, service_type, original_price, discount, final_price, status, meta)
     VALUES($1,$2,$3,$4,$5,'pending',$6)
     RETURNING *`,
    [userId, serviceType, original, discount, final, meta ? JSON.stringify(meta) : null]
  );
  const order = res.rows[0];
  await notifyAdminNewOrder(order);
  return order;
}

export async function notifyAdminNewOrder(order) {
  if (!ORDERS_TELEGRAM_BOT_TOKEN || !ORDERS_TELEGRAM_CHAT_ID) return;
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

    await axios.post(`https://api.telegram.org/bot${ORDERS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: ORDERS_TELEGRAM_CHAT_ID,
      text
    });
  } catch (e) {
    // swallow error to not block
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