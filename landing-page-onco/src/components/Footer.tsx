import { Link } from 'react-router-dom'
import { Instagram, Linkedin, Youtube, Mail, Phone } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()
  
  return (
    <footer className="bg-white px-6 pb-12 pt-24" role="contentinfo">
      <div className="mx-auto max-w-7xl">
        {/* CTA Section */}
        <div className="mb-24 flex flex-col items-center justify-between gap-8 rounded-[40px] border border-slate-100 bg-slate-50/50 p-12 md:flex-row">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="mb-4 text-3xl font-black text-slate-900">
              Pronto para retomar o controle da sua saúde? Junte-se à Aura Onco hoje!
            </h2>
            <p className="text-slate-500">
              Comece sua jornada para um cuidado melhor. Cadastre-se agora para vivenciar o futuro do acompanhamento oncológico.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 md:items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Phone className="h-4 w-4" />
              +55 (11) 99999-9999
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Mail className="h-4 w-4" />
              contato@auraonco.com.br
            </div>
            <div className="mt-2 flex h-12 w-48 items-center justify-between rounded-full bg-blue-600 p-1 pr-4 shadow-lg shadow-blue-200 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                <div className="h-4 w-4 rounded-full border-2 border-blue-600" />
              </div>
              <span className="text-sm font-bold text-white uppercase">Começar</span>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="flex flex-col items-center justify-between gap-8 border-t border-slate-100 pt-12 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white font-black text-sm">
              A
            </div>
            <span className="font-bold text-slate-900">Aura Onco</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-8">
            <Link to="/privacidade" className="text-xs font-medium text-slate-500 hover:text-slate-900">Política de Privacidade</Link>
            <Link to="/termos" className="text-xs font-medium text-slate-500 hover:text-slate-900">Termos e Condições</Link>
            <Link to="/lgpd" className="text-xs font-medium text-slate-500 hover:text-slate-900">Política de Cookies</Link>
          </nav>

          <div className="flex items-center gap-4">
            <a href="#" className="text-slate-400 hover:text-slate-900"><Linkedin className="h-4 w-4" /></a>
            <a href="#" className="text-slate-400 hover:text-slate-900"><Instagram className="h-4 w-4" /></a>
            <a href="#" className="text-slate-400 hover:text-slate-900"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>

        <div className="mt-8 text-center text-[0.7rem] font-medium text-slate-400">
          © {year} AURA ONCO. Todos os direitos reservados. | Criado com tecnologia de ponta pela equipe Aura.
        </div>
      </div>
    </footer>
  )
}
