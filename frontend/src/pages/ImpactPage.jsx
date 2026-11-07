import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  TrendingUp,
  Leaf,
  Clock,
  CheckCircle2,
  Info,
  RefreshCw,
} from 'lucide-react';

export default function ImpactPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const metrics = data?.metrics || {
    totalDeliveredMeals: 0,
    totalApprovedMeals: 0,
    fulfilmentRate: 0,
    demandCoverageRate: 0,
    onTimeDeliveryRate: 0,
    activeDonationsCount: 0,
    openDemandsCount: 0,
    environmentalEstimates: {
      kgFoodSaved: 0,
      co2KgAvoided: 0,
      methodologyNotes: 'Estimated based on 0.45 kg/meal food mass and 1.2 kg CO2e/kg food waste avoided.',
    },
  };

  const recentActivity = data?.recentActivity || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-deep-forest)' }}>
              Community Impact & Accountability
            </h1>
            <span style={{
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-network-green)',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-soft-mint-border)',
            }}>
              Transparent Outcomes
            </span>
          </div>
          <p style={{ fontSize: '0.92rem', color: '#382C25', marginTop: '0.25rem', fontWeight: 500 }}>
            Confirmed deliveries, logistics efficiency, and transparently calculated environmental savings.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="btn btn-outline btn-sm"
          title="Refresh Metrics"
          style={{ minHeight: '44px', padding: '0.55rem 1.15rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="impact-metrics-grid">
        {/* Metric 1 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #1F6F43' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Confirmed Meals Delivered
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#E3F2E7',
              color: '#1F6F43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1F6F43', lineHeight: 1, margin: '0.25rem 0' }}>
            {metrics.totalDeliveredMeals}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#382C25', marginTop: '0.5rem', lineHeight: 1.45, fontWeight: 500 }}>
            Excludes proposed listings; strictly confirmed received by recipient NGOs.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #C44824' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Dispatch Fulfilment Rate
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FDEEE9',
              color: '#C44824',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#C44824', lineHeight: 1, margin: '0.25rem 0' }}>
            {metrics.totalApprovedMeals > 0 ? `${metrics.fulfilmentRate}%` : '0%'}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#382C25', marginTop: '0.5rem', lineHeight: 1.45, fontWeight: 500 }}>
            Delivered quantity ÷ coordinator approved quantity (zero-denominator safe).
          </p>
        </div>

        {/* Metric 3 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              On-Time Delivery Rate
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Clock size={18} />
            </div>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#D97706', lineHeight: 1, margin: '0.25rem 0' }}>
            {metrics.totalDeliveredMeals > 0 ? `${metrics.onTimeDeliveryRate}%` : '0%'}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#382C25', marginTop: '0.5rem', lineHeight: 1.45, fontWeight: 500 }}>
            Deliveries confirmed prior to food deterioration pickup deadlines.
          </p>
        </div>

        {/* Metric 4 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #1F6F43' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Food Waste Avoided (Est.)
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#E3F2E7',
              color: '#1F6F43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Leaf size={18} />
            </div>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1F6F43', lineHeight: 1, margin: '0.25rem 0' }}>
            {metrics.environmentalEstimates?.kgFoodSaved ?? 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>kg</span>
          </p>
          <p style={{ fontSize: '0.82rem', color: '#382C25', marginTop: '0.5rem', lineHeight: 1.45, fontWeight: 500 }}>
            ~{metrics.environmentalEstimates?.co2KgAvoided ?? 0} kg CO₂e offset (methodology below).
          </p>
        </div>
      </div>

      {/* Methodology & Uncertainty Transparency Box */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg, 16px)',
        backgroundColor: '#FFFDF9',
        border: '1.5px solid #E5DBC5',
        boxShadow: '0 2px 6px rgba(44, 34, 30, 0.04)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#E3F2E7',
          color: '#1F6F43',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '0.1rem',
        }}>
          <Info size={20} />
        </div>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1613', marginBottom: '0.35rem' }}>
            Calculation Methodology & Data Standards
          </h4>
          <p style={{ fontSize: '0.86rem', color: '#2C221E', lineHeight: 1.6, margin: 0 }}>
            RescueBite AI prioritizes honesty over inflated metrics. Environmental savings are calculated strictly on
            delivered meals (not simply listed food). We use the established baseline factor of <strong style={{ color: '#1F6F43', fontWeight: 700 }}>0.45 kg edible mass per standard meal</strong>,
            and an average greenhouse gas prevention factor of <strong style={{ color: '#1F6F43', fontWeight: 700 }}>1.2 kg CO₂e avoided per kg food rescued</strong> (UNEP / WRAP research).
            Values are labeled as estimates due to ingredient density variations.
          </p>
        </div>
      </div>

      {/* Recent Confirmed Delivery Log */}
      <div className="fresh-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1613', marginBottom: '1rem' }}>
          Recent Network Handover Activity
        </h3>

        <div className="data-table-wrapper">
          <div className="table-scroll-hint">
            <span>&larr; Swipe horizontally to view full audit ledger &rarr;</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Surplus Food</th>
                <th>Recipient Community</th>
                <th>Delivered Meals</th>
                <th>Status</th>
                <th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <p style={{ fontSize: '0.98rem', fontWeight: 700, color: '#2C221E', margin: 0 }}>
                      No recorded delivery activity yet
                    </p>
                    <p style={{ fontSize: '0.84rem', color: '#4A3E37', marginTop: '0.35rem', marginBottom: 0 }}>
                      Delivered allocations confirmed by recipient NGOs will appear in this public accountability ledger.
                    </p>
                  </td>
                </tr>
              ) : (
                recentActivity.map((act) => (
                  <tr key={act._id}>
                    <td>
                      <strong style={{ color: '#1C1613', fontSize: '0.92rem' }}>
                        {act.donationId?.foodName || 'Rescue Food'}
                      </strong>
                      <p style={{ fontSize: '0.78rem', color: '#382C25', margin: '0.15rem 0 0 0', fontWeight: 500 }}>
                        Donor: {act.donationId?.donorName || 'Local Partner'}
                      </p>
                    </td>
                    <td>
                      <strong style={{ color: '#1C1613', fontSize: '0.92rem' }}>
                        {act.ngoId?.name || 'Community Kitchen'}
                      </strong>
                      <p style={{ fontSize: '0.78rem', color: '#382C25', margin: '0.15rem 0 0 0', fontWeight: 500 }}>
                        {act.ngoId?.organization}
                      </p>
                    </td>
                    <td>
                      <strong style={{ color: '#1F6F43', fontSize: '0.98rem', fontWeight: 800 }}>
                        {act.approvedMeals} meals
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={act.status} />
                    </td>
                    <td style={{ fontSize: '0.84rem', color: '#382C25', fontWeight: 600 }}>
                      {new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
