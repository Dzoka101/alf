import Layout from '../components/Layout'
import fleet from '../data/fleet.json'
import CarCard from '../components/CarCard'

export default function FleetPage() {
  return (
    <Layout title="Парк авто – ALF">
      <section className="container mx-auto px-6 py-20">
        <h1 className="font-heading text-4xl mb-10 text-graphite">Парк автомобилей</h1>
        <div className="grid md:grid-cols-3 gap-10">
          {fleet.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </section>
    </Layout>
  )
}
