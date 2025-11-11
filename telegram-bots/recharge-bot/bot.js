import dotenv from 'dotenv';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();

const TOKEN = process.env.RECHARGE_TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL;
const BOT_API_KEY = process.env.BOT_API_KEY;

if (!TOKEN) throw new Error('Falta RECHARGE_TELEGRAM_BOT_TOKEN');
const bot = new TelegramBot(TOKEN, { polling: true });

// En memoria: información de la sesión por usuario
const sessions = new Map(); // key: chatId, value: { method, amount, token, status }

function requestPaymentFromAdmin(chatId) {
  const s = sessions.get(chatId);
  if (!s) return;
  bot.sendMessage(chatId, 'Perfecto. Estoy solicitando el medio de pago al soporte y te lo enviaré aquí.');
  notifyAdminNewRecharge({ userChatId: chatId, method: s.method, amount: s.amount, token: s.token, requestMedium: true });
}

function notifyAdminNewRecharge({ userChatId, method, amount, token, requestMedium = false }) {
  if (!ADMIN_CHAT) return;
  const text = [
    'Nueva solicitud de recarga',
    `Usuario chat: ${userChatId}`,
    `Token: ${token}`,
    `Monto: S/ ${amount}`,
    `Método: ${method}`,
    'Para confirmar: /recargar <token> <monto>',
    requestMedium ? 'Responde a este mensaje con el QR o número para este usuario.' : ''
  ].join('\n');
  return bot.sendMessage(ADMIN_CHAT, text);
}

// Profundidad de enlace: /start INTENT_<uuid>
bot.onText(/\/start(?:\s+(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const payload = (match && match[1]) ? match[1].trim() : '';
  const intentMatch = /^INTENT_(\S+)$/i.exec(payload || '');
  if (!intentMatch) {
    bot.sendMessage(chatId, 'Para iniciar una recarga debes ir al Panel y elegir "Recargar saldo". Allí se genera el enlace seguro.');
    return;
  }
  const intentId = intentMatch[1];
  if (!BACKEND_URL || !BOT_API_KEY) {
    bot.sendMessage(chatId, 'Backend no configurado para verificar intents.');
    return;
  }
  try {
    const r = await axios.post(`${BACKEND_URL}/api/bot/intent/verify`, {
      api_key: BOT_API_KEY,
      intent_id: intentId
    });
    const { method, amount, token_saldo } = r.data;
    sessions.set(chatId, { method, amount, token: token_saldo, status: 'awaiting_user_confirm' });
    await bot.sendMessage(chatId, `Hola, hemos detectado tu solicitud de recarga por ${method}, monto S/ ${amount}. ¿Es correcto?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Sí', callback_data: 'CONFIRM_YES' }],
          [{ text: 'No', callback_data: 'CONFIRM_NO' }]
        ]
      }
    });
    await notifyAdminNewRecharge({ userChatId: chatId, method, amount, token: token_saldo });
  } catch (e) {
    bot.sendMessage(chatId, `No se pudo verificar la solicitud. Debes iniciar desde el Panel. (${e.response?.data?.error || e.message})`);
  }
});

bot.on('callback_query', async (q) => {
  const chatId = q.message.chat.id;
  const s = sessions.get(chatId);
  if (!s) return bot.answerCallbackQuery(q.id);
  if (q.data === 'CONFIRM_YES') {
    bot.answerCallbackQuery(q.id, { text: 'Confirmado' });
    sessions.set(chatId, { ...s, status: 'awaiting_payment_medium' });
    requestPaymentFromAdmin(chatId);
  } else if (q.data === 'CONFIRM_NO') {
    bot.answerCallbackQuery(q.id, { text: 'Ok, cancelo.' });
    sessions.delete(chatId);
    bot.sendMessage(chatId, 'Solicitud cancelada. Puedes iniciar de nuevo con /start.');
  }
});

// Admin responde con medio de pago (texto o foto) respondiendo al mensaje del bot
bot.on('message', async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT)) return;
  const reply = msg.reply_to_message;
  if (!reply || !reply.text) return; // necesitamos que sea respuesta al mensaje con token/usuario
  const chatMatch = /Usuario chat:\s*(\d+)/.exec(reply.text);
  const tokenMatch = /Token:\s*(\S+)/.exec(reply.text);
  if (!chatMatch || !tokenMatch) return;
  const userChatId = Number(chatMatch[1]);
  const token = tokenMatch[1];
  const s = sessions.get(userChatId);
  if (!s || s.token !== token) return;
  // Reenviar medio de pago al usuario
  if (msg.photo && msg.photo.length) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    await bot.sendPhoto(userChatId, fileId, { caption: 'Medio de pago enviado por soporte. Adjunta tu comprobante cuando realices el pago.' });
  } else if (msg.text) {
    await bot.sendMessage(userChatId, `Medio de pago: ${msg.text}\nAdjunta tu comprobante cuando realices el pago.`);
  }
  sessions.set(userChatId, { ...s, status: 'awaiting_receipt' });
});

// Captura de comprobante (foto)
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const s = sessions.get(chatId);
  if (!s || !ADMIN_CHAT) return;
  const photo = msg.photo[msg.photo.length - 1];
  const fileId = photo.file_id;
  await bot.sendMessage(ADMIN_CHAT, `Comprobante recibido de usuario ${chatId}. Token ${s.token}, monto S/ ${s.amount}, método ${s.method}.`);
  await bot.sendPhoto(ADMIN_CHAT, fileId);
  await bot.sendMessage(chatId, 'Gracias. Espera confirmación.');
});

// Comando admin: /recargar <token> <monto>
bot.onText(/\/recargar\s+(\S+)\s+(\d+(?:\.\d+)?)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(ADMIN_CHAT)) {
    return bot.sendMessage(chatId, 'Este comando es solo para admin.');
  }
  const token = match[1];
  const amount = Number(match[2]);
  if (!BACKEND_URL || !BOT_API_KEY) {
    return bot.sendMessage(chatId, 'BACKEND_URL/BOT_API_KEY no configurados.');
  }
  try {
    const r = await axios.post(`${BACKEND_URL}/api/bot/recarga`, {
      api_key: BOT_API_KEY,
      user_token: token,
      monto: amount
    });
    bot.sendMessage(chatId, `Recarga aplicada. Nuevo saldo: S/ ${r.data.balance}`);
    // Aviso al usuario si está en sesiones
    const userEntry = [...sessions.entries()].find(([, v]) => v.token === token);
    if (userEntry) {
      const userChatId = userEntry[0];
      bot.sendMessage(userChatId, 'Recarga exitosa y confirmada. Saldo añadido.');
    }
  } catch (e) {
    bot.sendMessage(chatId, `Error al recargar: ${e.response?.data?.error || e.message}`);
  }
});

console.log('Recharge bot iniciado.');