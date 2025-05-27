import Layout from '../components/Layout'

export default function Contact() {
  return (
    <Layout title="Контакты – ALF">
      <section className="container mx-auto px-6 py-20">
        <h1 className="font-heading text-4xl mb-6 text-graphite">Контакты</h1>
        <p>Москва, квартал 100 «ЖК Мякинино Парк»</p>
        <p>+7 495 123‑45‑67</p>
        <p className="opacity-70">info@alf.com</p>
      </section>
    </Layout>
  )
}
