import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ReasonCodeBadge from '../components/ReasonCodeBadge';
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  Sliders,
  ArrowRight,
  PackageCheck,
  Truck,
  Check,
  X,
  Layers,
  ChevronRight,
  Calendar,
  Building,
  Soup,
  Sparkles,
} from 'lucide-react';

export default function CoordinatorDesk() {
  const [recommendations, setRecommendations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [approvedQty, setApprovedQty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('desk'); // 'desk' | 'lifecycle'
  const [notification, setNotification] = useState(null);

  const fetchDeskData = async () => {
    setLoading(true);
    try {
      const [recData, allocData] = await Promise.all([
        api.getRecommendations(),
        api.getAllocations(),
      ]);

      const recs = recData.recommendations || [];
      setRecommendations(recs);
      setAllocations(allocData.allocations || []);

      if (recs.length > 0) {
        setSelectedMatch(recs[0]);
        setApprovedQty(recs[0].recommendedMeals);
      } else {
        setSelectedMatch(null);
      }
    } catch (err) {
      console.error('Error loading allocation desk:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeskData();
  }, []);

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setApprovedQty(match.recommendedMeals);
  };

  const handleApproveAllocation = async () => {
    if (!selectedMatch) return;
    setActionLoading(true);
    setNotification(null);

    try {
      await api.createAllocation({
        donationId: selectedMatch.donationId,
        ngoId: selectedMatch.ngoId,
        demandId: selectedMatch.demandId,
        recommendedMeals: selectedMatch.recommendedMeals,
        approvedMeals: approvedQty,
        score: selectedMatch.score,
        reasonCodes: selectedMatch.reasonCodes,
        notes: `Coordinator verified: ${approvedQty} meals matched via Allocation Desk.`,
      });

      setNotification({
        type: 'success',
        message: `Successfully allocated ${approvedQty} meals to ${selectedMatch.ngo?.name || 'NGO'}!`,
      });

      // Refresh data
      await fetchDeskData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to approve allocation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (allocId, nextStatus) => {
    setActionLoading(true);
    try {
      await api.updateAllocationStatus(allocId, nextStatus);
      setNotification({
        type: 'success',
        message: `Status updated to '${nextStatus.replace('_', ' ')}'`,
      });
      await fetchDeskData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Status transition failed',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Desk Header */}
      <div className="desk-header">
        <div>
          <div className="desk-title-group">
            <h1 className="desk-title">
              Operations Allocation Desk
            </h1>
            <span className="desk-badge">
              Live Dispatch Mode
            </span>
          </div>
          <p className="desk-subtitle">
            Review algorithmic matches, enforce food-safety rules, and approve surplus distribution.
          </p>
        </div>

        <div className="desk-controls">
          <div className="desk-tabs-bar">
            <button
              onClick={() => setActiveTab('desk')}
              className={`desk-tab-btn ${activeTab === 'desk' ? 'active' : ''}`}
            >
              Match Desk ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveTab('lifecycle')}
              className={`desk-tab-btn ${activeTab === 'lifecycle' ? 'active' : ''}`}
            >
              Active Allocations ({allocations.length})
            </button>
          </div>

          <button
            onClick={fetchDeskData}
            disabled={loading}
            className="btn btn-outline btn-sm desk-refresh-btn"
            title="Refresh Recommendations"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: notification.type === 'success' ? 'var(--status-available-bg)' : 'var(--status-cancelled-bg)',
          color: notification.type === 'success' ? 'var(--status-available-text)' : 'var(--status-cancelled-text)',
          border: `1px solid ${notification.type === 'success' ? '#CBE5D3' : '#FECACA'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1.25rem',
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {activeTab === 'desk' ? (
        /* The 3-Column Allocation Desk Layout */
        <div className="allocation-desk-grid">
          {/* Column 1: Prioritized Recommendation Queue */}
          <div className="fresh-card allocation-queue-card">
            <div className="allocation-queue-header">
              <div>
                <h3 style={{ fontSize: '0.92rem', color: 'var(--color-deep-forest)', fontWeight: 700 }}>
                  PRIORITIZED MATCH QUEUE
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                  Ranked by demand, deadline, & travel
                </p>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-network-green)',
                backgroundColor: 'var(--color-soft-mint)',
                padding: '0.15rem 0.55rem',
                borderRadius: 'var(--radius-xs)',
                whiteSpace: 'nowrap',
              }}>
                {recommendations.length} Pending
              </span>
            </div>

            <div className="allocation-queue-list">
              {recommendations.length === 0 ? (
                <div className="allocation-queue-empty">
                  <Sparkles size={28} color="var(--color-network-green)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>All matched food allocated!</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                    No pending unassigned surplus currently exceeds constraints. Real-time engine listens for new donations.
                  </p>
                </div>
              ) : (
                recommendations.map((match, idx) => {
                  const isSelected = selectedMatch?.donationId === match.donationId && selectedMatch?.ngoId === match.ngoId;
                  const isUrgent = match.hoursUntilDeadline <= 6;

                  return (
                    <div
                      key={`${match.donationId}-${match.ngoId}-${idx}`}
                      onClick={() => handleSelectMatch(match)}
                      style={{
                        padding: '1rem 1.15rem',
                        borderBottom: '1px solid var(--color-soft-border)',
                        backgroundColor: isSelected ? 'var(--color-soft-mint)' : '#FFFFFF',
                        borderLeft: isSelected ? '4px solid var(--color-network-green)' : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isUrgent ? 'var(--color-harvest-coral)' : 'var(--color-network-green)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          {isUrgent && <AlertTriangle size={12} />}
                          {match.hoursUntilDeadline}h deadline
                        </span>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: 'var(--color-deep-forest)',
                          backgroundColor: '#FFFFFF',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--color-soft-border)',
                        }}>
                          {match.score}% Match
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.92rem', color: 'var(--color-deep-forest)', marginBottom: '0.2rem' }}>
                        {match.donation?.foodName}
                      </h4>

                      <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', marginBottom: '0.45rem' }}>
                        From <strong>{match.donation?.donorOrg || match.donation?.donorName}</strong> → To <strong>{match.ngo?.name}</strong>
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-deep-forest)' }}>
                          {match.recommendedMeals} Meals feasible
                        </span>
                        <span style={{ color: 'var(--color-muted-slate)' }}>
                          ~{match.distanceKm} km away
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {match.reasonCodes.slice(0, 2).map((code) => (
                          <ReasonCodeBadge key={code} code={code} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Selected Match Center Workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {selectedMatch ? (
              <div className="fresh-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--color-soft-border)',
                    marginBottom: '1.25rem',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-network-green)', textTransform: 'uppercase' }}>
                        CANDIDATE ALLOCATION PAIR
                      </span>
                      <h2 style={{ fontSize: '1.35rem', color: 'var(--color-deep-forest)', marginTop: '0.15rem' }}>
                        {selectedMatch.donation?.foodName}
                      </h2>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Overall Match Score</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-network-green)', lineHeight: 1 }}>
                        {selectedMatch.score}<span style={{ fontSize: '0.9rem' }}>/100</span>
                      </p>
                    </div>
                  </div>

                  {/* Donor & Recipient Comparison Box */}
                  <div className="desk-comparison-grid" style={{
                    backgroundColor: 'var(--color-pale-neutral)',
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-soft-border)',
                    marginBottom: '1.25rem',
                  }}>
                    {/* Donor Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <Building size={16} color="var(--color-network-green)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
                          FOOD DONOR
                        </span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                        {selectedMatch.donation?.donorOrg || selectedMatch.donation?.donorName}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                        {selectedMatch.donation?.location?.address || 'City Center'}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-muted-slate)' }}>Available: </span>
                        <strong style={{ color: 'var(--color-deep-forest)' }}>
                          {selectedMatch.donation?.remainingQuantity} meals
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                        <span>Storage: </span>
                        <strong>{selectedMatch.donation?.storageInfo}</strong>
                      </div>
                    </div>

                    {/* NGO Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <Soup size={16} color="var(--color-network-green)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
                          RECIPIENT NGO
                        </span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                        {selectedMatch.ngo?.name}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                        {selectedMatch.demand?.location?.address || 'Community Hub'}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-muted-slate)' }}>Unfulfilled Need: </span>
                        <strong style={{ color: 'var(--color-deep-forest)' }}>
                          {(selectedMatch.demand?.requestedMeals || 0) - (selectedMatch.demand?.fulfilledMeals || 0)} meals
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                        <span>Intake Capacity: </span>
                        <strong>{selectedMatch.ngo?.receivingCapacity ?? selectedMatch.demand?.receivingCapacity ?? 0} meals</strong>
                      </div>
                    </div>
                  </div>

                  {/* Explainable Reasons & Signals */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-deep-forest)', marginBottom: '0.5rem' }}>
                      ALGORITHM EXPLANATION & REASON CODES:
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      {selectedMatch.reasonCodes.map((code) => (
                        <ReasonCodeBadge key={code} code={code} />
                      ))}
                    </div>

                    {/* Transparent Score Breakdown */}
                    <div className="desk-score-breakdown" style={{
                      textAlign: 'center',
                      backgroundColor: '#FFFFFF',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-soft-border)',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>Demand Fit (35%)</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                          {selectedMatch.scoreBreakdown?.demandFit || 90}%
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>Urgency (25%)</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                          {selectedMatch.scoreBreakdown?.urgency || 85}%
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>Proximity (20%)</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                          {selectedMatch.scoreBreakdown?.proximity || 95}%
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>Capacity (20%)</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                          {selectedMatch.scoreBreakdown?.capacity || 90}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Decision Slider */}
                  <div style={{
                    padding: '1.15rem',
                    backgroundColor: 'var(--color-soft-mint)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-soft-mint-border)',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-deep-forest)' }}>
                        Approved Allocation Quantity:
                      </label>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-network-green)' }}>
                        {approvedQty} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Meals</span>
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max={Math.min(
                        selectedMatch.donation?.remainingQuantity || 1,
                        selectedMatch.ngo?.receivingCapacity || selectedMatch.donation?.remainingQuantity || 1
                      )}
                      value={approvedQty}
                      onChange={(e) => setApprovedQty(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--color-network-green)', cursor: 'pointer' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.35rem' }}>
                      <span>Min: 1 meal</span>
                      <span>
                        Max bound: {Math.min(
                          selectedMatch.donation?.remainingQuantity || 1,
                          selectedMatch.ngo?.receivingCapacity || selectedMatch.donation?.remainingQuantity || 1
                        )} meals
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dispatch & Action Row */}
                <div className="desk-action-bar" style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-soft-border)',
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                    Safety: Recipient temperature inspection applies on delivery.
                  </div>

                  <button
                    onClick={handleApproveAllocation}
                    disabled={actionLoading || approvedQty <= 0}
                    className="btn btn-primary desk-dispatch-btn"
                    style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                  >
                    <CheckCircle2 size={18} />
                    <span>{actionLoading ? 'Allocating...' : `Approve & Dispatch (${approvedQty} Meals)`}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="fresh-card desk-empty-card">
                <ShieldCheck size={40} color="var(--color-network-green)" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Select a Match from Queue</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', maxWidth: '420px', margin: '0 auto' }}>
                  Choose any pending candidate on the left to verify constraint checklists, route feasibility, and approve the meal quantity.
                </p>
              </div>
            )}
          </div>

          {/* Column 3: Hard Constraints & Transit Verification */}
          <div className="allocation-desk-right" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Hard Constraints Box */}
            <div className="fresh-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <ShieldCheck size={18} color="var(--color-network-green)" />
                <h3 style={{ fontSize: '0.95rem', color: 'var(--color-deep-forest)' }}>
                  Hard Constraint Checklist
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginBottom: '1rem' }}>
                Non-negotiable food rescue safety requirements verified server-side:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Active Surplus Listing</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Non-expired, available status</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>No Over-Allocation</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Remaining quantity guarded atomically</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>NGO Capacity Verified</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Within storage intake limits</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Pickup Window Feasible</span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Before food deterioration deadline</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Route & Proximity Context */}
            {selectedMatch && (
              <div className="fresh-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <MapPin size={18} color="var(--color-network-green)" />
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--color-deep-forest)' }}>
                    Transit & Route Context
                  </h3>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-pale-neutral)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Haversine Distance:</span>
                    <strong>{selectedMatch.distanceKm} km</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Est. Transit Time:</span>
                    <strong>~{Math.round(selectedMatch.distanceKm * 2.8)} mins</strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', lineHeight: 1.4 }}>
                  Transport requires insulated thermal bags for hot items or coolers for refrigerated salads.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Allocation Lifecycle Table View */
        <div className="fresh-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Active Allocations Lifecycle</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                Track allocations through Approved → Accepted → In Transit → Delivered
              </p>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Food Item & Donor</th>
                  <th>Recipient NGO</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Approved At</th>
                  <th>Operational Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No allocations created yet.
                    </td>
                  </tr>
                ) : (
                  allocations.map((alloc) => (
                    <tr key={alloc._id}>
                      <td>
                        <strong>{alloc.donationId?.foodName || 'Donation Item'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {alloc.donationId?.donorOrg || alloc.donationId?.donorName}
                        </p>
                      </td>
                      <td>
                        <strong>{alloc.ngoId?.name || 'NGO'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {alloc.ngoId?.organization}
                        </p>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-network-green)' }}>
                          {alloc.approvedMeals} meals
                        </strong>
                      </td>
                      <td>
                        <StatusBadge status={alloc.status} />
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                        {new Date(alloc.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {alloc.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(alloc._id, 'picked_up')}
                              disabled={actionLoading}
                              className="btn btn-secondary btn-sm"
                            >
                              <Truck size={12} />
                              <span>Mark Picked Up</span>
                            </button>
                          )}

                          {alloc.status === 'picked_up' && (
                            <button
                              onClick={() => handleUpdateStatus(alloc._id, 'delivered')}
                              disabled={actionLoading}
                              className="btn btn-primary btn-sm"
                            >
                              <PackageCheck size={12} />
                              <span>Confirm Delivered</span>
                            </button>
                          )}

                          {alloc.status === 'delivered' && (
                            <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 600 }}>
                              ✓ Confirmed Delivered
                            </span>
                          )}

                          {['approved', 'rejected', 'cancelled'].includes(alloc.status) && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                              Awaiting NGO Action
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
