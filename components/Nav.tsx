import Link from 'next/link'

export default function Nav() {
  return (
    <header className="bg-graphite text-white">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <Link href="/" className="font-heading text-2xl">ALF</Link>
        <nav className="flex gap-6 font-body">
          <Link href="/fleet">Парк</Link>
          <Link href="/drivers">Водителям</Link>
          <Link href="/club">Club</Link>
          <Link href="/contact">Контакты</Link>
        </nav>
      </div>
    </header>
  )
}
