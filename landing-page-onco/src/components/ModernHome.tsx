import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Activity, Shield, HeartPulse, ClipboardCheck, Users2 } from "lucide-react";

export function ModernHome() {
  return (
    <div className="bg-white">
      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="mx-auto max-w-5xl text-6xl font-black tracking-tight text-slate-900 md:text-8xl">
              Seu Acompanhamento Oncológico Completo
            </h1>
            <div className="mt-8 flex flex-col items-center justify-center gap-6">
              <p className="max-w-2xl text-lg font-medium text-slate-500">
                O Aura Onco é o prontuário digital feito para pacientes e médicos. 
                Monitore seus sintomas, gerencie sua medicação e compartilhe sua jornada com sua equipe multidisciplinar.
              </p>
              
              {/* App Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button className="flex h-14 items-center gap-3 rounded-2xl bg-black px-6 text-white transition hover:bg-slate-900 active:scale-95">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Apple_logo_black.svg" alt="Apple" className="h-6 w-6 invert" />
                  <div className="text-left">
                    <p className="text-[10px] font-medium leading-none opacity-60">Download on the</p>
                    <p className="text-lg font-bold leading-none">App Store</p>
                  </div>
                </button>
                <button className="flex h-14 items-center gap-3 rounded-2xl bg-black px-6 text-white transition hover:bg-slate-900 active:scale-95">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-6 w-6" />
                  <div className="text-left">
                    <p className="text-[10px] font-medium leading-none opacity-60">GET IT ON</p>
                    <p className="text-lg font-bold leading-none">Google Play</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>

          {/* iPhone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative mx-auto mt-20 max-w-[800px]"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[40px] bg-slate-100 shadow-2xl">
              <img 
                src="/assets/hero_iphone.png" 
                alt="Prontuário Aura Onco" 
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- SECTION 2: SIMPLES E EFICAZ --- */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-6 text-5xl font-black text-slate-900 md:text-6xl">
                Cuidado na Palma <br /> da sua Mão
              </h2>
              <p className="mb-8 max-w-md text-lg text-slate-500">
                Acompanhe cada etapa do seu tratamento de forma intuitiva. 
                Nossa plataforma conecta você diretamente aos seus médicos, garantindo que nenhuma informação seja perdida.
              </p>
              
              {/* Feature Card */}
              <div className="relative max-w-sm overflow-hidden rounded-[32px] border border-white bg-white/50 p-6 shadow-xl backdrop-blur-md">
                <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                  <img src="/assets/doctor_feature.png" alt="Especialista" className="h-full w-full object-cover" />
                </div>
                <h3 className="mb-2 text-xl font-black text-slate-900">Suporte especializado para sua jornada!</h3>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1">
                     <div className="h-1 w-4 rounded-full bg-slate-900" />
                     <div className="h-1 w-1 rounded-full bg-slate-200" />
                     <div className="h-1 w-1 rounded-full bg-slate-200" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side teaser */}
            <div className="flex flex-col gap-6">
              <div className="rounded-[40px] bg-blue-600 p-8 text-white shadow-xl shadow-blue-200">
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                   <ClipboardCheck className="h-6 w-6" />
                </div>
                <h3 className="mb-4 text-2xl font-bold">Registro de Sintomas</h3>
                <p className="text-blue-100 opacity-80">
                  Registre dores, efeitos colaterais e bem-estar diário para que sua equipe médica ajuste seu tratamento com precisão.
                </p>
              </div>
              
              <div className="rounded-[40px] bg-slate-900 p-8 text-white shadow-xl">
                 <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                   <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="mb-4 text-2xl font-bold">Segurança e Privacidade</h3>
                <p className="text-slate-400">
                  Seus dados médicos são confidenciais e protegidos por criptografia de ponta a ponta e total conformidade com a LGPD.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: COLABORAÇÃO --- */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-[60px] bg-slate-900">
            <img 
              src="/assets/doctors_collab.png" 
              alt="Colaboração médica" 
              className="h-[600px] w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
              <div className="max-w-2xl">
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-400">Aura Onco</p>
                <h2 className="mb-6 text-4xl font-black md:text-5xl">
                  Sua equipe multidisciplinar sempre em sincronia com o seu prontuário digital.
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 4: GRID SNIPPETS --- */}
      <section className="pb-32 pt-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Dossier Snippet */}
            <div className="col-span-1 rounded-[40px] bg-slate-50 p-8 lg:col-span-1">
              <div className="mb-8 flex items-center gap-2">
                 <Users2 className="h-6 w-6 text-blue-600" />
                 <span className="text-sm font-bold">Equipe Médica</span>
              </div>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                 <img src="/assets/chat_snippet.png" alt="Mensagens" className="h-full w-full object-contain" />
              </div>
              <p className="mt-6 text-sm font-medium text-slate-500">
                Compartilhe seu dossiê clínico com oncologistas, nutricionistas e psicólogos de forma segura.
              </p>
            </div>

            {/* Monitoring Snippet */}
            <div className="col-span-1 rounded-[40px] bg-slate-50 p-8 lg:col-span-2">
              <div className="flex h-full flex-col justify-between">
                <div className="max-w-sm">
                  <h3 className="mb-4 text-2xl font-black text-slate-900">Gestão de medicação e sinais vitais.</h3>
                  <p className="text-sm text-slate-500">
                    Nunca perca uma dose e acompanhe sua evolução clínica com gráficos detalhados e alertas automáticos.
                  </p>
                </div>
                <div className="mt-8 flex gap-4 overflow-hidden rounded-3xl bg-slate-200/50 p-4">
                   <div className="flex h-40 w-full flex-col justify-center rounded-2xl bg-white p-6 shadow-sm">
                      <HeartPulse className="mb-2 h-8 w-8 text-rose-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase">Sinais Vitais</span>
                      <span className="text-2xl font-black text-slate-900">Monitorado</span>
                   </div>
                   <div className="flex h-40 w-48 shrink-0 flex-col justify-center rounded-2xl bg-blue-600 p-6 text-white shadow-sm">
                      <Activity className="mb-2 h-8 w-8 text-white" />
                      <span className="text-xs font-bold text-blue-200 uppercase">Ciclo Atual</span>
                      <span className="text-2xl font-black">Em andamento</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
