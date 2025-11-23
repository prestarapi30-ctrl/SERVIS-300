import Layout from '../../components/Layout';
import ServiceForm from '../../components/ServiceForm';

export default function Taxi() {
  return (
    <Layout>
      <div className="section">
        <ServiceForm serviceKey="taxi" title="Taxi" />
      </div>
    </Layout>
  );
}