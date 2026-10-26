import React, { useState } from 'react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Building, Soup, Compass, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const rawGoogleId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const hasConfiguredGoogleClient =
    rawGoogleId &&
    !rawGoogleId.includes('your-google-client-id') &&
    rawGoogleId.includes('.apps.googleusercontent.com');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [registerRole, setRegisterRole] = useState('donor'); // 'donor' | 'ngo' | 'coordinator'
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [receivingCapacity, setReceivingCapacity] = useState('');

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const extraData = mode === 'register' ? {
        role: registerRole,
        organization,
        location: { address },
        receivingCapacity: registerRole === 'ngo' ? (parseInt(receivingCapacity, 10) || 0) : 0,
      } : {};

      const loggedUser = await loginWithGoogle(credential, extraData);
      if (onSuccess) onSuccess(loggedUser);
      onClose();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        setError('Cannot connect to the server. Please check your internet connection and try again.');
      } else {
        setError(msg || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleDemoGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Use unique sub IDs per role so accounts don't collide in MongoDB
      let demoSub, demoEmail, demoName, demoOrg;
      if (mode === 'register' && registerRole === 'coordinator') {
        demoSub = 'demo-coord-sub-003';
        demoEmail = 'coordinator.google@rescuebite.org';
        demoName = 'Operations Coordinator';
        demoOrg = 'RescueBite Operations Hub';
      } else if (mode === 'register' && registerRole === 'ngo') {
        demoSub = 'demo-ngo-sub-002';
        demoEmail = 'shelter.google@rescuebite.org';
        demoName = 'Hope Community Shelter';
        demoOrg = 'Hope Shelter NGO';
      } else {
        demoSub = 'demo-donor-sub-001';
        demoEmail = 'donor.google@rescuebite.org';
        demoName = 'Metro Food Partner';
        demoOrg = 'Metro Kitchens';
      }

      // Format: demo-google:<sub>:<email>:<name>
      const demoCredential = `demo-google:${demoSub}:${demoEmail}:${demoName}`;

      const extraData = mode === 'register' ? {
        role: registerRole,
        organization: organization || demoOrg,
        location: { address: address || '123 Market Street' },
        receivingCapacity: registerRole === 'ngo' ? (parseInt(receivingCapacity, 10) || 50) : 0,
      } : {};

      const loggedUser = await loginWithGoogle(demoCredential, extraData);
      if (onSuccess) onSuccess(loggedUser);
      onClose();
    } catch (err) {
      // Show clear error with helpful context for connection issues
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        setError('Cannot reach the backend server. If running locally, start the backend with: npm run dev:backend');
      } else {
        setError(msg || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(loginEmail.trim(), loginPassword);
      if (onSuccess) onSuccess(loggedUser);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const registeredUser = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: registerRole,
        organization: organization.trim(),
        location: { address: address.trim() },
        receivingCapacity: registerRole === 'ngo' ? parseInt(receivingCapacity, 10) : 0,
      });
      if (onSuccess) onSuccess(registeredUser);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign In to RescueBite AI' : 'Join The Fresh Network'}
      subtitle={
        mode === 'login'
          ? 'Enter your registered email and password to access your portal'
          : 'Register as a surplus food donor, recipient NGO, or operations coordinator'
      }
      maxWidth="500px"
    >
      {/* Mode Switcher Tabs */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--color-pale-neutral)',
        borderRadius: 'var(--radius-btn)',
        padding: '0.25rem',
        marginBottom: '1.25rem',
      }}>
        <button
          onClick={() => { setMode('login'); setError(''); }}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: 'var(--radius-btn-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
            color: mode === 'login' ? 'var(--color-deep-forest)' : 'var(--color-muted-slate)',
            boxShadow: mode === 'login' ? 'var(--shadow-subtle)' : 'none',
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode('register'); setError(''); }}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: 'var(--radius-btn-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
            color: mode === 'register' ? 'var(--color-deep-forest)' : 'var(--color-muted-slate)',
            boxShadow: mode === 'register' ? 'var(--shadow-subtle)' : 'none',
          }}
        >
          Register (All Roles)
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: 'var(--status-cancelled-bg)',
          color: 'var(--status-cancelled-text)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {mode === 'login' ? (
        <div>
          {/* Google Auth Block for Login */}
          <div style={{ marginBottom: '1.25rem' }}>
            {hasConfiguredGoogleClient ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <GoogleLogin
                  onSuccess={(res) => res.credential && handleGoogleSuccess(res.credential)}
                  onError={() => setError('Google sign-in was cancelled or failed.')}
                  type="standard"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                  width="100%"
                />
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleDemoGoogleLogin}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--color-soft-border)',
                    color: 'var(--color-deep-forest)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  <GoogleIcon size={18} />
                  <span>Continue with Google</span>
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', padding: '0 0.15rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    Test Google Auth instantly
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfigHelp(!showConfigHelp)}
                    style={{ fontSize: '0.72rem', color: 'var(--color-network-green)', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {showConfigHelp ? 'Hide Setup' : 'Connect Real Google ID?'}
                  </button>
                </div>

                {showConfigHelp && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--color-pale-neutral)',
                    borderRadius: 'var(--radius-btn)',
                    border: '1px solid var(--color-soft-border)',
                    fontSize: '0.75rem',
                    color: 'var(--color-dark-slate)',
                    lineHeight: 1.45,
                  }}>
                    <strong>Google OAuth 2.0 Setup:</strong>
                    <ol style={{ paddingLeft: '1.1rem', marginTop: '0.35rem' }}>
                      <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Google Cloud Console</a>.</li>
                      <li>Create OAuth 2.0 Web Client ID.</li>
                      <li>Add Authorized JavaScript origin: <code>http://localhost:5173</code> & your production domain.</li>
                      <li>Paste Client ID into <code>frontend/.env</code> as <code>VITE_GOOGLE_CLIENT_ID</code> and <code>backend/.env</code> as <code>GOOGLE_CLIENT_ID</code>.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.15rem 0 0.5rem 0',
              gap: '0.65rem',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-soft-border)' }} />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                or sign in with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-soft-border)' }} />
            </div>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@organization.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '2.6rem', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-muted-slate, #687872)',
                    zIndex: 20,
                  }}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label className="form-label">I am registering as:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={() => setRegisterRole('donor')}
                style={{
                  padding: '0.75rem 0.35rem',
                  borderRadius: 'var(--radius-btn)',
                  border: `2px solid ${registerRole === 'donor' ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: registerRole === 'donor' ? 'var(--color-soft-mint)' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--color-deep-forest)',
                }}
              >
                <Building size={18} color={registerRole === 'donor' ? '#2F7D67' : '#687872'} />
                <span>Food Donor</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterRole('ngo')}
                style={{
                  padding: '0.75rem 0.35rem',
                  borderRadius: 'var(--radius-btn)',
                  border: `2px solid ${registerRole === 'ngo' ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: registerRole === 'ngo' ? 'var(--color-soft-mint)' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--color-deep-forest)',
                }}
              >
                <Soup size={18} color={registerRole === 'ngo' ? '#2F7D67' : '#687872'} />
                <span>Recipient NGO</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterRole('coordinator')}
                style={{
                  padding: '0.75rem 0.35rem',
                  borderRadius: 'var(--radius-btn)',
                  border: `2px solid ${registerRole === 'coordinator' ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: registerRole === 'coordinator' ? 'var(--color-soft-mint)' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--color-deep-forest)',
                }}
              >
                <Compass size={18} color={registerRole === 'coordinator' ? '#2F7D67' : '#687872'} />
                <span>Coordinator</span>
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.4rem' }}>
              {registerRole === 'donor' && '• List fresh surplus food batches and connect with nearby shelters.'}
              {registerRole === 'ngo' && '• Request meal deliveries and view AI-predicted shelter demand.'}
              {registerRole === 'coordinator' && '• Manage citywide logistics, approve AI matches, and assign drivers.'}
            </p>
          </div>

          {/* Google Register Option */}
          <div style={{ marginBottom: '1.25rem' }}>
            {hasConfiguredGoogleClient ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <GoogleLogin
                  onSuccess={(res) => res.credential && handleGoogleSuccess(res.credential)}
                  onError={() => setError('Google registration was cancelled or failed.')}
                  type="standard"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="signup_with"
                  width="100%"
                />
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleDemoGoogleLogin}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--color-soft-border)',
                    color: 'var(--color-deep-forest)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  <GoogleIcon size={18} />
                  <span>Register with Google as {registerRole === 'donor' ? 'Food Donor' : registerRole === 'ngo' ? 'Recipient NGO' : 'Coordinator'}</span>
                </button>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.15rem 0 0.5rem 0',
              gap: '0.65rem',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-soft-border)' }} />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                or register with email below
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-soft-border)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder={
                registerRole === 'donor'
                  ? 'e.g. Metro Bistro & Bakery'
                  : registerRole === 'ngo'
                  ? 'e.g. Sunrise Community Kitchen'
                  : 'e.g. RescueBite Central Operations'
              }
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '2.6rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-muted-slate, #687872)',
                  zIndex: 20,
                }}
                aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                title={showRegisterPassword ? 'Hide password' : 'Show password'}
              >
                {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Address</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Street, City, Postal Code"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {registerRole === 'ngo' && (
            <div className="form-group">
              <label className="form-label">Receiving Meal Capacity (Max meals/intake)</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={receivingCapacity}
                onChange={(e) => setReceivingCapacity(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      )}
    </Modal>
  );
}
