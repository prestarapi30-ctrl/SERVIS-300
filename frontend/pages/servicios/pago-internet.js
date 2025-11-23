import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function PagoInternet() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="pago-internet" title="Pago Internet" />
      </div>
    </Layout>
  );
}