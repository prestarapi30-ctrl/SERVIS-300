import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function CambioNotas() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="cambio-notas" title="Cambio de notas" fixedPrice={350} />
      </div>
    </Layout>
  );
}