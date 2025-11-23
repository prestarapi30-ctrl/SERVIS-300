import { useEffect, useState } from 'react';

const items = [
  { name: 'Andrés', text: 'Me ayudaron rápido y con buen soporte. Recomendado.' },
  { name: 'María', text: 'El descuento se aplica solo, precio final claro. 👍' },
  { name: 'Luisa', text: 'Interfaz moderna y fácil de usar. Volvería a pedir.' },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="panel section">
      <div className="title" style={{ marginBottom: 12 }}>Reseñas de usuarios</div>
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="rating">
          <span className="stars">★★★★★</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{items[index].name}</div>
          <div className="muted" style={{ marginTop: 6 }}>{items[index].text}</div>
        </div>
      </div>
    </div>
  );
}