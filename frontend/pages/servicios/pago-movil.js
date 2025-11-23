import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function PagoMovil() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="pago-movil" title="Pago Móvil" />
      </div>
    </Layout>
  );
}