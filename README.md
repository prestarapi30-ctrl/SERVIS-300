# SERVIS-30

Proyecto fullstack con arquitectura moderna tipo dashboard/panel, listo para desplegar en Render y subir a GitHub. Incluye:

- Backend: Node.js + Express + PostgreSQL (Render Managed DB)
- Frontend: Next.js 14 (modo pages)
- Bot de Telegram para notificación y recarga de saldo

## Estructura

```
SERVIS-30/
  backend/
    server.js
    package.json
    .env.example
    sql_init.sql
    src/
      services.js
      auth.js
      db.js
      utils.js
  frontend/
    package.json
    next.config.js
    .env.example
    pages/
      _app.js
      index.js
      login.js
      register.js
      dashboard.js
      admin/
        index.js
        login.js
      servicios/
        taxi.js
        vuelos-bus.js
        pago-universidad.js
        cambio-notas.js
        pago-luz.js
        pago-internet.js
        pago-movil.js
    components/
      Layout.js
      Navbar.js
      Sidebar.js
      Card.js
      Modal.js
      ServiceForm.js
    styles/
      global.css
    public/
      logo.svg
  telegram-bot/
    bot.js
    package.json
    .env.example
```

## Variables de entorno

### Backend — `.env`

```
DATABASE_URL=postgresql://servis30db_user:nMU4NdRf3xKeVrsnnWz5gNAcFX37qF9b@dpg-d456dg49c44c7382afr0-a.oregon-postgres.render.com/servis30db
JWT_SECRET=SJDSDNCXOW390230S
BOT_API_KEY=SERVIS2HDSDASDW2J
TELEGRAM_BOT_TOKEN=8560466193:AAGIYA99tuJwqgHbkMGxaO0G8tYiHpG0d2c
TELEGRAM_CHAT_ID=7389150688
CORS_ORIGIN=`https://tumanzanita.store`
```

### Frontend — `.env`

```
NEXT_PUBLIC_API_URL=`https://servis-30-backend.onrender.com`
NEXT_PUBLIC_SITE_URL=`https://tumanzanita.store`
```

### Telegram Bot — `.env`

```
BOT_API_KEY=SERVIS2HDSDASDW2J
BACKEND_URL=`https://servis-30-backend.onrender.com`
TELEGRAM_BOT_TOKEN=8560466193:AAGIYA99tuJwqgHbkMGxaO0G8tYiHpG0d2c
```

## Base de datos

Usa `backend/sql_init.sql` para crear todas las tablas y triggers:

- `users`
- `orders`
- `transactions`
- `admin_users`
- `logs`

### Inicialización en Render

1. Crea una Base de Datos PostgreSQL en Render (Managed DB).
2. Entra al panel de la DB y abre el apartado de “Data” o “SQL shell”.
3. Copia y ejecuta el contenido de `backend/sql_init.sql`.

## Backend (Render Web Service)

- Build command: `npm install`
- Start command: `node server.js`
- Root: `backend/`
- Env vars: las descritas arriba.

## Frontend (Render Static Site o Web Service)

- Si usas Static Site:
  - Build command: `npm install && npm run build`
  - Publish directory: `.next`
  - Root: `frontend/`
- Si usas Web Service (SSR):
  - Build command: `npm install && npm run build`
  - Start command: `npm run start`
  - Root: `frontend/`

## Bot (Render Worker)

- Start command: `node bot.js`
- Root: `telegram-bot/`
- Env vars: las descritas arriba.

## Deploy: Pasos (Render + GitHub)

1. Crear repositorio en GitHub y subir este proyecto:
   - En la raíz `SERVIS-30/`:
     - `git init`
     - `git add .`
     - `git commit -m "SERVIS-30 initial"`
     - `git branch -M main`
     - `git remote add origin <tu_repo_url>`
     - `git push -u origin main`

2. Render: Crear servicios
   - Backend: Web Service apuntando a `SERVIS-30/backend`
   - Frontend: Static Site o Web Service apuntando a `SERVIS-30/frontend`
   - DB: PostgreSQL Managed DB
   - Bot: Worker apuntando a `SERVIS-30/telegram-bot`

3. Configurar variables de entorno en cada servicio (copiar desde `.env.example`).

4. Dominio GoDaddy (`tumanzanita.store`):
   - En Render, en el servicio del frontend, añade el dominio personalizado.
   - Render te indicará los registros a añadir en GoDaddy:
     - Añadir CNAME hacia el subdominio gestionado por Render (por ejemplo `www` -> `yourapp.onrender.com`).
     - Añadir A records si Render lo solicita para raíz/apex (opcional, depende de configuración).
   - Activar SSL desde Render (se emite automáticamente con Let’s Encrypt al validar DNS).

## Conexión Frontend-Backend

- El frontend usa `process.env.NEXT_PUBLIC_API_URL` para conectarse al backend.
- Asegúrate de que CORS esté configurado con el origin correcto en el backend.

## Servicios y descuentos

- Todos los servicios aplican descuento automático del 30% excepto `cambio de notas` (precio fijo 350).
- Endpoints disponibles en `/api/services/*` y CRUD de órdenes en `/api/orders`.

## Notificaciones y recarga vía Telegram

- Bot con comandos:
  - `/start`
  - `/recargar {user_token} {monto}`
  - `/saldo {user_token}`
- El bot comunica con el backend usando `BACKEND_URL/api/bot/recarga`.

## Desarrollo local

1. Backend: `cd backend && npm install && node server.js`
2. Frontend: `cd frontend && npm install && npm run dev`
3. Bot: `cd telegram-bot && npm install && node bot.js`

> Nota: Para ambientes productivos, usa variables reales (sin backticks). Los `.env.example` incluyen backticks porque así se solicitó; el código del backend normaliza el origin eliminando comillas/backticks.