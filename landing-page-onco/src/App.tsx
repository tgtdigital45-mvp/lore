import { Route, Routes } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { HospitalsPage } from './pages/HospitalsPage'
import { CaregiversPage } from './pages/CaregiversPage'
import { CareersPage } from './pages/CareersPage'
import { ContactPage } from './pages/ContactPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { LgpdPage } from './pages/LgpdPage'
import { AccountDeletionPage } from './pages/AccountDeletionPage'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/funcionalidades" element={<FeaturesPage />} />
        <Route path="/hospitais" element={<HospitalsPage />} />
        <Route path="/cuidadores" element={<CaregiversPage />} />
        <Route path="/carreiras" element={<CareersPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/exclusao-conta" element={<AccountDeletionPage />} />
        <Route path="/lgpd" element={<LgpdPage />} />
      </Route>
    </Routes>
  )
}

export default App
