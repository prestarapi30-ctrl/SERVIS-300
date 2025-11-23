import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function PagoLuz() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="pago-luz" title="Pago Luz" />
      </div>
    </Layout>
  );
}