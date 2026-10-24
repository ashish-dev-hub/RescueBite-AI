import React, { useState } from 'react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Building, Soup, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerRole, setRegisterRole] = useState('donor'); // strictly 'donor' or 'ngo'
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [receivingCapacity, setReceivingCapacity] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(loginEmail, loginPassword);
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

    // Extra client-side guardrail: Never permit coordinator signup
    if (registerRole === 'coordinator') {
      setError('Coordinator accounts cannot be created publicly.');
      return;
    }

    setLoading(true);
    try {
      const registeredUser = await register({
        name,
        email,
        password,
        role: registerRole,
        organization,
        location: { address },
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
          : 'Register as a surplus food donor or recipient NGO'
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
          Register (Donor / NGO)
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
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
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
      ) : (
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label className="form-label">I am registering as:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRegisterRole('donor')}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-btn)',
                  border: `2px solid ${registerRole === 'donor' ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: registerRole === 'donor' ? 'var(--color-soft-mint)' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-deep-forest)',
                }}
              >
                <Building size={16} color={registerRole === 'donor' ? '#2F7D67' : '#687872'} />
                <span>Food Donor</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterRole('ngo')}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-btn)',
                  border: `2px solid ${registerRole === 'ngo' ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: registerRole === 'ngo' ? 'var(--color-soft-mint)' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-deep-forest)',
                }}
              >
                <Soup size={16} color={registerRole === 'ngo' ? '#2F7D67' : '#687872'} />
                <span>Recipient NGO</span>
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem' }}>
              * Coordinator roles are privileged operational accounts provisioned via secure administration.
            </p>
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
              placeholder={registerRole === 'donor' ? 'e.g. Metro Bistro & Bakery' : 'e.g. Sunrise Community Kitchen'}
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
            <input
              type="password"
              required
              className="form-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
