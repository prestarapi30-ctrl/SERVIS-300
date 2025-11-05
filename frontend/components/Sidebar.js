export default function Sidebar() {
  return (
    <aside className="panel sidebar">
      <div className="title" style={{ marginBottom: 10 }}>Panel</div>
      <a className="item" href="/">Inicio</a>
      <a className="item" href="/dashboard">Dashboard</a>
      <div className="muted" style={{ margin: '10px 0' }}>Servicios</div>
      <a className="item" href="/servicios/taxi">Taxi</a>
      <a className="item" href="/servicios/vuelos-bus">Vuelos/Bus</a>
      <a className="item" href="/servicios/pago-universidad">Pago Universidad</a>
      <a className="item" href="/servicios/cambio-notas">Cambio de notas</a>
      <a className="item" href="/servicios/pago-luz">Pago Luz</a>
      <a className="item" href="/servicios/pago-internet">Pago Internet</a>
      <a className="item" href="/servicios/pago-movil">Pago Móvil</a>
      <div className="muted" style={{ margin: '10px 0' }}>Administración</div>
      <a className="item" href="/admin">Admin</a>
    </aside>
  );
}