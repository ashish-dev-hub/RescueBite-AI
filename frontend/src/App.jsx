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
import Toast from './components/Toast';
import { Sprout, Heart, Shield, GitCommit } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', title = '') => {
    setToast({ message, type, title, id: Date.now() });
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthInitialMode(typeof mode === 'string' ? mode : 'login');
    setAuthModalOpen(true);
  };

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
    showToast(
      `Welcome back, ${loggedUser?.name || 'Partner'}! Successfully signed in.`,
      'success',
      'Signed In'
    );
  };

  return (
    <div className="app-container">
      {/* Slim Forest-Green Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onToast={showToast}
      />

      {/* Main Page Area */}
      <main className="main-content">
        {activeTab === 'landing' && (
          <LandingPage
            onSelectRole={handleSelectRole}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {activeTab === 'coordinator' && (
          <ProtectedRoute
            requiredRole="coordinator"
            portalName="Operations Allocation Desk"
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
          >
            <CoordinatorDesk />
          </ProtectedRoute>
        )}

        {activeTab === 'donor' && (
          <ProtectedRoute
            requiredRole="donor"
            portalName="Donor Operations Portal"
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
          >
            <DonorDashboard />
          </ProtectedRoute>
        )}

        {activeTab === 'ngo' && (
          <ProtectedRoute
            requiredRole="ngo"
            portalName="Recipient NGO Portal"
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
          >
            <NgoDashboard />
          </ProtectedRoute>
        )}

        {activeTab === 'impact' && <ImpactPage />}
      </main>

      {/* Clean Professional Footer */}
      <footer style={{
        backgroundColor: '#FAF4EB',
        borderTop: '1px solid #E5DBC5',
        padding: '3rem 1.5rem 2rem 1.5rem',
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
          <div style={{ maxWidth: '440px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.45rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#C44824',
              display: 'block',
              marginBottom: '0.4rem',
            }}>
              RescueBite
            </span>
            <p style={{ fontSize: '0.86rem', color: '#685B52', lineHeight: 1.6, margin: 0 }}>
              An intelligent, explainable food redistribution commons connecting commercial kitchens with local shelters across India to prevent food waste and nourish communities.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.76rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Operational Portals
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.86rem' }}>
                <a href="#coordinator" onClick={(e) => { e.preventDefault(); handleNavigate('coordinator'); }} style={{ color: '#685B52' }}>Allocation Desk</a>
                <a href="#donor" onClick={(e) => { e.preventDefault(); handleNavigate('donor'); }} style={{ color: '#685B52' }}>Donor Portal</a>
                <a href="#ngo" onClick={(e) => { e.preventDefault(); handleNavigate('ngo'); }} style={{ color: '#685B52' }}>NGO Demands</a>
                <a href="#impact" onClick={(e) => { e.preventDefault(); handleNavigate('impact'); }} style={{ color: '#685B52' }}>Impact Analytics</a>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.76rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Food Safety Standards
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.86rem', color: '#685B52' }}>
                <span>Thermal Holding Compliance</span>
                <span>Storage Protocol Verification</span>
                <span>Transparent Environmental Ledger</span>
                <span>Human-Approved Dispatches</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: '1240px',
          margin: '2rem auto 0 auto',
          paddingTop: '1.25rem',
          borderTop: '1px solid #E5DBC5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.78rem',
          color: '#685B52',
        }}>
          <span>&copy; 2026 RescueBite AI &bull; Civic Food Redistribution Network</span>
          <span>Verified edible surplus coordination with human coordinator oversight.</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Global Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
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
