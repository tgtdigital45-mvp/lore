import { Hero } from '../components/Hero'
import { ProblemSection } from '../components/ProblemSection'
import { FeaturesSection } from '../components/FeaturesSection'
import { HowItWorks } from '../components/HowItWorks'
import { SecuritySection } from '../components/SecuritySection'
import { B2BTeaser } from '../components/B2BTeaser'
import { Testimonials } from '../components/Testimonials'
import { Accessibility } from '../components/Accessibility'
import { Pricing } from '../components/Pricing'
import { FAQ } from '../components/FAQ'
import { FinalCTA } from '../components/FinalCTA'

export function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <SecuritySection />
      <B2BTeaser />
      <Testimonials />
      <Accessibility />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  )
}
