import React, { useState, useRef, useEffect } from 'react';
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

export default function Navbar({ activeTab, setActiveTab, onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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

  const handleLogout = () => {
    logout();
    if (onNavigate) {
      onNavigate('landing');
    } else {
      setActiveTab('landing');
    }
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

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
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '345px',
                    maxWidth: 'calc(100vw - 2rem)',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '16px',
                    border: '1px solid #E5DBC5',
                    boxShadow: '5px 8px 0px #E5DBC5',
                    zIndex: 1000,
                    padding: '1.25rem',
                    boxSizing: 'border-box',
                  }}>
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
                          fontSize: '0.76rem',
                          color: '#685B52',
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
                    <div style={{
                      backgroundColor: '#FAF4EB',
                      borderRadius: '12px',
                      border: '1px solid #E5DBC5',
                      padding: '0.85rem 0.95rem',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      color: '#2C221E',
                      display: 'grid',
                      gridTemplateColumns: '105px 1fr',
                      rowGap: '0.55rem',
                      columnGap: '0.75rem',
                      alignItems: 'baseline',
                    }}>
                      <span style={{ color: '#685B52', fontWeight: 600, whiteSpace: 'nowrap' }}>Role Type</span>
                      <strong style={{ color: '#1F6F43', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.role === 'coordinator' ? 'Operations Coordinator' : user?.role === 'donor' ? 'Surplus Food Donor' : 'Recipient NGO'}
                      </strong>

                      <span style={{ color: '#685B52', fontWeight: 600, whiteSpace: 'nowrap' }}>Organization</span>
                      <strong style={{ color: '#2C221E', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.organization || (user?.role === 'donor' ? 'Metro Bistro & Bakery' : user?.role === 'ngo' ? 'Hope Community Meals' : 'Central Dispatch Desk')}>
                        {user?.organization || (user?.role === 'donor' ? 'Metro Bistro & Bakery' : user?.role === 'ngo' ? 'Hope Community Meals' : 'Central Dispatch Desk')}
                      </strong>

                      <span style={{ color: '#685B52', fontWeight: 600, whiteSpace: 'nowrap' }}>Operating Zone</span>
                      <span style={{ color: '#2C221E', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.location?.city || user?.location?.address || 'Connaught Place Corridor'}>
                        {user?.location?.city || user?.location?.address || 'Connaught Place Corridor'}
                      </span>

                      <span style={{ color: '#685B52', fontWeight: 600, whiteSpace: 'nowrap' }}>Partner ID</span>
                      <div>
                        <code style={{
                          fontSize: '0.74rem',
                          backgroundColor: '#FFFDF9',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid #E5DBC5',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#4A3E38',
                          letterSpacing: '0.02em',
                        }}>
                          #RB-{String(user?._id || user?.id || 'DEL-4091').slice(-6).toUpperCase()}
                        </code>
                      </div>

                      <span style={{ color: '#685B52', fontWeight: 600, whiteSpace: 'nowrap' }}>Status</span>
                      <span style={{ color: '#1F6F43', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1F6F43', display: 'inline-block' }}></span>
                        Active in Network
                      </span>
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
    </header>
  );
}
