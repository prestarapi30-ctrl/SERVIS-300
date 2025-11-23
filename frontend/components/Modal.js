export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="title gradient" style={{ marginBottom: 12 }}>{title}</div>
        <div style={{ marginBottom: 16 }}>{children}</div>
        <div className="cta-group" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}