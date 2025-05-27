import Image from 'next/image'

type Props = {
  car: {
    id: string
    model: string
    class: string
    image: string
  }
}

export default function CarCard({ car }: Props) {
  return (
    <div className="border border-silver/30 rounded-lg p-4 shadow-sm">
      <Image
        src={car.image}
        alt={car.model}
        width={400}
        height={240}
        className="rounded-md"
      />
      <h3 className="font-heading text-xl mt-4">{car.model}</h3>
      <p className="text-silver uppercase">{car.class}</p>
    </div>
  )
}
