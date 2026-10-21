import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart3,
  TrendingUp,
  Award,
  Leaf,
  Clock,
  CheckCircle2,
  HelpCircle,
  Truck,
  Sparkles,
  Info,
  RefreshCw,
  Building,
  Soup,
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
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-soft-mint-border)',
            }}>
              Transparent Outcomes
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
            Confirmed deliveries, logistics efficiency, and transparently calculated environmental savings.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="btn btn-outline btn-sm"
          title="Refresh Metrics"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="impact-metrics-grid">
        {/* Metric 1 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid var(--color-network-green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
              Confirmed Meals Delivered
            </span>
            <CheckCircle2 size={18} color="var(--color-network-green)" />
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-deep-forest)', lineHeight: 1 }}>
            {metrics.totalDeliveredMeals}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '0.5rem' }}>
            Excludes proposed listings; strictly confirmed received by recipient NGOs.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #0D9488' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
              Dispatch Fulfilment Rate
            </span>
            <TrendingUp size={18} color="#0D9488" />
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0D9488', lineHeight: 1 }}>
            {metrics.totalApprovedMeals > 0 ? `${metrics.fulfilmentRate}%` : '0%'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '0.5rem' }}>
            Delivered quantity ÷ coordinator approved quantity (zero-denominator safe).
          </p>
        </div>

        {/* Metric 3 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
              On-Time Delivery Rate
            </span>
            <Clock size={18} color="#3B82F6" />
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1 }}>
            {metrics.totalDeliveredMeals > 0 ? `${metrics.onTimeDeliveryRate}%` : '0%'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '0.5rem' }}>
            Deliveries confirmed prior to food deterioration pickup deadlines.
          </p>
        </div>

        {/* Metric 4 */}
        <div className="fresh-card" style={{ borderLeft: '4px solid #15803D' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
              Food Waste Avoided (Est.)
            </span>
            <Leaf size={18} color="#15803D" />
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#15803D', lineHeight: 1 }}>
            {metrics.environmentalEstimates?.kgFoodSaved ?? 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>kg</span>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '0.5rem' }}>
            ~{metrics.environmentalEstimates?.co2KgAvoided ?? 0} kg CO₂e offset (methodology below).
          </p>
        </div>
      </div>

      {/* Methodology & Uncertainty Transparency Box */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-pale-neutral)',
        border: '1px solid var(--color-soft-border)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
      }}>
        <Info size={20} color="var(--color-network-green)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div>
          <h4 style={{ fontSize: '0.92rem', color: 'var(--color-deep-forest)', marginBottom: '0.25rem' }}>
            Calculation Methodology & Data Standards
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', lineHeight: 1.5 }}>
            RescueBite AI prioritizes honesty over inflated metrics. Environmental savings are calculated strictly on
            delivered meals (not simply listed food). We use the established baseline factor of <strong>0.45 kg edible mass per standard meal</strong>,
            and an average greenhouse gas prevention factor of <strong>1.2 kg CO₂e avoided per kg food rescued</strong> (UNEP / WRAP research).
            Values are labeled as estimates due to ingredient density variations.
          </p>
        </div>
      </div>

      {/* Recent Confirmed Delivery Log */}
      <div className="fresh-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-forest)', marginBottom: '1rem' }}>
          Recent Network Handover Activity
        </h3>

        <div className="data-table-wrapper">
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No recorded activity yet.
                  </td>
                </tr>
              ) : (
                recentActivity.map((act) => (
                  <tr key={act._id}>
                    <td>
                      <strong>{act.donationId?.foodName || 'Rescue Food'}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                        Donor: {act.donationId?.donorName || 'Local Partner'}
                      </p>
                    </td>
                    <td>
                      <strong>{act.ngoId?.name || 'Community Kitchen'}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                        {act.ngoId?.organization}
                      </p>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-network-green)', fontSize: '0.95rem' }}>
                        {act.approvedMeals} meals
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={act.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
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
