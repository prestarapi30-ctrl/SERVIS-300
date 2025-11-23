import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function PagoUniversidad() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="pago-universidad" title="Pago Universidad" />
      </div>
    </Layout>
  );
}