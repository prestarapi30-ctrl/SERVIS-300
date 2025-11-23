import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function VuelosBus() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="vuelos-bus" title="Vuelos / Bus" />
      </div>
    </Layout>
  );
}