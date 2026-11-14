import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import locationService from '../services/locationService';
import StatusBadge from '../components/StatusBadge';
import ReasonCodeBadge from '../components/ReasonCodeBadge';
import LiveTrackingMap from '../components/LiveTrackingMap';
import LiveDeliveryModal from '../components/LiveDeliveryModal';
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Truck,
  Check,
  Building,
  Soup,
} from 'lucide-react';

export default function CoordinatorDesk() {
  const [recommendations, setRecommendations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [demands, setDemands] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [approvedQty, setApprovedQty] = useState(0);
  const [osrmRoute, setOsrmRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('desk'); // 'desk' | 'lifecycle'
  const [notification, setNotification] = useState(null);
  const [trackingAllocation, setTrackingAllocation] = useState(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  const fetchDeskData = async () => {
    setLoading(true);
    try {
      const [recData, allocData, donData, demData] = await Promise.all([
        api.getRecommendations(),
        api.getAllocations(),
        api.getDonations(),
        api.getDemands(),
      ]);

      const recs = recData.recommendations || [];
      setRecommendations(recs);
      setAllocations(allocData.allocations || []);
      setDonations(donData.donations || []);
      setDemands(demData.demands || []);

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

  useEffect(() => {
    if (!selectedMatch) {
      setOsrmRoute(null);
      return;
    }
    const donorCoords = selectedMatch.donation?.location?.coordinates;
    const ngoCoords = selectedMatch.demand?.location?.coordinates || selectedMatch.ngo?.location?.coordinates;

    const hasValidCoords =
      donorCoords?.lat &&
      donorCoords?.lng &&
      ngoCoords?.lat &&
      ngoCoords?.lng &&
      (donorCoords.lat !== 0 || donorCoords.lng !== 0) &&
      (ngoCoords.lat !== 0 || ngoCoords.lng !== 0);

    if (hasValidCoords) {
      setLoadingRoute(true);
      locationService
        .getDrivingRoute(donorCoords, ngoCoords, true)
        .then((route) => setOsrmRoute(route))
        .catch(() => setOsrmRoute(null))
        .finally(() => setLoadingRoute(false));
    } else {
      setOsrmRoute(null);
    }
  }, [selectedMatch]);

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
            <button
              onClick={() => setActiveTab('donations')}
              className={`desk-tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
            >
              All Donor Listings ({donations.length})
            </button>
            <button
              onClick={() => setActiveTab('demands')}
              className={`desk-tab-btn ${activeTab === 'demands' ? 'active' : ''}`}
            >
              All NGO Demands ({demands.length})
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

      {/* 1. MATCH DESK 3-COLUMN VIEW */}
      {activeTab === 'desk' && (
        /* The 3-Column Allocation Desk Layout */
        <div className="allocation-desk-grid">
          {/* Column 1: Prioritized Recommendation Queue */}
          <div className="fresh-card allocation-queue-card">
            <div className="allocation-queue-header">
              <div>
                <h3 style={{ fontSize: '0.94rem', color: '#1C1613', fontWeight: 800, letterSpacing: '0.02em' }}>
                  PRIORITIZED MATCH QUEUE
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#382C25', fontWeight: 500 }}>
                  Ranked by demand, deadline, & travel
                </p>
              </div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#1F6F43',
                backgroundColor: '#E3F2E7',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-xs, 6px)',
                border: '1px solid #C8E2D1',
                whiteSpace: 'nowrap',
              }}>
                {recommendations.length} Pending
              </span>
            </div>

            <div className="allocation-queue-list">
              {recommendations.length === 0 ? (
                <div className="allocation-queue-empty">
                  <ShieldCheck size={32} color="#1F6F43" style={{ margin: "0 auto 0.5rem auto" }} />
                  <p style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1C1613' }}>All matched food allocated!</p>
                  <p style={{ fontSize: '0.84rem', color: '#382C25', marginTop: '0.35rem', lineHeight: 1.5, fontWeight: 500 }}>
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
                        backgroundColor: isSelected ? 'var(--color-warm-bg)' : '#FFFDF9',
                        borderLeft: isSelected ? '4px solid var(--color-forest-green)' : '4px solid transparent',
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

                    {selectedMatch.successProbability !== undefined && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: 'var(--color-soft-mint)',
                        border: '1px solid var(--color-soft-mint-border)',
                        borderRadius: 'var(--radius-btn-sm)',
                        padding: '0.45rem 0.75rem',
                        marginBottom: '0.85rem',
                        fontSize: '0.8rem',
                        color: 'var(--color-forest-green)',
                      }}>
                        <ShieldCheck size={14} color="var(--color-forest-green)" />
                        <span><strong>RescueBite Model B ML:</strong> {Math.round(selectedMatch.successProbability * 100)}% predicted delivery success</span>
                      </div>
                    )}

                    {/* Transparent Segmented Score Breakdown Bar */}
                    <div style={{
                      backgroundColor: '#FFFDF9',
                      padding: '1rem',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid var(--color-soft-border)',
                      boxShadow: '0 2px 0 var(--color-card-bevel)',
                      marginBottom: '1.25rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-coffee-dark)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Segmented Matching Breakdown
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
                          Weight: Demand 35% • Urgency 25% • Proximity 20% • Storage 20%
                        </span>
                      </div>

                      {/* 4-part segmented bar */}
                      <div style={{
                        height: '10px',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        display: 'flex',
                        backgroundColor: 'var(--color-pale-neutral)',
                        marginBottom: '0.85rem',
                      }}>
                        <div
                          title={`Demand Fit: ${selectedMatch.scoreBreakdown?.demandFit || 90}% (35% weight)`}
                          style={{
                            width: '35%',
                            backgroundColor: 'var(--color-forest-green)',
                            borderRight: '1.5px solid #FFFDF9',
                          }}
                        />
                        <div
                          title={`Urgency: ${selectedMatch.scoreBreakdown?.urgency || 85}% (25% weight)`}
                          style={{
                            width: '25%',
                            backgroundColor: 'var(--color-terracotta)',
                            borderRight: '1.5px solid #FFFDF9',
                          }}
                        />
                        <div
                          title={`Proximity: ${selectedMatch.scoreBreakdown?.proximity || 95}% (20% weight)`}
                          style={{
                            width: '20%',
                            backgroundColor: '#D97706',
                            borderRight: '1.5px solid #FFFDF9',
                          }}
                        />
                        <div
                          title={`Storage Capacity: ${selectedMatch.scoreBreakdown?.capacity || 90}% (20% weight)`}
                          style={{
                            width: '20%',
                            backgroundColor: '#6E5D53',
                          }}
                        />
                      </div>

                      {/* Legend with subscores */}
                      <div className="desk-score-breakdown">
                        <div style={{ padding: '0.45rem 0.25rem', backgroundColor: 'var(--color-warm-bg)', borderRadius: '6px' }}>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', margin: 0 }}>Demand (35%)</p>
                          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-forest-green)', margin: '0.1rem 0 0 0' }}>
                            {selectedMatch.scoreBreakdown?.demandFit || 90}%
                          </p>
                        </div>
                        <div style={{ padding: '0.45rem 0.25rem', backgroundColor: 'var(--color-warm-bg)', borderRadius: '6px' }}>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', margin: 0 }}>Urgency (25%)</p>
                          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-terracotta)', margin: '0.1rem 0 0 0' }}>
                            {selectedMatch.scoreBreakdown?.urgency || 85}%
                          </p>
                        </div>
                        <div style={{ padding: '0.45rem 0.25rem', backgroundColor: 'var(--color-warm-bg)', borderRadius: '6px' }}>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', margin: 0 }}>Proximity (20%)</p>
                          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#D97706', margin: '0.1rem 0 0 0' }}>
                            {selectedMatch.scoreBreakdown?.proximity || 95}%
                          </p>
                        </div>
                        <div style={{ padding: '0.45rem 0.25rem', backgroundColor: 'var(--color-warm-bg)', borderRadius: '6px' }}>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', margin: 0 }}>Storage (20%)</p>
                          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#6E5D53', margin: '0.1rem 0 0 0' }}>
                            {selectedMatch.scoreBreakdown?.capacity || 90}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Decision Slider */}
                  <div style={{
                    padding: '1.15rem',
                    backgroundColor: '#FFFDF9',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-soft-border)',
                    boxShadow: '0 2px 0 var(--color-card-bevel)',
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
                <ShieldCheck size={44} color="#1F6F43" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1C1613', marginBottom: '0.5rem' }}>Select a Match from Queue</h3>
                <p style={{ fontSize: '0.9rem', color: '#382C25', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5, fontWeight: 500 }}>
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
                    backgroundColor: 'var(--color-soft-mint)', color: 'var(--color-forest-green)',
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
                    backgroundColor: 'var(--color-soft-mint)', color: 'var(--color-forest-green)',
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
                    backgroundColor: 'var(--color-soft-mint)', color: 'var(--color-forest-green)',
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
                    backgroundColor: 'var(--color-soft-mint)', color: 'var(--color-forest-green)',
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
                    <span style={{ color: 'var(--color-muted-slate)' }}>Road Transit Distance:</span>
                    <strong>{osrmRoute ? `${osrmRoute.distanceKm} km` : `${selectedMatch.distanceKm} km`}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Est. Driving Transit Time:</span>
                    <strong>{osrmRoute ? `~${osrmRoute.durationMins} mins` : `~${Math.round(selectedMatch.distanceKm * 2.8)} mins`}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-forest-green)', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <span>Routing Source:</span>
                    <span style={{ fontWeight: 700 }}>
                      {loadingRoute
                        ? 'Calculating OSRM Route...'
                        : osrmRoute?.routeSource === 'osrm'
                        ? '● OSRM Live Road Network'
                        : '● Real Haversine Vector'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                  Transport requires insulated thermal bags for hot items or coolers for refrigerated salads.
                </p>

                {osrmRoute?.coordinates && osrmRoute.coordinates.length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden' }}>
                    <LiveTrackingMap
                      donorCoords={selectedMatch.donation?.location?.coordinates}
                      donorName={selectedMatch.donation?.donorOrg || selectedMatch.donation?.donorName || 'Donor'}
                      ngoCoords={selectedMatch.demand?.location?.coordinates || selectedMatch.ngo?.location?.coordinates}
                      ngoName={selectedMatch.ngo?.organization || selectedMatch.ngo?.name || 'Shelter'}
                      routeCoordinates={osrmRoute.coordinates}
                      distanceKm={osrmRoute.distanceKm}
                      durationMin={osrmRoute.durationMins}
                      height="200px"
                      interactive={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ALLOCATION LIFECYCLE TABLE VIEW */}
      {activeTab === 'lifecycle' && (
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
            <table className="data-table data-table-stacked-mobile">
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
                      <td data-label="Food & Donor">
                        <strong>{alloc.donationId?.foodName || 'Donation Item'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {alloc.donationId?.donorOrg || alloc.donationId?.donorName}
                        </p>
                      </td>
                      <td data-label="Recipient NGO">
                        <strong>{alloc.ngoId?.name || 'NGO'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {alloc.ngoId?.organization}
                        </p>
                      </td>
                      <td data-label="Quantity">
                        <strong style={{ color: 'var(--color-network-green)' }}>
                          {alloc.approvedMeals} meals
                        </strong>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={alloc.status} />
                      </td>
                      <td data-label="Approved At" style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                        {new Date(alloc.createdAt).toLocaleDateString()}
                      </td>
                      <td data-label="Actions">
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setTrackingAllocation(alloc);
                              setIsTrackingOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: '#065F46', color: '#065F46' }}
                            title="Open Real-time Leaflet Map & Live Courier Tracking"
                          >
                            <Truck size={12} />
                            <span>Track Map</span>
                          </button>

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
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: alloc.status === 'cancelled' || (alloc.donationId?.pickupDeadline && new Date(alloc.donationId.pickupDeadline) <= new Date()) ? 600 : 400,
                                color: alloc.status === 'cancelled' || (alloc.donationId?.pickupDeadline && new Date(alloc.donationId.pickupDeadline) <= new Date())
                                  ? '#DC2626'
                                  : alloc.status === 'rejected'
                                  ? '#B91C1C'
                                  : 'var(--color-muted-slate)',
                              }}
                            >
                              {alloc.status === 'cancelled'
                                ? '❌ Cancelled / Expired'
                                : alloc.status === 'rejected'
                                ? '❌ Declined by NGO'
                                : alloc.donationId?.pickupDeadline && new Date(alloc.donationId.pickupDeadline) <= new Date()
                                ? '⚠️ Expired before NGO Action'
                                : 'Awaiting NGO Action'}
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

      {/* All Donor Surplus Listings Table View */}
      {activeTab === 'donations' && (
        <div className="fresh-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Master Surplus Food Listings ({donations.length})</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                Inspect all declared food surplus from commercial kitchens, hotels, and bakeries across the city.
              </p>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table data-table-stacked-mobile">
              <thead>
                <tr>
                  <th>Food Item & Category</th>
                  <th>Donor Organization</th>
                  <th>Quantity & Remaining</th>
                  <th>Storage Protocol</th>
                  <th>Pickup Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No donor listings declared yet.
                    </td>
                  </tr>
                ) : (
                  donations.map((don) => (
                    <tr key={don._id}>
                      <td data-label="Food Item">
                        <strong>{don.foodName}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {don.category}
                        </p>
                      </td>
                      <td data-label="Donor">
                        <strong>{don.donorOrg || don.donorName}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {don.location?.address || don.location?.city || 'City Center'}
                        </p>
                      </td>
                      <td data-label="Quantity">
                        <strong style={{ color: 'var(--color-network-green)' }}>
                          {don.remainingQuantity} / {don.quantityMeals} meals
                        </strong>
                      </td>
                      <td data-label="Storage">
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-deep-forest)' }}>
                          {don.storageInfo}
                        </span>
                      </td>
                      <td data-label="Deadline" style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                        {new Date(don.pickupDeadline).toLocaleDateString()} {new Date(don.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={don.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All NGO Demands Table View */}
      {activeTab === 'demands' && (
        <div className="fresh-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Master NGO Meal Demands ({demands.length})</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                Inspect all verified meal intake requests from shelters, community kitchens, and relief groups.
              </p>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table data-table-stacked-mobile">
              <thead>
                <tr>
                  <th>Recipient NGO</th>
                  <th>Location</th>
                  <th>Meals Needed & Fulfilled</th>
                  <th>Beneficiaries</th>
                  <th>Needed By</th>
                  <th>Urgency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {demands.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      No NGO meal demands logged yet.
                    </td>
                  </tr>
                ) : (
                  demands.map((dem) => (
                    <tr key={dem._id}>
                      <td data-label="Recipient NGO">
                        <strong>{dem.ngoName || dem.ngoId?.name || 'Community Shelter'}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                          {dem.notes || 'Evening intake quota'}
                        </p>
                      </td>
                      <td data-label="Location">
                        <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                          {dem.location?.address || dem.location?.city || 'East Ward'}
                        </span>
                      </td>
                      <td data-label="Meals">
                        <strong style={{ color: 'var(--color-network-green)' }}>
                          {dem.fulfilledMeals || 0} / {dem.requestedMeals} meals
                        </strong>
                      </td>
                      <td data-label="Beneficiaries">
                        <span style={{ fontSize: '0.82rem' }}>
                          {dem.beneficiaryCount || dem.requestedMeals} people
                        </span>
                      </td>
                      <td data-label="Needed By" style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                        {new Date(dem.neededBy).toLocaleDateString()} {new Date(dem.neededBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td data-label="Urgency">
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          backgroundColor: dem.urgency === 'critical' ? '#FEE2E2' : dem.urgency === 'urgent' ? '#FEF3C7' : '#EAF5F0',
                          color: dem.urgency === 'critical' ? '#991B1B' : dem.urgency === 'urgent' ? '#92400E' : '#1F6F43',
                        }}>
                          {dem.urgency || 'standard'}
                        </span>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={dem.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Real-time Live Delivery Tracking Modal */}
      {isTrackingOpen && trackingAllocation && (
        <LiveDeliveryModal
          allocation={trackingAllocation}
          isOpen={isTrackingOpen}
          onClose={() => {
            setIsTrackingOpen(false);
            setTrackingAllocation(null);
          }}
        />
      )}
    </div>
  );
}
