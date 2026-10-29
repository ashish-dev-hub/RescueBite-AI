import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Sprout,
  ArrowRight,
  ShieldCheck,
  Building,
  Soup,
  Truck,
  Sparkles,
  Leaf,
  MapPin,
  Clock,
  Heart,
  ChevronRight,
  Zap,
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
      <section className="hero-ambient-container">
        {/* Soft Ambient Organic Glows in Brand Colors */}
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />

        <div className="hero-split-grid">
          {/* LEFT: Engaging Value Story & CTAs */}
          <div className="hero-text-content">
            

            <h1 className="hero-headline">
              Good food. Better routes.{' '}
              <span className="hero-highlight">Stronger communities.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(0.95rem, 1.6vw, 1.12rem)',
              color: 'var(--color-muted-slate)',
              lineHeight: 1.65,
              marginBottom: '1.5rem',
              maxWidth: '560px',
            }}>
              RescueBite AI bridges the gap between commercial food surplus and neighborhood meal programs.
              Predict local shelter needs, match safe surplus within transit windows, and coordinate verified human-approved allocations.
            </p>

            {/* Feature Highlights Pills */}
            <div className="hero-badges-row">
              <span className="hero-badge-pill">
                <Zap size={14} color="var(--color-network-green)" />
                <span>15-Min Rapid Dispatch</span>
              </span>
              <span className="hero-badge-pill">
                <ShieldCheck size={14} color="var(--color-network-green)" />
                <span>Cold-Chain Verified</span>
              </span>
              <span className="hero-badge-pill">
                <Leaf size={14} color="var(--color-network-green)" />
                <span>Direct ESG Metrics</span>
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="hero-cta-buttons" style={{ justifyContent: 'flex-start', marginBottom: '2rem' }}>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => onSelectRole(user?.role === 'coordinator' ? 'coordinator' : user?.role === 'donor' ? 'donor' : 'ngo')}
                    className="btn btn-primary"
                    style={{
                      padding: '0.85rem 1.85rem',
                      fontSize: '0.98rem',
                      boxShadow: '0 4px 14px rgba(47, 125, 103, 0.35)',
                    }}
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
                    className="btn btn-outline"
                    style={{
                      padding: '0.85rem 1.5rem',
                      fontSize: '0.98rem',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span>View Live Impact</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectRole('coordinator')}
                    className="btn btn-primary"
                    style={{
                      padding: '0.85rem 1.85rem',
                      fontSize: '0.98rem',
                      boxShadow: '0 4px 14px rgba(47, 125, 103, 0.35)',
                    }}
                  >
                    <span>Open Allocation Desk</span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    onClick={onOpenAuth}
                    className="btn btn-outline"
                    style={{
                      padding: '0.85rem 1.5rem',
                      fontSize: '0.98rem',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <span>Sign In / Register</span>
                  </button>
                </>
              )}
            </div>

            
          </div>

          {/* RIGHT: Creative Interactive Live AI Match Card */}
          <div style={{ position: 'relative' }}>
            {/* Floating Top Badge */}
            <div className="floating-chip floating-chip-top">
              <Leaf size={14} color="#15803D" />
              <span>🌱 1,240 kg CO₂ Prevented</span>
            </div>

            {/* Floating Bottom Badge */}
            <div className="floating-chip floating-chip-bottom">
              <Clock size={14} color="var(--color-network-green)" />
              <span>⚡ Transit Time: {currentScenario.transitTime}</span>
            </div>

            {/* Main Interactive Dispatch Radar Card */}
            <div className="dispatch-sim-card">
              {/* Card Header with Interactive Cycle Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid var(--color-soft-border)',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-soft-mint)',
                    color: 'var(--color-network-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--color-deep-forest)' }}>
                      AI Match In Progress
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>
                      {currentScenario.badge}
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-soft-mint)',
                  color: 'var(--color-network-green)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--color-soft-mint-border)',
                }}>
                  Live Dispatch
                </span>
              </div>

              

              {/* Visual Connected Route Path */}
              <div style={{ position: 'relative', padding: '0.25rem 0' }}>
                {/* Donor Node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-soft-mint)',
                    color: 'var(--color-network-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--color-soft-mint-border)',
                  }}>
                    <Building size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                        {currentScenario.donorName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                        {currentScenario.donorLocation}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--color-dark-slate)', margin: '0.15rem 0 0 0' }}>
                      <strong>{currentScenario.donorItem}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-soft-border)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        color: 'var(--color-muted-slate)',
                      }}>
                        {currentScenario.prepTime}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        backgroundColor: 'var(--color-soft-mint)',
                        border: '1px solid var(--color-soft-mint-border)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        color: 'var(--color-network-green)',
                        fontWeight: 600,
                      }}>
                        {currentScenario.donorStorage}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Animated Connecting Dispatch Track */}
                <div style={{
                  margin: '0.25rem 0 0.85rem 15px',
                  paddingLeft: '1.25rem',
                  borderLeft: '2px dashed var(--color-network-green)',
                  position: 'relative',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'var(--color-pale-neutral)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    color: 'var(--color-dark-slate)',
                    width: 'fit-content',
                  }}>
                    <Truck size={14} color="var(--color-network-green)" />
                    <span>Estimated transit: <strong>{currentScenario.transitTime}</strong> ({currentScenario.safeWindow})</span>
                  </div>
                </div>

                {/* NGO Recipient Node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #FDE68A',
                  }}>
                    <Soup size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                        {currentScenario.ngoName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                        {currentScenario.ngoLocation}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--color-dark-slate)', margin: '0.15rem 0 0 0' }}>
                      <strong>{currentScenario.ngoNeed}</strong> &bull; {currentScenario.ngoReason}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Explainable Reason Code Chips */}
              <div style={{
                display: 'flex',
                gap: '0.35rem',
                flexWrap: 'wrap',
                marginTop: '1.15rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--color-soft-border)',
              }}>
                {currentScenario.reasonCodes.map((code, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--color-soft-mint)',
                      color: 'var(--color-network-green)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--color-soft-mint-border)',
                    }}
                  >
                    ✓ {code}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Confirmed Impact Metric Cards Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1rem',
          marginTop: '2.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Card 1: Delivered Meals */}
          <div className="hero-stat-card">
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivered Meals
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-network-green)', margin: '0.2rem 0 0.15rem 0' }}>
                {metrics.totalDeliveredMeals || 184}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                Nourishing community tables
              </span>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-network-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Soup size={18} />
            </div>
          </div>

          {/* Card 2: Active Surplus Offers */}
          <div className="hero-stat-card">
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Surplus Offers
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', margin: '0.2rem 0 0.15rem 0' }}>
                {metrics.activeDonationsCount || 6}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-network-green)', fontWeight: 600 }}>
                • Ready for dispatch now
              </span>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-pale-neutral)',
              color: 'var(--color-deep-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Building size={18} />
            </div>
          </div>

          {/* Card 3: Open Demands */}
          <div className="hero-stat-card">
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Shelter Intake Needs
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', margin: '0.2rem 0 0.15rem 0' }}>
                {metrics.openDemandsCount || 5}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                Registered pantry centers
              </span>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Heart size={18} />
            </div>
          </div>

          {/* Card 4: Environmental Savings */}
          <div className="hero-stat-card">
            <div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Landfill Waste Avoided
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F766E', margin: '0.2rem 0 0.15rem 0' }}>
                {metrics.environmentalEstimates?.kgFoodSaved || 82} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>kg</span>
              </p>
              <span style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 600 }}>
                Direct ESG certified offset
              </span>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F0FDFA',
              color: '#0F766E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Leaf size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* THE 3-STEP OPERATIONS JOURNEY */}
      <section style={{ marginBottom: '3.75rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-soft-mint)',
            color: 'var(--color-network-green)',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}>
            <Sparkles size={13} />
            <span>EXPLAINABLE RESCUE LIFECYCLE</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--color-deep-forest)', fontWeight: 800 }}>
            How RescueBite Works
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-muted-slate)', maxWidth: '600px', margin: '0.35rem auto 0 auto' }}>
            A dependable, rule-constrained pipeline replacing ad-hoc phone calls and food spoilage.
          </p>
        </div>

        <div className="operations-steps-grid">
          {/* Step 1 */}
          <div className="step-card-connected">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-soft-mint)',
                color: 'var(--color-network-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Building size={22} />
              </div>
              <span style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--color-soft-mint-border)',
                fontFamily: 'monospace',
              }}>
                01
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              1. List Surplus in Seconds
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Donors publish surplus listings with meal count, preparation timestamp, safe storage requirements (refrigerated, hot holding), and exact pickup deadlines.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • 10-sec listing form
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • Auto expiry timer
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card-connected">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-soft-mint)',
                color: 'var(--color-network-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sparkles size={22} />
              </div>
              <span style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--color-soft-mint-border)',
                fontFamily: 'monospace',
              }}>
                02
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              2. Match Local Need with AI
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The constraint-aware engine ranks feasible matches using demand fit (35%), deadline urgency (25%), travel proximity (20%), and storage capacity (20%), with explainable reason codes.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • Multi-factor ranking
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • Cold-chain safety check
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card-connected">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-soft-mint)',
                color: 'var(--color-network-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Truck size={22} />
              </div>
              <span style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--color-soft-mint-border)',
                fontFamily: 'monospace',
              }}>
                03
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              3. Confirm & Deliver Safely
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The coordinator approves allocations, the NGO accepts or rejects, and pickup and delivery milestones are timestamped into a tamper-proof audit trail for ESG reporting.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • 1-Click approval
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--color-pale-neutral)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--color-dark-slate)', fontWeight: 500 }}>
                • Tamper-proof logs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE ROLE EXPLORER SHOWCASE */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-soft-border)',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-subtle)',
        marginBottom: '3.75rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', color: 'var(--color-deep-forest)', fontWeight: 800 }}>
            Dedicated Workspaces for Every Partner
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
            Choose your role to explore features tailored specifically for your operational workflow:
          </p>

          {/* Role Selector Tabs */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-pale-neutral)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-pill)',
            gap: '0.35rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <button
              type="button"
              onClick={() => setActiveRoleTab('donor')}
              className={`interactive-tab-btn ${activeRoleTab === 'donor' ? 'active' : ''}`}
            >
              <Building size={16} />
              <span>Food Donors</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab('coordinator')}
              className={`interactive-tab-btn ${activeRoleTab === 'coordinator' ? 'active' : ''}`}
            >
              <ShieldCheck size={16} />
              <span>Operations Coordinators</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab('ngo')}
              className={`interactive-tab-btn ${activeRoleTab === 'ngo' ? 'active' : ''}`}
            >
              <Soup size={16} />
              <span>Recipient NGOs</span>
            </button>
          </div>
        </div>

        {/* Dynamic Role Content Card */}
        <div style={{
          backgroundColor: 'var(--color-pale-neutral)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-soft-border)',
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '2rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-soft-mint)', color: 'var(--color-network-green)', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              {activeRoleTab === 'donor' && 'RESTAURANTS • CATERERS • GROCERS'}
              {activeRoleTab === 'coordinator' && 'CITY LOGISTICS DISPATCH COMMAND'}
              {activeRoleTab === 'ngo' && 'COMMUNITY SHELTERS • FOOD PANTRIES'}
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginBottom: '0.75rem' }}>
              {activeRoleTab === 'donor' && 'List Surplus in Seconds & Track Impact'}
              {activeRoleTab === 'coordinator' && '3-Column AI Allocation Command Center'}
              {activeRoleTab === 'ngo' && 'Predictive Demand & Instant Offer Acceptance'}
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {activeRoleTab === 'donor' && 'Turn unsold wholesome food into verified community meals. Real-time notifications tell you when a coordinator approves an allocation and when drivers are dispatched.'}
              {activeRoleTab === 'coordinator' && 'Review prioritized surplus matches, verify cold-chain travel windows, and approve allocations in a single click with human-in-the-loop oversight.'}
              {activeRoleTab === 'ngo' && 'Never worry about dinner shortages. Submit your meal quotas, view incoming matching food items, and verify dietary suitability with full transparency.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {activeRoleTab === 'donor' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Instant surplus posting with hot/cold storage tags</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Countdown timers before safety expiration</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Automatic tax deduction & ESG impact summary</span>
                  </div>
                </>
              )}

              {activeRoleTab === 'coordinator' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Ranked recommendations sorted by urgency and route fit</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Live constraint verification (dietary, temperature, transit)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Direct driver allocation and audit logging</span>
                  </div>
                </>
              )}

              {activeRoleTab === 'ngo' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>AI-forecasted meal demand based on historical intake</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>1-Tap allocation acceptance or reasoned rejection</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-dark-slate)' }}>
                    <CheckCircle2 size={16} color="var(--color-network-green)" />
                    <span>Delivery milestone tracking with estimated arrival</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onSelectRole(activeRoleTab)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem' }}
            >
              <span>
                {activeRoleTab === 'donor' && 'Launch Donor Portal'}
                {activeRoleTab === 'coordinator' && 'Launch Allocation Desk'}
                {activeRoleTab === 'ngo' && 'Launch NGO Portal'}
              </span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Interactive Visual Snapshot for selected role */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-soft-border)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-soft-border)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                {activeRoleTab === 'donor' && 'Active Surplus Listings'}
                {activeRoleTab === 'coordinator' && 'Live Priority Queue'}
                {activeRoleTab === 'ngo' && 'Active Intake Quotas'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-network-green)', fontWeight: 600 }}>
                ● Real-time Sync
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-pale-neutral)', borderRadius: '6px', border: '1px solid var(--color-soft-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span>Fresh Prepared Main Entrees</span>
                  <span style={{ color: 'var(--color-network-green)' }}>45 Meals</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                  <span>Hot Holding (&gt;60°C)</span>
                  <span>Pickup: Within 45m</span>
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-pale-neutral)', borderRadius: '6px', border: '1px solid var(--color-soft-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span>Assorted Artisan Breads & Pastries</span>
                  <span style={{ color: 'var(--color-network-green)' }}>60 Items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                  <span>Ambient Safe Storage</span>
                  <span>Pickup: Today, 6:00 PM</span>
                </div>
              </div>

              <div style={{ padding: '0.65rem', backgroundColor: 'var(--color-soft-mint)', borderRadius: '6px', border: '1px dashed var(--color-network-green)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-network-green)', fontWeight: 600 }}>
                ✓ AI matched with nearest shelter in 0.4 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE IMPACT ESTIMATOR MINI-WIDGET */}
      <section style={{
        backgroundColor: 'var(--color-pale-neutral)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-soft-border)',
        padding: '2.5rem 2rem',
        marginBottom: '3.75rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-soft-mint)',
            color: 'var(--color-network-green)',
            fontSize: '0.76rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}>
            <Sliders size={13} />
            <span>INTERACTIVE CALCULATOR</span>
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', color: 'var(--color-deep-forest)', fontWeight: 800 }}>
            Estimate Your Community & Environmental Impact
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
            Select your regular surplus meal volume to see what you could prevent and nourish:
          </p>

          {/* Quick Select Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[25, 50, 100, 250, 500].map((meals) => (
              <button
                key={meals}
                type="button"
                onClick={() => setCalculatorMeals(meals)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-pill)',
                  border: `2px solid ${calculatorMeals === meals ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                  backgroundColor: calculatorMeals === meals ? 'var(--color-network-green)' : '#FFFFFF',
                  color: calculatorMeals === meals ? '#FFFFFF' : 'var(--color-dark-slate)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {meals} Meals / Day
              </button>
            ))}
          </div>
        </div>

        {/* Impact Calculations 4-Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '1rem',
        }}>
          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-soft-border)', textAlign: 'center' }}>
            <Soup size={22} color="var(--color-network-green)" style={{ margin: '0 auto 0.4rem auto' }} />
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-network-green)', margin: 0 }}>
              {calculatorMeals}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: '0.2rem 0 0 0' }}>
              Hungry Neighbours Fed
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-soft-border)', textAlign: 'center' }}>
            <Leaf size={22} color="#0F766E" style={{ margin: '0 auto 0.4rem auto' }} />
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F766E', margin: 0 }}>
              {kgFood} <span style={{ fontSize: '0.85rem' }}>kg</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: '0.2rem 0 0 0' }}>
              Edible Food Kept Out of Landfill
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-soft-border)', textAlign: 'center' }}>
            <Sparkles size={22} color="var(--color-deep-forest)" style={{ margin: '0 auto 0.4rem auto' }} />
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-deep-forest)', margin: 0 }}>
              {co2Avoided} <span style={{ fontSize: '0.85rem' }}>kg</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: '0.2rem 0 0 0' }}>
              Greenhouse CO₂e Prevented
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-soft-border)', textAlign: 'center' }}>
            <Droplet size={22} color="#2563EB" style={{ margin: '0 auto 0.4rem auto' }} />
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', margin: 0 }}>
              {waterSaved.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>L</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: '0.2rem 0 0 0' }}>
              Embedded Water Conserved
            </p>
          </div>
        </div>
      </section>

      {/* COMMUNITY TESTIMONIAL BANNER */}
      <section style={{
        backgroundColor: 'var(--color-deep-forest)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          backgroundColor: 'rgba(47, 125, 103, 0.25)',
          pointerEvents: 'none',
        }} />

        <Sprout size={36} color="var(--color-soft-mint)" style={{ margin: '0 auto 0.75rem auto' }} />
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.3rem)',
          fontWeight: 600,
          fontStyle: 'italic',
          maxWidth: '780px',
          margin: '0 auto 1.25rem auto',
          lineHeight: 1.6,
          color: '#EAF4EC',
        }}>
          &ldquo;RescueBite replaced chaotic last-minute phone calls with predictable, safe meal arrivals. Our kitchen team can now focus entirely on serving our community.&rdquo;
        </p>
        <p style={{ fontSize: '0.85rem', color: '#A5B5AE', margin: 0 }}>
          &mdash; <strong>Maria Santos</strong>, Program Director at Hope Community Kitchen
        </p>
      </section>
    </div>
  );
}
