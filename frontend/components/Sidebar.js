export default function Sidebar() {
  const Item = ({ href, children }) => (
    <a className="item" href={href}>
      {children}
    </a>
  );
  const Icon = ({ name }) => {
    const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, style: { opacity: 0.9 } };
    switch (name) {
      case 'dash': return (
        <svg {...props}><path d="M3 4h8v8H3V4Zm10 0h8v5h-8V4Zm0 7h8v9h-8v-9Zm-10 5h8v4H3v-4Z"/></svg>
      );
      case 'user': return (
        <svg {...props}><circle cx="12" cy="8" r="3.5"/><path d="M4 20c0-4.2 3.8-6 8-6s8 1.8 8 6"/></svg>
      );
      default: return null;
    }
  };
  return (
    <aside className="panel sidebar">
      <div className="title" style={{ marginBottom: 10 }}>Panel</div>
      <div className="muted" style={{ margin: '6px 0 8px' }}>Principal</div>
      <Item href="/dashboard"><Icon name="dash" /> Dashboard</Item>
      <Item href="/perfil"><Icon name="user" /> Perfil</Item>
      <div className="muted" style={{ margin: '12px 0 8px' }}>Administración</div>
      <Item href="/referencias/admin">Referencias (Admin)</Item>
      <Item href="/admin/servicios">Servicios (Admin)</Item>
    </aside>
  );
}