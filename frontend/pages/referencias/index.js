import Layout from '../../components/Layout';

export default function Referencias() {
  return (
    <Layout title="Referencias">
      <div className="container" style={{ marginTop: 24 }}>
        <div className="panel" style={{ padding: 16 }}>
          <div className="title" style={{ fontSize: 22, marginBottom: 8 }}>Referencias</div>
          <div className="muted" style={{ marginBottom: 16 }}>
            Aquí puedes ver evidencias y referencias de nuestros servicios.
          </div>
          <div className="cta-group" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a className="btn" href="https://t.me/servis30p" target="_blank" rel="noopener noreferrer">Ver canal de Telegram</a>
            <a className="btn secondary" href="/referencias/capturas">Ver capturas</a>
          </div>
        </div>
      </div>
    </Layout>
  );
}