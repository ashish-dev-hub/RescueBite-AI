import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sprout,
  Compass,
  Package,
  ShieldCheck,
  Soup,
  BarChart3,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
  Building,
  MapPin,
  ArrowRight,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    { id: 'landing', label: 'Network Overview', icon: Compass },
    { id: 'coordinator', label: 'Allocation Desk', icon: ShieldCheck, role: 'coordinator' },
    { id: 'donor', label: 'Donor Portal', icon: Package, role: 'donor' },
    { id: 'ngo', label: 'NGO Demands', icon: Soup, role: 'ngo' },
    { id: 'impact', label: 'Live Impact', icon: BarChart3 },
  ];

  const handleNavClick = (id) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      setActiveTab(id);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    if (onNavigate) {
      onNavigate('landing');
    } else {
      setActiveTab('landing');
    }
  };

  const rolePortalId = user?.role === 'coordinator' ? 'coordinator' : user?.role === 'ngo' ? 'ngo' : 'donor';
  const rolePortalLabel = user?.role === 'coordinator' ? 'Allocation Desk' : user?.role === 'ngo' ? 'NGO Demands Portal' : 'Donor Operations Portal';
  const RolePortalIcon = user?.role === 'coordinator' ? ShieldCheck : user?.role === 'ngo' ? Soup : Package;

  const handleGoToPortal = () => {
    setProfileDropdownOpen(false);
    if (onNavigate) {
      onNavigate(rolePortalId);
    } else {
      setActiveTab(rolePortalId);
    }
  };

  const handleDropdownLogout = () => {
    setProfileDropdownOpen(false);
    handleLogout();
  };

  return (
    <header style={{
      backgroundColor: 'var(--color-deep-forest)',
      color: '#FFFFFF',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 8px rgba(17, 43, 39, 0.25)',
      width: '100%',
    }}>
      <div className="navbar-container" style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Brand */}
        <div
          onClick={() => handleNavClick('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-network-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}>
            <Sprout size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                RescueBite
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: 'rgba(234, 244, 236, 0.2)',
                color: '#A5D6B8',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
              }}>
                AI
              </span>
            </div>
            <p className="brand-tagline" style={{ fontSize: '0.7rem', color: '#A5B5AE', lineHeight: 1, margin: 0 }}>The Fresh Network</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 1, minWidth: 0 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`desktop-nav-btn ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : '#B8C9C1',
                  backgroundColor: isActive ? 'var(--color-network-green)' : 'transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.3 : 1.9} />
                <span className="desktop-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: User Profile or Sign In */}
        <div className="navbar-right-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {isAuthenticated ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  id="user-profile-button"
                  className="user-profile-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: profileDropdownOpen ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="View Account Details"
                  aria-expanded={profileDropdownOpen}
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user?.name || 'User'}
                      referrerPolicy="no-referrer"
                      style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <User size={14} style={{ flexShrink: 0 }} />
                  )}
                  <span className="user-profile-name" style={{
                    fontWeight: 600,
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.name}
                  </span>
                  <span className="user-profile-role-badge" style={{
                    fontSize: '0.68rem',
                    backgroundColor: 'var(--color-network-green)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {user?.role}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                      opacity: 0.85,
                      flexShrink: 0,
                    }}
                  />
                </button>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="nav-logout-btn"
                  style={{
                    color: '#CBD8D2',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-btn-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Sleek Profile Dropdown Card */}
              {profileDropdownOpen && (
                <div
                  id="user-profile-dropdown"
                  className="user-profile-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '280px',
                    maxWidth: 'calc(100vw - 1.5rem)',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-deep-forest)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-soft-border)',
                    boxShadow: '0 12px 30px -5px rgba(17, 43, 39, 0.25), 0 8px 12px -6px rgba(17, 43, 39, 0.15)',
                    zIndex: 1000,
                    padding: '1.1rem',
                    animation: 'modalFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Profile Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.name || 'User'}
                        referrerPolicy="no-referrer"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid var(--color-soft-mint-border)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-soft-mint)',
                        color: 'var(--color-network-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                        border: '1px solid var(--color-soft-mint-border)',
                      }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'space-between' }}>
                        <h4 style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--color-deep-forest)',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }}>
                          {user?.name}
                        </h4>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          backgroundColor: user?.role === 'coordinator' ? 'var(--color-soft-mint)' : user?.role === 'donor' ? '#DCEDE0' : '#E0E7FF',
                          color: user?.role === 'coordinator' ? 'var(--color-network-green)' : user?.role === 'donor' ? 'var(--color-forest-dark)' : '#3730A3',
                          padding: '0.12rem 0.4rem',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {user?.role}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.76rem',
                        color: 'var(--color-muted-slate)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: '0.15rem 0 0 0',
                      }}>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div style={{
                    backgroundColor: 'var(--color-pale-neutral)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    fontSize: '0.78rem',
                    border: '1px solid var(--color-soft-border)',
                  }}>
                    {user?.organization && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={14} color="var(--color-network-green)" style={{ flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-deep-forest)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.organization}
                        </span>
                      </div>
                    )}

                    {user?.location?.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <MapPin size={14} color="var(--color-network-green)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                        <span style={{ color: 'var(--color-muted-slate)', lineHeight: 1.3 }}>
                          {user.location.address}
                        </span>
                      </div>
                    )}

                    {user?.role === 'ngo' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Soup size={14} color="var(--color-network-green)" style={{ flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-muted-slate)' }}>
                          Intake Capacity: <strong style={{ color: 'var(--color-deep-forest)' }}>{user.receivingCapacity || 0} meals</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <button
                      onClick={handleGoToPortal}
                      className="btn btn-secondary btn-sm"
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RolePortalIcon size={15} />
                        <span>Go to {rolePortalLabel}</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      onClick={handleDropdownLogout}
                      className="btn btn-outline btn-sm"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        color: '#DC2626',
                        borderColor: '#FECACA',
                        backgroundColor: '#FEF2F2',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      <LogOut size={14} />
                      <span>Log Out of Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary btn-sm navbar-auth-btn"
              style={{ backgroundColor: 'var(--color-network-green)', whiteSpace: 'nowrap' }}
            >
              <LogIn size={14} />
              <span className="navbar-auth-text">Sign In / Register</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn btn-outline btn-sm"
            style={{
              padding: '0.45rem',
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 'var(--radius-btn)',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer"
          style={{
            backgroundColor: 'var(--color-forest-dark)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.85rem 1.25rem 1.25rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {/* If not authenticated, provide full-width sign-in button in mobile menu */}
          {!isAuthenticated && (
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.7rem 1rem',
                marginBottom: '0.4rem',
                backgroundColor: 'var(--color-network-green)',
                fontSize: '0.9rem',
              }}
            >
              <LogIn size={16} />
              <span>Sign In / Register</span>
            </button>
          )}
          {/* If authenticated on mobile drawer, show a clean user profile banner */}
          {isAuthenticated && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '0.35rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name || 'User'}
                    referrerPolicy="no-referrer"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-network-green)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>{user?.name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#A5B5AE' }}>{user?.role?.toUpperCase()}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{
                  color: '#FECACA',
                  borderColor: 'rgba(254, 202, 202, 0.3)',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem',
                }}
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : '#CBD8D2',
                  backgroundColor: isActive ? 'var(--color-network-green)' : 'transparent',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
