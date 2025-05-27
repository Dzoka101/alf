import Layout from '../components/Layout'
import Link from 'next/link'

export default function Home() {
  return (
    <Layout>
      <section className="bg-graphite text-white flex flex-col items-center py-32">
        <h1 className="text-5xl md:text-6xl font-heading mb-6 text-teal">Elevate your ride</h1>
        <p className="text-xl mb-10 max-w-xl text-center opacity-80 px-4">
          Аренда автомобилей бизнес‑ и премиум‑класса. Присоединяйтесь к лучшему таксопарку Москвы.
        </p>
        <div className="flex gap-6">
          <Link
            href="/drivers"
            className="bg-teal hover:bg-teal/90 px-8 py-4 rounded-md text-graphite font-semibold transition"
          >
            Стать водителем
          </Link>
          <Link
            href="/fleet"
            className="border border-teal px-8 py-4 rounded-md text-teal font-semibold transition hover:bg-teal/10"
          >
            Посмотреть парк
          </Link>
        </div>
      </section>
    </Layout>
  )
}
