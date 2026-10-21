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
} from 'lucide-react';

export default function LandingPage({ onSelectRole, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState({
    totalDeliveredMeals: 0,
    activeDonationsCount: 0,
    openDemandsCount: 0,
    fulfilmentRate: 0,
    environmentalEstimates: { kgFoodSaved: 0, co2KgAvoided: 0 },
  });

  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const data = await api.getAnalyticsOverview();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        // Fallback to baseline metrics
      }
    };
    fetchLiveMetrics();
  }, []);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <section className="hero-section">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.85rem',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-soft-mint)',
          border: '1px solid var(--color-soft-mint-border)',
          color: 'var(--color-network-green)',
          fontSize: '0.82rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
        }}>
          <Leaf size={14} />
          <span>The Fresh Network • Intelligent Food Rescue</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 4.5vw, 3.4rem)',
          fontWeight: 800,
          color: 'var(--color-deep-forest)',
          letterSpacing: '-0.03em',
          maxWidth: '850px',
          margin: '0 auto 1.25rem auto',
          lineHeight: 1.15,
        }}>
          Good food. Better routes. Stronger communities.
        </h1>

        <p style={{
          fontSize: 'clamp(0.9rem, 1.8vw, 1.15rem)',
          color: 'var(--color-muted-slate)',
          maxWidth: '680px',
          margin: '0 auto 2rem auto',
          lineHeight: 1.6,
        }}>
          RescueBite AI bridges the gap between commercial food surplus and neighborhood meal programs.
          Predict demand, match safe surplus within transit windows, and coordinate human-approved allocations.
        </p>

        <div className="hero-cta-buttons">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => onSelectRole(user?.role === 'coordinator' ? 'coordinator' : user?.role === 'donor' ? 'donor' : 'ngo')}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
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
                style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
              >
                <span>View Live Impact</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSelectRole('coordinator')}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
              >
                <span>Open Allocation Desk</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={onOpenAuth}
                className="btn btn-outline"
                style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', backgroundColor: '#FFFFFF' }}
              >
                <span>Sign In / Register</span>
              </button>
            </>
          )}
        </div>

        {/* Live Confirmed Impact Bar */}
        <div className="hero-stats-grid">
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', fontWeight: 600, textTransform: 'uppercase' }}>
              Delivered Meals
            </p>
            <p className="hero-stats-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-network-green)', marginTop: '0.15rem' }}>
              {metrics.totalDeliveredMeals} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>meals</span>
            </p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Surplus Offers
            </p>
            <p className="hero-stats-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.15rem' }}>
              {metrics.activeDonationsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>listings</span>
            </p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', fontWeight: 600, textTransform: 'uppercase' }}>
              Open NGO Demands
            </p>
            <p className="hero-stats-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.15rem' }}>
              {metrics.openDemandsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>shelters</span>
            </p>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', fontWeight: 600, textTransform: 'uppercase' }}>
              Waste Avoided (Est.)
            </p>
            <p className="hero-stats-value" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F766E', marginTop: '0.15rem' }}>
              {metrics.environmentalEstimates?.kgFoodSaved ?? 0} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kg saved</span>
            </p>
          </div>
        </div>
      </section>

      {/* The 3-Step Operations Flow */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', color: 'var(--color-deep-forest)' }}>
            How RescueBite Works
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
            A dependable, rule-constrained pipeline replacing ad-hoc phone calls and food spoilage.
          </p>
        </div>

        <div className="operations-steps-grid">
          {/* Step 1 */}
          <div className="fresh-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-network-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Building size={22} />
            </div>
            <span style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#DCE5DD',
            }}>
              01
            </span>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>1. List Surplus Food</h3>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              Donors publish surplus listings with meal count, preparation timestamp, safe storage requirements (refrigerated, hot holding), and exact pickup deadlines.
            </p>
          </div>

          {/* Step 2 */}
          <div className="fresh-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-network-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Sparkles size={22} />
            </div>
            <span style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#DCE5DD',
            }}>
              02
            </span>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>2. Match Local Need</h3>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              The constraint-aware engine ranks feasible matches using demand fit (35%), deadline urgency (25%), travel proximity (20%), and storage capacity (20%), providing explainable reason codes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="fresh-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-network-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Truck size={22} />
            </div>
            <span style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#DCE5DD',
            }}>
              03
            </span>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>3. Confirm Delivery</h3>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              The coordinator approves allocations, the NGO accepts or rejects, and the pickup and delivery milestones are timestamped into a tamper-proof audit trail for impact reporting.
            </p>
          </div>
        </div>
      </section>

      {/* Role Portals Showcase */}
      <section className="portals-showcase-section">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', color: 'var(--color-deep-forest)' }}>
            Dedicated Workspaces for Every Partner
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
            Explore how each role interacts with RescueBite AI:
          </p>
        </div>

        <div className="portals-cards-grid">
          {/* Coordinator Card */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-soft-border)',
            backgroundColor: 'var(--color-pale-neutral)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} color="var(--color-network-green)" />
                <h4 style={{ fontSize: '1.1rem' }}>Coordinator Allocation Desk</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-slate)', lineHeight: 1.5, marginBottom: '1rem' }}>
                A 3-column command center: prioritized queue of urgent surplus, center workspace for quantity review, and constraint checklist preventing over-allocation.
              </p>
            </div>
            <button
              onClick={() => onSelectRole('coordinator')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span>Open Allocation Desk</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Donor Card */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-soft-border)',
            backgroundColor: 'var(--color-pale-neutral)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Building size={20} color="var(--color-network-green)" />
                <h4 style={{ fontSize: '1.1rem' }}>Food Donor Portal</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-slate)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Restaurants and groceries publish surplus food in seconds. Track remaining quantities, pickup countdowns, and allocated recipients with live updates.
              </p>
            </div>
            <button
              onClick={() => onSelectRole('donor')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span>Open Donor Portal</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* NGO Card */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-soft-border)',
            backgroundColor: 'var(--color-pale-neutral)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Soup size={20} color="var(--color-network-green)" />
                <h4 style={{ fontSize: '1.1rem' }}>Recipient NGO Portal</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-slate)', lineHeight: 1.5, marginBottom: '1rem' }}>
                Community shelters submit exact meal requirements, view matched surplus with explainable reason codes, and accept or reject offers in one tap.
              </p>
            </div>
            <button
              onClick={() => onSelectRole('ngo')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <span>Open NGO Portal</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
