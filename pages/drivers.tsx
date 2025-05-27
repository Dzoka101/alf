import Layout from '../components/Layout'

export default function Drivers() {
  return (
    <Layout title="Водителям – ALF">
      <section className="container mx-auto px-6 py-20">
        <h1 className="font-heading text-4xl mb-6 text-graphite">Станьте частью ALF</h1>
        <p className="mb-8 max-w-2xl">
          Мы предлагаем автомобили бизнес‑ и премиум‑класса в аренду на выгодных условиях.
          Заполните форму и получите предложение в течение 1 часа.
        </p>
        <form
          action="https://formspree.io/f/your-code"
          method="POST"
          className="grid gap-6 max-w-lg"
        >
          <input
            type="text"
            name="name"
            placeholder="Ваше имя"
            className="border p-3 rounded-md"
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Телефон"
            className="border p-3 rounded-md"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="border p-3 rounded-md"
          />
          <button
            type="submit"
            className="bg-teal hover:bg-teal/90 px-6 py-3 rounded-md text-graphite font-semibold"
          >
            Отправить заявку
          </button>
        </form>
      </section>
    </Layout>
  )
}
