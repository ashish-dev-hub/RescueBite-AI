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

          {/* RIGHT: Tactile Floating Cards with 12-min circle clearly in-between */}
          <div className="hero-cards-stack">
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

            {/* 12-min Circle Connector clearly BETWEEN donor and shelter cards */}
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
