import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building,
  MapPin,
  ShieldCheck,
  Package,
  Soup,
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

  return (
    <header style={{
      backgroundColor: '#FAF4EB',
      borderBottom: '1px solid #E5DBC5',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.9rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        boxSizing: 'border-box',
      }}>
        {/* Brand Typographic Logo */}
        <div
          onClick={() => handleNavClick('landing')}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: "var(--font-heading)",
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: '#C44824',
          }}>
            RescueBite
          </span>
        </div>

        {/* Desktop Plain Text Links Navigation (No Pills) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.75rem',
          flexShrink: 1,
        }} className="desktop-plain-nav">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.35rem 0',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#2C221E' : '#685B52',
                  borderBottom: isActive ? '2px solid #C44824' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#2C221E';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#685B52';
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Authenticated User Dropdown or Sign In CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
                  }}
                  aria-expanded={profileDropdownOpen}
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user?.name || 'User'}
                      referrerPolicy="no-referrer"
                      style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={15} color="#685B52" />
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
                  style={{
                    color: '#685B52',
                    padding: '0.45rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #E5DBC5',
                    backgroundColor: '#FFFDF9',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Profile Dropdown Card */}
              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '280px',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '16px',
                  border: '1px solid #E5DBC5',
                  boxShadow: '4px 6px 0px #E5DBC5',
                  zIndex: 1000,
                  padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#E3F2E7',
                      color: '#1F6F43',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      border: '1px solid #C8E2D1',
                    }}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#2C221E',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user?.name}
                      </h4>
                      <p style={{
                        fontSize: '0.76rem',
                        color: '#685B52',
                        margin: '0.1rem 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {user?.organization && (
                    <div style={{
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#FAF4EB',
                      borderRadius: '8px',
                      border: '1px solid #E5DBC5',
                      fontSize: '0.78rem',
                      color: '#2C221E',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <Building size={14} color="#C44824" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.organization}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNavClick(rolePortalId);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#1F6F43',
                      color: '#FFFFFF',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                      border: 'none',
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
                      backgroundColor: 'transparent',
                      color: '#C44824',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #E5DBC5',
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-tactile-secondary"
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.85rem',
                borderRadius: '12px',
              }}
            >
              Sign In / Register
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: '0.45rem',
              color: '#2C221E',
              backgroundColor: '#FFFDF9',
              border: '1px solid #E5DBC5',
              borderRadius: '8px',
              display: 'none',
              cursor: 'pointer',
            }}
            className="mobile-hamburger-btn"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#FAF4EB',
          borderTop: '1px solid #E5DBC5',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: isActive ? '#FFFDF9' : 'transparent',
                  color: isActive ? '#C44824' : '#2C221E',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.92rem',
                  border: isActive ? '1px solid #E5DBC5' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
