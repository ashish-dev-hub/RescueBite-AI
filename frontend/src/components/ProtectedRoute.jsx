import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function ProtectedRoute({
  requiredRole,
  portalName,
  onOpenAuth,
  onNavigate,
  children,
}) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--color-soft-mint)',
          borderTopColor: 'var(--color-network-green)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1rem auto',
        }} />
        <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)' }}>Verifying credentials...</p>
      </div>
    );
  }

  // 1. Not authenticated at all
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem' }}>
        <div className="fresh-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-soft-mint)',
            color: 'var(--color-network-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-deep-forest)', marginBottom: '0.5rem' }}>
            Sign In Required
          </h2>

          <p style={{ fontSize: '0.92rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Accessing <strong>{portalName}</strong> requires an active, authenticated account.
            Food rescue listings, algorithmic matching, and meal distribution requests are protected services.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
            >
              <UserCheck size={18} />
              <span>Sign In / Register</span>
            </button>

            <button
              onClick={() => onNavigate('landing')}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
            >
              <span>Back to Overview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated, but wrong role
  // Coordinators can supervise all portals; specific donor/ngo roles cannot cross-access
  const isRoleAuthorized =
    !requiredRole ||
    user?.role === 'coordinator' ||
    user?.role === requiredRole;

  if (!isRoleAuthorized) {
    const roleTargetTab = user?.role === 'donor' ? 'donor' : 'ngo';
    const roleTargetLabel = user?.role === 'donor' ? 'Donor Portal' : 'NGO Demands';

    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem' }}>
        <div className="fresh-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}>
            <ShieldAlert size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-deep-forest)', marginBottom: '0.5rem' }}>
            Role Restricted Portal
          </h2>

          <p style={{ fontSize: '0.92rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            You are signed in as <strong>{user?.name}</strong> with role{' '}
            <span style={{
              textTransform: 'uppercase',
              fontWeight: 700,
              backgroundColor: 'var(--color-pale-neutral)',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
            }}>
              {user?.role}
            </span>.
          </p>

          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', lineHeight: 1.5, marginBottom: '2rem' }}>
            {requiredRole === 'coordinator'
              ? 'The Operations Allocation Desk is strictly reserved for provisioned coordinators.'
              : `The ${portalName} is designated exclusively for ${requiredRole.toUpperCase()} accounts.`}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate(roleTargetTab)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
            >
              <span>Go to Your {roleTargetLabel}</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onNavigate('landing')}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
            >
              <span>Network Overview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated and Authorized
  return children;
}
