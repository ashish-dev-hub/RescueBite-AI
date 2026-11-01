import React, { useState, useEffect, Suspense, lazy } from 'react';

const Hero3DCanvas = lazy(() => import('../components/Hero3DCanvas'));
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ArrowRight,
  ShieldCheck,
  Building,
  Soup,
  MapPin,
  Clock,
  Heart,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Users,
  Award,
  ThermometerSnowflake,
  Flame,
  Check,
  Sliders,
  Droplet,
} from 'lucide-react';

const SIMULATION_SCENARIOS = [
  {
    id: 1,
    badge: 'Urgent Dinner Match',
    confidence: 98,
    donorName: 'Metro Bistro & Bakery',
    donorLocation: 'Downtown Core',
    donorItem: '45 Fresh Hot Meals (Rice, Dal, Veggies)',
    donorStorage: 'Hot Holding (>60°C)',
    donorStorageIcon: Flame,
    prepTime: '35m ago',
    ngoName: 'Hope Shelter Community Kitchen',
    ngoLocation: 'East Ward (2.4 km)',
    ngoNeed: '50 Meals Needed',
    ngoReason: 'Evening Dinner Intake',
    transitTime: '12 mins',
    safeWindow: '1h 45m remaining',
    reasonCodes: ['Demand Fit 98%', 'Proximity Match', 'Hot Chain Validated'],
  },
  {
    id: 2,
    badge: 'Bakery & Chilled Dairy Rescue',
    confidence: 95,
    donorName: 'Artisan Bread & Cafe',
    donorLocation: 'Market District',
    donorItem: '60 Loaves & Pastries + Fresh Dairy',
    donorStorage: 'Refrigerated (<4°C)',
    donorStorageIcon: ThermometerSnowflake,
    prepTime: 'Baked Today',
    ngoName: 'Youth Horizon Day Center',
    ngoLocation: 'North Side (3.8 km)',
    ngoNeed: '60 Meals Needed',
    ngoReason: 'Breakfast & Family Packs',
    transitTime: '16 mins',
    safeWindow: '3h 15m remaining',
    reasonCodes: ['Direct Quantity Match', 'Cold Storage Feasible', 'Capacity 100%'],
  },
  {
    id: 3,
    badge: 'Caterer Event Surplus',
    confidence: 99,
    donorName: 'Grand Plaza Hotel & Banquets',
    donorLocation: 'Civic Center',
    donorItem: '85 Protein Bento Boxes',
    donorStorage: 'Chilled (<4°C)',
    donorStorageIcon: ThermometerSnowflake,
    prepTime: '1h ago',
    ngoName: 'St. Jude Community Meals',
    ngoLocation: 'Central Hub (1.8 km)',
    ngoNeed: '90 Meals Needed',
    ngoReason: 'Senior Meal Service',
    transitTime: '9 mins',
    safeWindow: '2h 30m remaining',
    reasonCodes: ['High Urgency Match', 'Transit < 10 mins', 'Zero Wait Time'],
  },
];

