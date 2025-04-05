import { ChatApp } from './components/ChatApp'
import { motion } from 'framer-motion'
import BetaNotification from './components/BetaNotification'
import { LanguageProvider } from './contexts/LanguageContext'
import { UnifiedContextProvider } from './contexts/UnifiedContextProvider'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import CustomCursor from './components/CustomCursor'
import HowToUse from './components/HowToUse'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ComparisonTableDemo from './components/ComparisonTableDemo'

function App() {
  return (
    <LanguageProvider>
      <UnifiedContextProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white">
            <CustomCursor />
            <BetaNotification />
            <main className="flex-1 relative">
              <Routes>
                <Route path="/" element={<ChatApp />} />
                <Route path="/how-to-use" element={<HowToUse />} />
                <Route path="/comparison-demo" element={<ComparisonTableDemo />} />
              </Routes>
            </main>
            <LanguageSwitcher />
          </div>
        </Router>
      </UnifiedContextProvider>
    </LanguageProvider>
  )
}

export default App
