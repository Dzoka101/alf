import { ReactNode } from 'react'
import Nav from './Nav'
import Footer from './Footer'
import Head from 'next/head'

type Props = {
  children: ReactNode
  title?: string
  description?: string
}

export default function Layout({
  children,
  title = 'ALF – Управляй престижом',
  description = 'Премиальный таксопарк и аренда бизнес‑класса',
}: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  )
}