export default function LandingPage({ onSelectRole, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState({
    totalDeliveredMeals: 0,
    activeDonationsCount: 0,
    openDemandsCount: 0,
    fulfilmentRate: 0,
    environmentalEstimates: { kgFoodSaved: 0, co2KgAvoided: 0 },
  });

  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [activeRoleTab, setActiveRoleTab] = useState('donor');
  const [heroVisualMode, setHeroVisualMode] = useState('3d');
  const [calculatorMeals, setCalculatorMeals] = useState(50);

  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const data = await api.getAnalyticsOverview();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        // Fallback to baseline
      }
    };
    fetchLiveMetrics();
  }, []);

  const currentScenario = SIMULATION_SCENARIOS[activeScenarioIdx];
  const StorageIcon = currentScenario.donorStorageIcon;

  const handleNextScenario = () => {
    setActiveScenarioIdx((prev) => (prev + 1) % SIMULATION_SCENARIOS.length);
  };

  // Calculator estimations
  const kgFood = (calculatorMeals * 0.45).toFixed(1);
  const co2Avoided = (calculatorMeals * 1.12).toFixed(1);
  const waterSaved = Math.round(calculatorMeals * 140);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem', position: 'relative' }}>
      
      {/* CREATIVE HERO SECTION WITH SPLIT LAYOUT & AMBIENT GLOW */}
      <section className="hero-bhojan-section">
        <div className="hero-bhojan-grid">
          {/* LEFT: Engaging Value Story & CTAs (Faithful to Reference Design) */}
          <div className="hero-text-content">
            <h1 className="hero-bhojan-headline">
              Good food.<br />
              Better routes.<br />
              <span className="hero-bhojan-accent">Stronger communities.</span>
            </h1>

            <p className="hero-bhojan-sub">
              Kitchens share what is left. Neighbourhood meal programmes pick it up while it is still warm.
            </p>

            {/* CTA Buttons */}
            <div className="hero-bhojan-ctas">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => onSelectRole(user?.role === 'coordinator' ? 'coordinator' : user?.role === 'donor' ? 'donor' : 'ngo')}
                    className="btn-terracotta"
                  >
                    <span>
                      {user?.role === 'coordinator'
                        ? 'Open Allocation Desk'
                        : user?.role === 'donor'
                        ? 'Open Donor Portal'
                        : 'Open NGO Demands'}
                    </span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    onClick={() => onSelectRole('impact')}
                    className="btn-tactile-secondary"
                  >
                    <span>Live Impact (Sample data)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectRole('coordinator')}
                    className="btn-terracotta"
                  >
                    <span>Open Allocation Desk</span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    onClick={onOpenAuth}
                    className="btn-tactile-secondary"
                  >
                    <span>Sign in</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: 3D City Grid with Arcs & Segmented Score OR Dual Tactile Cards */}
          <div style={{ width: '100%', position: 'relative' }}>
            {/* View Switcher Toggle */}
            <div
              className="hero-view-toggle"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '0.65rem',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginRight: '0.35rem' }}>
                Hero View:
              </span>
              <button
                type="button"
                onClick={() => setHeroVisualMode('3d')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: '1px solid var(--color-soft-border)',
                  backgroundColor: heroVisualMode === '3d' ? 'var(--color-terracotta)' : '#FFFDF9',
                  color: heroVisualMode === '3d' ? '#FFFFFF' : 'var(--color-coffee-dark)',
                  boxShadow: heroVisualMode === '3d' ? 'none' : '0 1px 0 var(--color-card-bevel)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                3D City Grid
              </button>
              <button
                type="button"
                onClick={() => setHeroVisualMode('cards')}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: '1px solid var(--color-soft-border)',
                  backgroundColor: heroVisualMode === 'cards' ? 'var(--color-terracotta)' : '#FFFDF9',
                  color: heroVisualMode === 'cards' ? '#FFFFFF' : 'var(--color-coffee-dark)',
                  boxShadow: heroVisualMode === 'cards' ? 'none' : '0 1px 0 var(--color-card-bevel)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Dual Cards
              </button>
            </div>

            {/* 3D Canvas View with Suspense (Desktop/Tablet) */}
            {heroVisualMode === '3d' ? (
              <div className="hero-3d-wrapper">
                <Suspense
                  fallback={
                    <div
                      style={{
                        height: '420px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFDF9',
                        borderRadius: 'var(--radius-card)',
                        border: '1px solid var(--color-soft-border)',
                        color: 'var(--color-muted-slate)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Loading 3D City Grid...
                    </div>
                  }
                >
                  <Hero3DCanvas />
                </Suspense>
              </div>
            ) : null}

            {/* Fallback Static Tactile Dual Cards (Shown when selected OR on mobile <480px) */}
            <div
              className={`hero-cards-stack ${heroVisualMode === 'cards' ? 'active-cards' : 'fallback-cards'}`}
            >
              {/* Donor Card */}
              <div className="hero-card-donor">
                <div className="hero-card-label" style={{ color: '#1F6F43' }}>
                  DONOR &bull; SAMPLE DATA
                </div>
                <h3 className="hero-card-title">
                  Metro Bistro &amp; Bakery
                </h3>
                <p className="hero-card-desc">
                  45 fresh hot meals: rice, dal, veggies
                </p>
                <span
                  className="hero-card-pill"
                  style={{
                    backgroundColor: 'var(--color-mustard)',
                    color: 'var(--color-deep-forest)',
                  }}
                >
                  Hot holding
                </span>
              </div>

              {/* 12-min Circle Connector */}
              <div className="hero-circle-connector" title="Average transit interval">
                <span className="num">12</span>
                <span className="unit">mins</span>
              </div>

              {/* Shelter Card */}
              <div className="hero-card-shelter">
                <div className="hero-card-label" style={{ color: '#C44824' }}>
                  SHELTER &bull; 2.4 KM
                </div>
                <h3 className="hero-card-title">
                  Hope Shelter Community Kitchen
                </h3>
                <p className="hero-card-desc">
                  Needs 50 meals for evening dinner intake
                </p>
                <span
                  className="hero-card-pill"
                  style={{
                    backgroundColor: 'var(--color-soft-mint)',
                    color: 'var(--color-network-green)',
                  }}
                >
                  Approved by coordinator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grounded Metrics Ribbon with Sample Data Labels */}
        <div className="hero-sample-ticker">
          <div>
            <div className="sample-stat-val">
              {metrics.totalDeliveredMeals || 184}
            </div>
            <div className="sample-stat-label">
              Delivered Meals (Sample data)
            </div>
          </div>

          <div>
            <div className="sample-stat-val">
              {metrics.activeDonationsCount || 6}
            </div>
            <div className="sample-stat-label">
              Active Surplus Offers (Sample data)
            </div>
          </div>

          <div>
            <div className="sample-stat-val">
              12 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>mins</span>
            </div>
            <div className="sample-stat-label">
              Avg. Transit Interval (Sample data)
            </div>
          </div>

          <div>
            <div className="sample-stat-val">
              1,240 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kg</span>
            </div>
            <div className="sample-stat-label">
              CO₂e Prevented (Sample data)
            </div>
          </div>
        </div>
      </section>

      {/* REAL LISTING LIFECYCLE TIMELINE (Replaces 01/02/03 cards) */}
      <section style={{ marginBottom: '4.5rem' }}>
        <div className="section-bhojan-header">
          <div style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-network-green)',
            marginBottom: '0.45rem',
          }}>
            Case Audit &bull; Grounded Operations
          </div>
          <h2 className="section-bhojan-title">
            The Path of One Listing
          </h2>
          <p className="section-bhojan-sub">
            Follow an actual evening surplus consignment from a banquet kitchen to a community dining hall through verified decision checkpoints.
          </p>
        </div>

        {/* Real Single Listing Timeline */}
        <div className="timeline-bhojan-container">
          <div className="timeline-meta-bar">
            <span>CASE AUDIT #RB-DEL-4091 &bull; CONNAUGHT PLACE TO PAHAR GANJ CORRIDOR</span>
            <span style={{ color: 'var(--color-network-green)' }}>Status: Verified Delivered (Sample data)</span>
          </div>

          <div className="timeline-step-grid">
            <div className="timeline-step-node">
              <div className="t-node-time">19:10 IST &bull; LOGGED</div>
              <h3 className="t-node-title">Surplus Declared</h3>
              <p className="t-node-body">
                Hotel Imperial declares <strong>45 Fresh Hot Meals</strong> (Dal Makhani, Jeera Rice, Subz Korma). Safe storage requirement: Hot holding (&gt;60&deg;C).
              </p>
            </div>

            <div className="timeline-step-node">
              <div className="t-node-time">19:14 IST &bull; SCORING</div>
              <h3 className="t-node-title">Constraint Scoring</h3>
              <p className="t-node-body">
                Engine evaluates nearby shelters. Hope Shelter selected with <strong>94/100 match score</strong> (50 meals needed, 2.1 km transit distance).
              </p>
            </div>

            <div className="timeline-step-node">
              <div className="t-node-time">19:18 IST &bull; DISPATCHED</div>
              <h3 className="t-node-title">Coordinator Approval</h3>
              <p className="t-node-body">
                Operations desk verifies safe holding temperature window, approves digital dispatch, and assigns courier volunteer.
              </p>
            </div>

            <div className="timeline-step-node">
              <div className="t-node-time">19:42 IST &bull; DELIVERED</div>
              <h3 className="t-node-title">Intake Verified</h3>
              <p className="t-node-body">
                Shelter supervisor verifies food temperature integrity and distributes dinner to 45 residents. Audit trail closed.
              </p>
            </div>
          </div>
        </div>

        {/* Visual 4-Part Segmented Score Breakdown Bar */}
        <div className="score-visual-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--color-deep-forest)',
              margin: 0,
            }}>
              Explainable Matching Breakdown
            </h3>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>
              Deterministic Formula &bull; 94 / 100 Overall Score
            </span>
          </div>

          <div className="score-bar-segmented">
            <div className="seg-demand" title="Demand Fit: 35/35"></div>
            <div className="seg-urgency" title="Urgency Window: 24/25"></div>
            <div className="seg-proximity" title="Proximity (2.1 km): 18/20"></div>
            <div className="seg-storage" title="Safe Hot Chain: 17/20"></div>
          </div>

          <div className="score-breakdown-legend">
            <div className="legend-col">
              <strong>35% Demand Fit</strong>
              <p>Direct volume and meal type alignment with shelter evening quota.</p>
            </div>
            <div className="legend-col">
              <strong>25% Deadline Urgency</strong>
              <p>Safe food holding window before risk of spoilage.</p>
            </div>
            <div className="legend-col">
              <strong>20% Road Proximity</strong>
              <p>Under 15 minutes expected travel time (2.1 km transit distance).</p>
            </div>
            <div className="legend-col">
              <strong>20% Storage Protocol</strong>
              <p>Thermal insulated carrier verification (&gt;60&deg;C hot holding).</p>
            </div>
          </div>
        </div>
      </section>

      {/* OPERATIONAL PORTALS SHOWCASE */}
      <section style={{ marginBottom: '4.5rem' }}>
        <div className="section-bhojan-header">
          <div style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-network-green)',
            marginBottom: '0.45rem',
          }}>
            Dedicated Tools
          </div>
          <h2 className="section-bhojan-title">
            Workspaces for Every Partner
          </h2>
          <p className="section-bhojan-sub">
            Tailored interfaces designed for commercial donors, dispatch coordinators, and community shelters.
          </p>
        </div>

        {/* Clean Segmented Control (No Pills) */}
        <div className="role-segmented-nav">
          <button
            type="button"
            onClick={() => setActiveRoleTab('donor')}
            className={`role-segment-btn ${activeRoleTab === 'donor' ? 'active' : ''}`}
          >
            <Building size={16} />
            <span>Food Donors</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('coordinator')}
            className={`role-segment-btn ${activeRoleTab === 'coordinator' ? 'active' : ''}`}
          >
            <ShieldCheck size={16} />
            <span>Operations Coordinators</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('ngo')}
            className={`role-segment-btn ${activeRoleTab === 'ngo' ? 'active' : ''}`}
          >
            <Soup size={16} />
            <span>Recipient NGOs</span>
          </button>
        </div>

        {/* Dynamic Role Card */}
        <div style={{
          backgroundColor: '#FFFDF9',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-soft-border)',
          boxShadow: '4px 6px 0px var(--color-card-bevel)',
          padding: '2.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '2.5rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: 'var(--color-network-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              {activeRoleTab === 'donor' && 'Hotels &bull; Caterers &bull; Commercial Kitchens'}
              {activeRoleTab === 'coordinator' && 'City Logistics Command'}
              {activeRoleTab === 'ngo' && 'Community Shelters &bull; Day Centers'}
            </div>

            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--color-deep-forest)',
              marginBottom: '0.75rem',
              lineHeight: 1.25,
            }}>
              {activeRoleTab === 'donor' && 'List Surplus in Seconds & Track Impact'}
              {activeRoleTab === 'coordinator' && 'Review Matches & Authorize Dispatch'}
              {activeRoleTab === 'ngo' && 'Submit Needs & Confirm Meal Intake'}
            </h3>

            <p style={{
              fontSize: '0.92rem',
              color: 'var(--color-muted-slate)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              {activeRoleTab === 'donor' && 'Publish surplus wholesome food with storage protocol details. Instant alerts notify you as soon as a local coordinator assigns a verified courier.'}
              {activeRoleTab === 'coordinator' && 'Evaluate candidate matches ranked by urgency and distance. One-click approval ensures safe food moves within strict temperature boundaries.'}
              {activeRoleTab === 'ngo' && 'Submit daily dinner quotas for your residents. Receive notifications on matching incoming surplus and verify meal temperature upon arrival.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.75rem' }}>
              {activeRoleTab === 'donor' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Instant surplus declaration with hot/cold storage tags</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Real-time countdown to safety expiry window</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Direct environmental impact summary (CO₂e & food saved)</span>
                  </div>
                </>
              )}

              {activeRoleTab === 'coordinator' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Explainable ranking sorted by urgency and route feasibility</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Transit time boundary checks against declared holding limits</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>1-Click dispatch approval with volunteer courier assignment</span>
                  </div>
                </>
              )}

              {activeRoleTab === 'ngo' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Submit meal requirements by dietary type (Veg, Jain, Halal)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Accept or reject matched allocations with reasoned feedback</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--color-deep-forest)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Timestamped intake confirmation for ESG and audit reporting</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onSelectRole(activeRoleTab)}
              className="btn-terracotta"
            >
              <span>
                {activeRoleTab === 'donor' && 'Launch Donor Portal'}
                {activeRoleTab === 'coordinator' && 'Launch Allocation Desk'}
                {activeRoleTab === 'ngo' && 'Launch NGO Portal'}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Interactive Role Live Console (Editorial Handcrafted Card) */}
          <div style={{
            backgroundColor: '#FAF4EB',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-soft-border)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--color-soft-border)',
            }}>
              <div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-coffee-dark)',
                  display: 'block',
                }}>
                  {activeRoleTab === 'donor' && 'Active Kitchen Consignments'}
                  {activeRoleTab === 'coordinator' && 'Live Priority Queue'}
                  {activeRoleTab === 'ngo' && 'Verified Shelter Needs'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                  {activeRoleTab === 'donor' && 'Ward 4 • Metro Bistro Hub'}
                  {activeRoleTab === 'coordinator' && 'Central Delhi Command Desk'}
                  {activeRoleTab === 'ngo' && 'East District Community Hub'}
                </span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--color-terracotta)',
                backgroundColor: '#FFF4ED',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid #FAD5C5',
              }}>
                Sample data
              </span>
            </div>

            {/* TAB-SPECIFIC EDITORIAL WORKSPACES */}
            {activeRoleTab === 'donor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      Fresh Dal Makhani &amp; Jeera Rice
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>
                      45 Meals
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem' }}>
                    <span>Hot Holding (&gt;60&deg;C)</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-terracotta)' }}>Pickup within 35 mins</span>
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      60 Tandoori Rotis &amp; Mix Sabzi
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>
                      60 Portions
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem' }}>
                    <span>Ambient Thermal Crate</span>
                    <span>Ready for 8:00 PM dispatch</span>
                  </div>
                </div>

                {/* Handcrafted Dispatch Receipt Box */}
                <div style={{
                  backgroundColor: '#FFFDF9',
                  borderRadius: '10px',
                  border: '1px solid var(--color-soft-border)',
                  borderLeft: '4px solid var(--color-forest-green)',
                  padding: '0.85rem 1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-forest-green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Automated Route Match
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-coffee-dark)', fontVariantNumeric: 'tabular-nums' }}>
                      94/100 Score
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-coffee-dark)', margin: '0 0 0.35rem 0', fontWeight: 600 }}>
                    Hope Shelter Community Kitchen (2.4 km via Ring Road)
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    <span>Assigned Courier: Electric Van #04</span>
                    <span>Estimated transit: 18 mins</span>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'coordinator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)', borderLeft: '4px solid var(--color-terracotta)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      Metro Bistro &rarr; Hope Shelter
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-terracotta)' }}>
                      96% Rank #1
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)', margin: '0.25rem 0' }}>
                    45 Hot Meals • 2.4 km distance • 1h 45m safe window
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                    <span>Demand 35 • Urgency 25 • Route 20 • Storage 16</span>
                    <span>1-Click Approval Ready</span>
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      Grand Banquet &rarr; Seva Rasoi
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>
                      92% Rank #2
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)', margin: '0.25rem 0' }}>
                    80 Pure Veg Portions • 3.1 km distance • Holding confirmed
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    <span>Chilled Insulated transport required</span>
                    <span>Scheduled 8:30 PM</span>
                  </div>
                </div>

                <div style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '8px',
                  border: '1px solid var(--color-soft-border)',
                  fontSize: '0.74rem',
                  color: 'var(--color-muted-slate)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>City Dispatch: <strong>3 Active Couriers</strong></span>
                  <span>Avg Match: <strong>4.2 mins</strong></span>
                </div>
              </div>
            )}

            {activeRoleTab === 'ngo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)', borderLeft: '4px solid var(--color-forest-green)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      Evening Intake Quota
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-forest-green)' }}>
                      50 Meals
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--color-coffee-dark)', margin: '0.25rem 0', fontWeight: 600 }}>
                    Allocated: 45 Meals from Metro Bistro (Arriving ~18 mins)
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                    <span>Dietary: Vegetarian / Hot Dal &amp; Rice</span>
                    <span style={{ color: 'var(--color-forest-green)', fontWeight: 700 }}>In Transit</span>
                  </div>
                </div>

                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#FFFDF9', borderRadius: '10px', border: '1px solid var(--color-soft-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-coffee-dark)' }}>
                      Breakfast Intake Quota
                    </strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-muted-slate)' }}>
                      35 Portions
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem' }}>
                    <span>Needed by Tomorrow 7:30 AM</span>
                    <span style={{ color: 'var(--color-terracotta)', fontWeight: 600 }}>Awaiting Morning Surplus</span>
                  </div>
                </div>

                <div style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FFFDF9',
                  borderRadius: '8px',
                  border: '1px solid var(--color-soft-border)',
                  fontSize: '0.74rem',
                  color: 'var(--color-muted-slate)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>Intake Capacity: <strong>120 Meals / day</strong></span>
                  <span>Safety: <strong>Temp Handover Logged</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* INTERACTIVE IMPACT ESTIMATOR (Tactile & Clean) */}
      <section style={{ marginBottom: '4.5rem' }}>
        <div className="section-bhojan-header">
          <div style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-network-green)',
            marginBottom: '0.45rem',
          }}>
            Environmental Calculator
          </div>
          <h2 className="section-bhojan-title">
            Project Your Rescue Impact
          </h2>
          <p className="section-bhojan-sub">
            Select your regular surplus meal volume to calculate projected landfill diversion and community meals:
          </p>
        </div>

        {/* Volume Selectors */}
        <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[25, 50, 100, 250, 500].map((meals) => (
            <button
              key={meals}
              type="button"
              onClick={() => setCalculatorMeals(meals)}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-btn)',
                border: `2px solid ${calculatorMeals === meals ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                backgroundColor: calculatorMeals === meals ? 'var(--color-network-green)' : '#FFFDF9',
                color: calculatorMeals === meals ? '#FFFFFF' : 'var(--color-deep-forest)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: calculatorMeals === meals ? '0 2px 6px rgba(31, 111, 67, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {meals} Meals / Day
            </button>
          ))}
        </div>

        {/* 4 Impact Calculations Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1.25rem',
        }}>
          <div style={{
            background: '#FFFDF9',
            padding: '1.65rem 1.4rem',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-soft-border)',
            boxShadow: '4px 6px 0px var(--color-card-bevel)',
          }}>
            <p style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-network-green)',
              margin: '0 0 0.2rem 0',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {calculatorMeals}
            </p>
            <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-forest)', display: 'block', marginBottom: '0.2rem' }}>
              People Nourished
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              Per redistribution run (Estimated)
            </span>
          </div>

          <div style={{
            background: '#FFFDF9',
            padding: '1.65rem 1.4rem',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-soft-border)',
            boxShadow: '4px 6px 0px var(--color-card-bevel)',
          }}>
            <p style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-deep-forest)',
              margin: '0 0 0.2rem 0',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {kgFood} <span style={{ fontSize: '0.95rem' }}>kg</span>
            </p>
            <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-forest)', display: 'block', marginBottom: '0.2rem' }}>
              Edible Food Rescued
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              Kept out of city landfills (Estimated)
            </span>
          </div>

          <div style={{
            background: '#FFFDF9',
            padding: '1.65rem 1.4rem',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-soft-border)',
            boxShadow: '4px 6px 0px var(--color-card-bevel)',
          }}>
            <p style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-terracotta)',
              margin: '0 0 0.2rem 0',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {co2Avoided} <span style={{ fontSize: '0.95rem' }}>kg</span>
            </p>
            <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-forest)', display: 'block', marginBottom: '0.2rem' }}>
              CO₂e Emissions Prevented
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              Greenhouse gas avoidance (Estimated)
            </span>
          </div>

          <div style={{
            background: '#FFFDF9',
            padding: '1.65rem 1.4rem',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-soft-border)',
            boxShadow: '4px 6px 0px var(--color-card-bevel)',
          }}>
            <p style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: '#2563EB',
              margin: '0 0 0.2rem 0',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {waterSaved.toLocaleString()} <span style={{ fontSize: '0.95rem' }}>L</span>
            </p>
            <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-forest)', display: 'block', marginBottom: '0.2rem' }}>
              Embedded Water Conserved
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              Agricultural water footprint (Estimated)
            </span>
          </div>
        </div>
      </section>

      {/* GROUNDED INDIAN COMMUNITY TESTIMONIAL BANNER */}
      <section style={{
        backgroundColor: '#193C30',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-card)',
        padding: '3rem 2.25rem',
        textAlign: 'center',
        border: '1px solid #112920',
        boxShadow: '4px 6px 0px var(--color-card-bevel)',
        position: 'relative',
      }}>
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)',
          fontWeight: 600,
          fontStyle: 'normal',
          maxWidth: '820px',
          margin: '0 auto 1.5rem auto',
          lineHeight: 1.6,
          color: '#FAF4EB',
        }}>
          &ldquo;RescueBite replaced chaotic last-minute calls with predictable, safe meal arrivals. Our kitchen and community volunteers can now focus on serving hot, wholesome dinner plates with complete dignity.&rdquo;
        </p>
        <p style={{ fontSize: '0.86rem', color: '#C8E2D1', margin: 0, fontWeight: 500 }}>
          &mdash; <strong style={{ color: '#FFFFFF' }}>Sardar Gurpreet Singh</strong>, Kitchen Lead &bull; Gurudwara Langar Annex, Delhi NCR (Sample data)
        </p>
      </section>

    </div>
  );
}
