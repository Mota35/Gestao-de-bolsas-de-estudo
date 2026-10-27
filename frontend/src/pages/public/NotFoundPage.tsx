import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="bg-page px-6 pb-[88px] pt-[85px] text-center max-sm:pt-14">
      <span className="mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-full border border-green text-green" aria-hidden>
        <Compass size={28} strokeWidth={1.5} />
      </span>
      <p className="mt-[34px] text-[104px] font-bold leading-[104px] tracking-tight text-green max-sm:text-[80px] max-sm:leading-[80px]" aria-hidden>
        404
      </p>
      <h1 className="display mt-[38px] text-[36px] leading-10 max-sm:text-[28px]">Este caminho não foi encontrado.</h1>
      <p className="lead mx-auto mt-[22px] max-w-[740px] text-[17px] leading-6">
        A página pode ter mudado ou o endereço pode estar incompleto. Há outras oportunidades à tua espera.
      </p>
      <div className="mt-[28px] flex flex-wrap justify-center gap-4">
        <Link to="/" className="btn btn-primary">
          Voltar ao início
        </Link>
        <Link to="/bolsas" className="btn">
          Procurar bolsas
        </Link>
      </div>
      <p className="small mt-[26px] text-[13px]">
        Se o problema continuar, consulta{' '}
        <Link to="/contactos" className="underline-offset-2 hover:underline">
          Contactos e suporte
        </Link>
        .
      </p>
    </div>
  )
}
