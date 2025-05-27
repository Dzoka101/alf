export default function Footer() {
  return (
    <footer className="bg-graphite text-silver">
      <div className="container mx-auto px-6 py-10 text-center text-sm font-body">
        © {new Date().getFullYear()} ALF – AutoLine Fleet. Все права защищены.
      </div>
    </footer>
  )
}
