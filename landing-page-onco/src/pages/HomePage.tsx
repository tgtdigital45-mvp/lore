import { Hero } from '../components/Hero'
import { ProblemSection } from '../components/ProblemSection'
import { FeaturesSection } from '../components/FeaturesSection'
import { CaregiversSection } from '../components/CaregiversSection'
import { HowItWorks } from '../components/HowItWorks'
import { B2BTeaser as HospitalSolution } from '../components/B2BTeaser'
import { SecuritySection } from '../components/SecuritySection'
import { Testimonials } from '../components/Testimonials'
import { Accessibility } from '../components/Accessibility'
import { Pricing } from '../components/Pricing'
import { FAQ } from '../components/FAQ'
import { FinalCTA } from '../components/FinalCTA'

export function HomePage() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <CaregiversSection />
      <HowItWorks />
      <HospitalSolution />
      <SecuritySection />
      <Accessibility />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </main>
  )
}
