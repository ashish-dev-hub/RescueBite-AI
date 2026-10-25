import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import CoordinatorDesk from './pages/CoordinatorDesk';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import ImpactPage from './pages/ImpactPage';
import AuthModal from './pages/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import { Sprout, Heart, Shield, GitCommit } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Guard navigation to protected services
  const handleNavigate = (tabId) => {
    const protectedTabs = ['coordinator', 'donor', 'ngo'];
    if (protectedTabs.includes(tabId) && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  const handleSelectRole = (roleKey) => {
    handleNavigate(roleKey);
  };

  const handleAuthSuccess = (loggedUser) => {
    if (loggedUser?.role === 'coordinator') {
      setActiveTab('coordinator');
    } else if (loggedUser?.role === 'donor') {
      setActiveTab('donor');
    } else if (loggedUser?.role === 'ngo') {
      setActiveTab('ngo');
    }
  };

  return (
    <div className="app-container">
      {/* Slim Forest-Green Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Page Area */}
      <main className="main-content">
        {activeTab === 'landing' && (
          <LandingPage
            onSelectRole={handleSelectRole}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'coordinator' && (
          <ProtectedRoute
            requiredRole="coordinator"
            portalName="Operations Allocation Desk"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigate={handleNavigate}
          >
            <CoordinatorDesk />
          </ProtectedRoute>
        )}

        {activeTab === 'donor' && (
          <ProtectedRoute
            requiredRole="donor"
            portalName="Donor Operations Portal"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigate={handleNavigate}
          >
            <DonorDashboard />
          </ProtectedRoute>
        )}

        {activeTab === 'ngo' && (
          <ProtectedRoute
            requiredRole="ngo"
            portalName="Recipient NGO Portal"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigate={handleNavigate}
          >
            <NgoDashboard />
          </ProtectedRoute>
        )}

        {activeTab === 'impact' && <ImpactPage />}
      </main>

      {/* Clean Professional Footer */}
      <footer style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--color-soft-border)',
        padding: '2.5rem 1.5rem 2rem 1.5rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '2rem',
        }}>
          <div style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sprout size={22} color="var(--color-network-green)" />
              <span style={{ fontWeight: 800, color: 'var(--color-deep-forest)', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                RescueBite AI
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-slate)', marginTop: '0.5rem', lineHeight: 1.6 }}>
              An intelligent, explainable food redistribution ecosystem connecting commercial food donors with community kitchens and NGOs to eliminate food waste and fight hunger.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-deep-forest)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Portals
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                <a href="#coordinator" onClick={(e) => { e.preventDefault(); handleNavigate('coordinator'); }} style={{ color: 'var(--color-muted-slate)' }}>Allocation Desk</a>
                <a href="#donor" onClick={(e) => { e.preventDefault(); handleNavigate('donor'); }} style={{ color: 'var(--color-muted-slate)' }}>Donor Portal</a>
                <a href="#ngo" onClick={(e) => { e.preventDefault(); handleNavigate('ngo'); }} style={{ color: 'var(--color-muted-slate)' }}>NGO Demands</a>
                <a href="#impact" onClick={(e) => { e.preventDefault(); handleNavigate('impact'); }} style={{ color: 'var(--color-muted-slate)' }}>Impact Analytics</a>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-deep-forest)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                Standards
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-muted-slate)' }}>
                <span>Safe Storage Compliance</span>
                <span>Cold Chain Verification</span>
                <span>Transparent Environmental Metrics</span>
                <span>Zero Waste Initiative</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '1240px',
          margin: '2rem auto 0 auto',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--color-soft-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--color-muted-slate)',
        }}>
          <span>© 2026 RescueBite AI • The Fresh Network. All rights reserved.</span>
          <span>Food rescue coordinates edible surplus with recipient safety inspection.</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
