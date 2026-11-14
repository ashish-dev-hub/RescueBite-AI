import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import {
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building,
  ArrowRight,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onNavigate, onOpenAuth, onToast }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const navItems = [
    { id: 'landing', label: 'Overview' },
    { id: 'coordinator', label: 'Allocation Desk', role: 'coordinator' },
    { id: 'donor', label: 'Donor Portal', role: 'donor' },
    { id: 'ngo', label: 'NGO Demands', role: 'ngo' },
    { id: 'impact', label: 'Live Impact' },
  ];

  const handleNavClick = (id) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      setActiveTab(id);
    }
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleLogoutClick = () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    if (onNavigate) {
      onNavigate('landing');
    } else {
      setActiveTab('landing');
    }
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setShowLogoutConfirm(false);
    if (onToast) {
      onToast('You have been signed out safely.', 'info', 'Signed Out');
    }
  };

  const handleLogout = handleLogoutClick;

  const rolePortalId = user?.role === 'coordinator' ? 'coordinator' : user?.role === 'ngo' ? 'ngo' : 'donor';
  const rolePortalLabel = user?.role === 'coordinator' ? 'Allocation Desk' : user?.role === 'ngo' ? 'NGO Demands Portal' : 'Donor Operations Portal';

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Typographic Logo (Left) */}
        <div
          onClick={() => handleNavClick('landing')}
          className="navbar-brand"
        >
          <span className="navbar-brand-text">
            RescueBite
          </span>
        </div>

        {/* Desktop Plain Text Links Navigation (Center) */}
        <nav className="desktop-plain-nav">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`desktop-nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Desktop Auth & Mobile Controls (Far Right) */}
        <div className="navbar-right-cluster">
          {/* Desktop Auth Section (Visible on screens >= 768px) */}
          <div className="desktop-auth-cluster">
            {isAuthenticated ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '12px',
                      backgroundColor: '#FFFDF9',
                      color: '#2C221E',
                      border: '1px solid #E5DBC5',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 0 #E5DBC5',
                      minHeight: '44px',
                    }}
                    aria-expanded={profileDropdownOpen}
                    aria-label="Open profile menu"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name || 'User'}
                        referrerPolicy="no-referrer"
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: '#1F6F43',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                      }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user?.name || 'My Account'}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      backgroundColor: '#E3F2E7',
                      color: '#1F6F43',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}>
                      {user?.role}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                        color: '#685B52',
                      }}
                    />
                  </button>

                  <button
                    onClick={handleLogout}
                    title="Log out"
                    aria-label="Log out"
                    style={{
                      color: '#685B52',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #E5DBC5',
                      backgroundColor: '#FFFDF9',
                      cursor: 'pointer',
                      minWidth: '44px',
                      minHeight: '44px',
                      justifyContent: 'center',
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                {/* Enriched Profile Dropdown Card with Extensive Details */}
                {profileDropdownOpen && (
                  <div className="navbar-profile-dropdown">
                    {/* User Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#E3F2E7',
                        color: '#1F6F43',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        border: '1px solid #C8E2D1',
                        flexShrink: 0,
                      }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <h4 style={{
                            fontSize: '0.98rem',
                            fontWeight: 800,
                            color: '#2C221E',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {user?.name}
                          </h4>
                          <span style={{
                            fontSize: '0.62rem',
                            backgroundColor: '#E3F2E7',
                            color: '#1F6F43',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}>
                            Verified
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.78rem',
                          color: '#382C25',
                          fontWeight: 500,
                          margin: '0.15rem 0 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    {/* Rich Account & Partner Details Section */}
                    <div className="profile-detail-grid">
                      <span style={{ color: '#382C25', fontWeight: 700, whiteSpace: 'nowrap' }}>Role Type</span>
                      <strong style={{ color: '#1F6F43', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.role === 'coordinator' ? 'Operations Coordinator' : user?.role === 'donor' ? 'Surplus Food Donor' : 'Recipient NGO'}
                      </strong>

                      <span style={{ color: '#382C25', fontWeight: 700, whiteSpace: 'nowrap' }}>Organization</span>
                      <strong style={{ color: '#1C1613', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.organization || (user?.role === 'donor' ? 'Metro Bistro & Bakery' : user?.role === 'ngo' ? 'Hope Community Meals' : 'Central Dispatch Desk')}>
                        {user?.organization || (user?.role === 'donor' ? 'Metro Bistro & Bakery' : user?.role === 'ngo' ? 'Hope Community Meals' : 'Central Dispatch Desk')}
                      </strong>

                      <span style={{ color: '#382C25', fontWeight: 700, whiteSpace: 'nowrap' }}>Operating Zone</span>
                      <span style={{ color: '#1C1613', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.location?.city || user?.location?.address || 'Connaught Place Corridor'}>
                        {user?.location?.city || user?.location?.address || 'Connaught Place Corridor'}
                      </span>

                      <span style={{ color: '#382C25', fontWeight: 700, whiteSpace: 'nowrap' }}>Partner ID</span>
                      <div>
                        <code style={{
                          fontSize: '0.74rem',
                          backgroundColor: '#FFFDF9',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid #E5DBC5',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#1C1613',
                          letterSpacing: '0.02em',
                        }}>
                          #RB-{String(user?._id || user?.id || 'DEL-4091').slice(-6).toUpperCase()}
                        </code>
                      </div>

                      <span style={{ color: '#382C25', fontWeight: 700, whiteSpace: 'nowrap' }}>Status</span>
                      <strong style={{ color: '#1F6F43', fontWeight: 800 }}>
                        Active in Network
                      </strong>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleNavClick(rolePortalId);
                      }}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        backgroundColor: '#1F6F43',
                        color: '#FFFFFF',
                        padding: '0.65rem',
                        borderRadius: '10px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '0.5rem',
                        border: 'none',
                        boxShadow: '0 3px 0 #155231',
                        minHeight: '44px',
                      }}
                    >
                      Go to {rolePortalLabel}
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFDF9',
                        color: '#C44824',
                        padding: '0.55rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid #E5DBC5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 0 #E5DBC5',
                        minHeight: '44px',
                      }}
                    >
                      <LogOut size={15} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="btn-tactile-secondary"
                  style={{
                    padding: '0.45rem 1.05rem',
                    fontSize: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    minHeight: '44px',
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="btn-terracotta"
                  style={{
                    padding: '0.45rem 1.15rem',
                    fontSize: '0.85rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    minHeight: '44px',
                  }}
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile Topbar Controls (< 768px): One primary action + Hamburger menu */}
          <div className="mobile-topbar-action-cluster">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="btn-tactile-secondary mobile-topbar-signin-btn"
                aria-label="Sign in"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="mobile-profile-quick-btn"
                title={user?.name || 'My Account'}
                aria-label="Account menu"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-hamburger-btn"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Only visible on small screens < 768px when menu is open) */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="mobile-drawer-container"
          role="region"
          aria-label="Mobile Navigation Drawer"
        >
          <div className="mobile-drawer-links">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`mobile-drawer-link ${isActive ? 'active' : ''}`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="mobile-drawer-active-dot" />}
                </button>
              );
            })}
          </div>

          <div className="mobile-drawer-divider" />

          {/* Mobile Auth in Drawer */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                backgroundColor: '#FFFDF9',
                borderRadius: '10px',
                border: '1px solid #E5DBC5',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#E3F2E7',
                  color: '#1F6F43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  flexShrink: 0,
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#2C221E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#685B52', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  backgroundColor: '#E3F2E7',
                  color: '#1F6F43',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}>
                  {user?.role}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleNavClick(rolePortalId)}
                className="btn btn-secondary mobile-drawer-btn"
              >
                Go to {rolePortalLabel}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-outline mobile-drawer-btn"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="btn-tactile-secondary mobile-drawer-btn"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('register');
                }}
                className="btn-terracotta mobile-drawer-btn"
              >
                <span>Register as Partner</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Sign Out"
        subtitle="Are you sure you want to end your active session?"
        maxWidth="450px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.85rem 1rem',
            backgroundColor: '#FAF4EB',
            borderRadius: '12px',
            border: '1px solid #E5DBC5',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#E3F2E7',
              color: '#1F6F43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              flexShrink: 0,
              border: '1px solid #C8E2D1',
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: '#2C221E' }}>
                {user?.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#382C25', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email} &bull; <strong style={{ color: '#1F6F43', textTransform: 'capitalize' }}>{user?.role}</strong>
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: '#2C221E', lineHeight: 1.5, margin: 0 }}>
            You will need to sign in again to access the dispatch desk, manage surplus listings, or register demands.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="btn btn-outline"
              style={{ minHeight: '44px', padding: '0.55rem 1.15rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="btn-terracotta"
              style={{
                minHeight: '44px',
                padding: '0.55rem 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
