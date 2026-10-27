import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ReasonCodeBadge from '../components/ReasonCodeBadge';
import Modal from '../components/Modal';
import {
  Soup,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building,
  Truck,
  PackageCheck,
  RefreshCw,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  Eye,
  Trash2,
} from 'lucide-react';

const getFutureDateTime = (hoursFromNow = 4) => {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function NgoDashboard() {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [aiForecast, setAiForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Demand form state
  const [requestedMeals, setRequestedMeals] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState('');
  const [neededBy, setNeededBy] = useState(() => getFutureDateTime(4));
  const [urgency, setUrgency] = useState('standard');
  const [notes, setNotes] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState([]);

  // Reject modal state
  const [rejectingAllocId, setRejectingAllocId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Demand detail modal state
  const [selectedDemand, setSelectedDemand] = useState(null);

  const fetchNgoData = async () => {
    setLoading(true);
    try {
      const [demandData, allocData] = await Promise.all([
        api.getMyDemands(),
        api.getAllocations(),
      ]);
      setDemands(demandData.demands || []);
      setAllocations(allocData.allocations || []);

      // Fetch AI Demand Forecast for tomorrow
      try {
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const forecast = await api.getDemandForecast(tomorrowStr);
        if (forecast && forecast.success) {
          setAiForecast(forecast);
        }
      } catch (forecastErr) {
        console.warn('AI Forecast unavailable:', forecastErr);
      }
    } catch (err) {
      console.error('Failed to load NGO portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();
  }, []);

  const handleOpenDemandModal = () => {
    if (!neededBy) {
      setNeededBy(getFutureDateTime(4));
    }
    setIsModalOpen(true);
  };

  const handleCreateDemand = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setNotification(null);

    try {
      let validNeededBy = neededBy;
      if (!validNeededBy) {
        validNeededBy = getFutureDateTime(4);
      } else if (validNeededBy.length === 10) {
        validNeededBy = `${validNeededBy}T18:00`;
      }
      const parsedDate = new Date(validNeededBy);
      const safeNeededByIso = isNaN(parsedDate.getTime())
        ? new Date(Date.now() + 4 * 3600 * 1000).toISOString()
        : parsedDate.toISOString();

      await api.createDemand({
        requestedMeals: parseInt(requestedMeals, 10),
        beneficiaryCount: parseInt(beneficiaryCount, 10),
        neededBy: safeNeededByIso,
        receivingCapacity: user?.receivingCapacity || parseInt(requestedMeals, 10) || 0,
        urgency,
        notes,
        dietaryPreferences: dietaryPrefs,
        location: user?.location || { address: 'NGO Shelter Location' },
      });

      setNotification({
        type: 'success',
        message: 'Meal demand successfully registered! Coordinator will match incoming surplus.',
      });

      setIsModalOpen(false);
      setRequestedMeals('');
      setBeneficiaryCount('');
      setNeededBy(getFutureDateTime(4));
      setNotes('');

      await fetchNgoData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to submit demand',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondAllocation = async (allocId, action, reason = '') => {
    setActionLoading(true);
    try {
      await api.respondAllocation(allocId, action, reason);
      setNotification({
        type: 'success',
        message: action === 'accept' ? 'Food allocation accepted!' : 'Food allocation declined and food returned to pool.',
      });
      setRejectingAllocId(null);
      setRejectionReason('');
      await fetchNgoData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Action failed',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async (allocId) => {
    setActionLoading(true);
    try {
      await api.updateAllocationStatus(allocId, 'delivered', 'Confirmed received and served to beneficiaries');
      setNotification({
        type: 'success',
        message: 'Delivery confirmed! Impact metrics updated.',
      });
      await fetchNgoData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to confirm delivery',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDemand = async (demandId) => {
    if (!window.confirm('Are you sure you want to cancel this meal demand request?')) return;
    setActionLoading(true);
    setNotification(null);
    try {
      await api.cancelDemand(demandId);
      setNotification({
        type: 'success',
        message: 'Meal demand request successfully cancelled.',
      });
      setSelectedDemand(null);
      await fetchNgoData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel meal demand',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const openDemands = demands.filter((d) => ['open', 'partially_fulfilled'].includes(d.status));
  const totalNeededMeals = openDemands.reduce((sum, d) => sum + (d.requestedMeals - (d.fulfilledMeals || 0)), 0);
  const pendingIncomingAllocations = allocations.filter((a) => ['approved', 'accepted', 'picked_up'].includes(a.status));

  return (
    <div>
      {/* Top Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.65rem', color: 'var(--color-deep-forest)' }}>
              Recipient NGO Portal
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
              {user?.organization || user?.name}
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
            Manage shelter meal demand, review matched surplus offers, and confirm food handovers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleOpenDemandModal}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Plus size={16} />
            <span>Submit Meal Demand</span>
          </button>

          <button
            onClick={fetchNgoData}
            disabled={loading}
            className="btn btn-outline btn-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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

      {/* Model A AI Demand Forecast Banner */}
      {aiForecast && (
        <div className="fresh-card" style={{
          padding: '1.15rem 1.35rem',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)',
          border: '1px solid #BBF7D0',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <strong style={{ fontSize: '0.95rem', color: '#166534' }}>
                  RescueBite Tomorrow's Demand Forecast
                </strong>
                <span style={{
                  fontSize: '0.7rem',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}>
                  AI PREDICTION
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#374151', marginTop: '0.2rem' }}>
                Forecast Date: <strong>{aiForecast.forecast_date}</strong> • Predicted Demand: <strong style={{ color: '#15803D', fontSize: '0.95rem' }}>{Math.round(aiForecast.predicted_meals)} meals</strong> (80% Confidence Range: {Math.round(aiForecast.confidence_lower)} – {Math.round(aiForecast.confidence_upper)} meals)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setRequestedMeals(String(Math.round(aiForecast.predicted_meals)));
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Plus size={14} />
            <span>Prefill Meal Request</span>
          </button>
        </div>
      )}

      {/* Highlights */}
      <div className="dashboard-stats-grid">
        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Unfulfilled Meal Deficit
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-harvest-coral)', marginTop: '0.2rem' }}>
            {totalNeededMeals} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>meals needed</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Max Intake Capacity
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.2rem' }}>
            {user?.receivingCapacity ?? 0} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>meals/intake</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Incoming Food Offers
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-network-green)', marginTop: '0.2rem' }}>
            {pendingIncomingAllocations.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>allocations active</span>
          </p>
        </div>
      </div>

      {/* Incoming / Assigned Allocations for this NGO */}
      <div className="fresh-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-forest)' }}>
              Assigned Food Offers from Dispatch Desk
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
              Surplus matched by coordinator for your community beneficiaries
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
            {allocations.length} total assigned
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allocations.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', backgroundColor: 'var(--color-pale-neutral)', borderRadius: 'var(--radius-md)' }}>
              <Soup size={32} color="var(--color-muted-slate)" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>No food offers currently waiting for response</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem' }}>
                Ensure your meal demand is submitted below so the coordinator can assign surplus to you.
              </p>
            </div>
          ) : (
            allocations.map((alloc) => (
              <div
                key={alloc._id}
                style={{
                  border: '1px solid var(--color-soft-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.15rem',
                  backgroundColor: alloc.status === 'approved' ? '#FFFFFF' : 'var(--color-pale-neutral)',
                  boxShadow: alloc.status === 'approved' ? 'var(--shadow-card)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', color: 'var(--color-deep-forest)' }}>
                        {alloc.donationId?.foodName || 'Surplus Meal Listing'}
                      </h4>
                      <StatusBadge status={alloc.status} />
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                      From Donor: <strong>{alloc.donationId?.donorOrg || alloc.donationId?.donorName}</strong> ({alloc.donationId?.location?.address || 'Local'})
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-network-green)' }}>
                      {alloc.approvedMeals}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-muted-slate)', marginLeft: '0.25rem' }}>
                      Meals Offered
                    </span>
                  </div>
                </div>

                {/* Reason Codes */}
                {alloc.reasonCodes?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {alloc.reasonCodes.map((code) => (
                      <ReasonCodeBadge key={code} code={code} />
                    ))}
                  </div>
                )}

                {/* Storage and Deadline info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-dark-slate)',
                  backgroundColor: '#FFFFFF',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-soft-border)',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Storage: </span>
                    <strong>{alloc.donationId?.storageInfo || 'Refrigerated'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Pickup By: </span>
                    <strong>
                      {alloc.donationId?.pickupDeadline
                        ? new Date(alloc.donationId.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                        : 'Today'}
                    </strong>
                  </div>
                </div>

                {/* NGO Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {alloc.status === 'approved' && (
                    <>
                      <button
                        onClick={() => setRejectingAllocId(alloc._id)}
                        disabled={actionLoading}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                      >
                        <XCircle size={14} />
                        <span>Decline Offer</span>
                      </button>

                      <button
                        onClick={() => handleRespondAllocation(alloc._id, 'accept')}
                        disabled={actionLoading}
                        className="btn btn-primary btn-sm"
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept Food Allocation</span>
                      </button>
                    </>
                  )}

                  {alloc.status === 'accepted' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
                        ✓ Accepted — awaiting pickup or in transit
                      </span>
                      <button
                        onClick={() => handleConfirmDelivery(alloc._id)}
                        disabled={actionLoading}
                        className="btn btn-primary btn-sm"
                      >
                        <PackageCheck size={14} />
                        <span>Confirm Food Received & Served</span>
                      </button>
                    </div>
                  )}

                  {alloc.status === 'picked_up' && (
                    <button
                      onClick={() => handleConfirmDelivery(alloc._id)}
                      disabled={actionLoading}
                      className="btn btn-primary btn-sm"
                    >
                      <PackageCheck size={14} />
                      <span>Confirm Safe Delivery</span>
                    </button>
                  )}

                  {alloc.status === 'delivered' && (
                    <span style={{ fontSize: '0.82rem', color: '#15803D', fontWeight: 600 }}>
                      ✓ Delivery Confirmed & Logged to Impact
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* NGO Demands Table */}
      <div className="fresh-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-forest)' }}>
            Your Active Meal Demands
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
            {demands.length} requests
          </span>
        </div>

        {demands.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            border: '1px dashed var(--color-soft-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-pale-neutral)',
            width: '100%',
          }}>
            <Soup size={40} color="var(--color-muted-slate)" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-deep-forest)' }}>
              No active meal demands registered
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem', maxWidth: '380px', margin: '0.25rem auto 1rem auto' }}>
              Register your kitchen's daily beneficiary meal requirements so coordinators can assign surplus food.
            </p>
            <button
              onClick={handleOpenDemandModal}
              className="btn btn-primary btn-sm"
              style={{ margin: '0 auto' }}
            >
              <Plus size={14} />
              <span>Submit Meal Demand</span>
            </button>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Needed By</th>
                  <th>Requested Meals</th>
                  <th>Fulfilled</th>
                  <th>Beneficiaries</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((demand) => (
                  <tr key={demand._id}>
                    <td>
                      <strong style={{ fontSize: '0.88rem' }}>
                        {new Date(demand.neededBy).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-deep-forest)' }}>
                        {demand.requestedMeals} meals
                      </strong>
                    </td>
                    <td>
                      <span style={{
                        color: demand.fulfilledMeals > 0 ? 'var(--color-network-green)' : 'var(--color-muted-slate)',
                        fontWeight: 700,
                      }}>
                        {demand.fulfilledMeals} meals
                      </span>
                    </td>
                    <td>{demand.beneficiaryCount} people</td>
                    <td>
                      <span
                        onClick={() => setSelectedDemand(demand)}
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        title="Click to view details"
                      >
                        <StatusBadge status={demand.urgency} />
                      </span>
                    </td>
                    <td>
                      <span
                        onClick={() => setSelectedDemand(demand)}
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                        title="Click to view details"
                      >
                        <StatusBadge status={demand.status} />
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => setSelectedDemand(demand)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                          title="View demand details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        {demand.status === 'open' && (
                          <button
                            onClick={() => handleCancelDemand(demand._id)}
                            disabled={actionLoading}
                            className="btn btn-outline btn-sm"
                            style={{
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.78rem',
                            }}
                            title="Cancel this demand request"
                          >
                            <Trash2 size={13} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Demand Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Meal Demand Request"
        subtitle="Let coordinators and the matching engine find surplus food for your kitchen"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateDemand}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Meals Needed *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                placeholder="e.g. 80"
                value={requestedMeals}
                onChange={(e) => setRequestedMeals(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Beneficiary Headcount *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                placeholder="e.g. 75"
                value={beneficiaryCount}
                onChange={(e) => setBeneficiaryCount(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Needed By (Deadline) *</label>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Date & Time</span>
              </div>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setNeededBy(getFutureDateTime(4));
                  } else if (val.length === 10) {
                    setNeededBy(`${val}T18:00`);
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { label: '+4 Hours', hours: 4 },
                  { label: '+8 Hours', hours: 8 },
                  { label: 'Tomorrow 12 PM', target: 'noon' },
                  { label: 'Tomorrow 6 PM', target: 'evening' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (preset.hours) {
                        setNeededBy(getFutureDateTime(preset.hours));
                      } else if (preset.target === 'noon') {
                        const d = new Date(Date.now() + 86400000);
                        const pad = (n) => String(n).padStart(2, '0');
                        setNeededBy(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`);
                      } else if (preset.target === 'evening') {
                        const d = new Date(Date.now() + 86400000);
                        const pad = (n) => String(n).padStart(2, '0');
                        setNeededBy(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`);
                      }
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-soft-border)',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select
                className="form-select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="standard">Standard Distribution</option>
                <option value="urgent">Urgent (Within 6 hours)</option>
                <option value="critical">Critical Deficit</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Special Needs or Delivery Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Halal or vegetarian preferred; rear kitchen loading dock"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? 'Submitting...' : 'Register Demand'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Decline Reason Modal */}
      <Modal
        isOpen={!!rejectingAllocId}
        onClose={() => setRejectingAllocId(null)}
        title="Decline Food Allocation"
        subtitle="Please provide a brief reason so the coordinator can reassign this surplus"
        maxWidth="450px"
      >
        <div className="form-group">
          <label className="form-label">Reason for declining</label>
          <select
            className="form-select"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          >
            <option value="Storage capacity full">Storage capacity full</option>
            <option value="Unable to pick up before deadline">Unable to pick up before deadline</option>
            <option value="Dietary restriction mismatch">Dietary restriction mismatch</option>
            <option value="Other commitment filled">Already secured sufficient food</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setRejectingAllocId(null)}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleRespondAllocation(rejectingAllocId, 'reject', rejectionReason)}
            className="btn btn-urgent"
          >
            Confirm Decline
          </button>
        </div>
      </Modal>

      {/* Demand Details Modal */}
      <Modal
        isOpen={Boolean(selectedDemand)}
        onClose={() => setSelectedDemand(null)}
        title="Meal Demand Details"
        subtitle="Review your registered meal demand and real-time fulfillment status"
        maxWidth="520px"
      >
        {selectedDemand && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
            }}>
              <div style={{
                background: 'var(--color-pale-neutral)',
                border: '1px solid var(--color-soft-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Requested Meals</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.25rem' }}>
                  {selectedDemand.requestedMeals} meals
                </div>
              </div>

              <div style={{
                background: 'var(--color-pale-neutral)',
                border: '1px solid var(--color-soft-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Beneficiaries</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.25rem' }}>
                  {selectedDemand.beneficiaryCount} people
                </div>
              </div>

              <div style={{
                background: 'var(--color-pale-neutral)',
                border: '1px solid var(--color-soft-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Fulfilled So Far</div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: selectedDemand.fulfilledMeals > 0 ? 'var(--color-network-green)' : 'var(--color-muted-slate)',
                  marginTop: '0.25rem',
                }}>
                  {selectedDemand.fulfilledMeals || 0} meals
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: '#FFF',
              border: '1px solid var(--color-soft-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Urgency Priority</span>
                <StatusBadge status={selectedDemand.urgency} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Current Status</span>
                <StatusBadge status={selectedDemand.status} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Needed By Deadline</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-deep-forest)' }}>
                  {new Date(selectedDemand.neededBy).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>

              {selectedDemand.receivingCapacity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Receiving Capacity</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep-forest)' }}>
                    {selectedDemand.receivingCapacity} meals
                  </span>
                </div>
              )}

              {selectedDemand.dietaryPreferences && selectedDemand.dietaryPreferences.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Dietary Preferences</span>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {selectedDemand.dietaryPreferences.map((p, idx) => (
                      <span key={idx} className="badge badge-subtle" style={{ textTransform: 'capitalize' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedDemand.notes && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-soft-border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', display: 'block', marginBottom: '0.25rem' }}>
                    Kitchen Notes / Instructions:
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-forest)', margin: 0, whiteSpace: 'pre-line' }}>
                    {selectedDemand.notes}
                  </p>
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.5rem',
            }}>
              {selectedDemand.status === 'open' ? (
                <button
                  type="button"
                  onClick={() => handleCancelDemand(selectedDemand._id)}
                  disabled={actionLoading}
                  className="btn btn-outline btn-sm"
                  style={{ color: '#DC2626', borderColor: '#FECACA' }}
                >
                  <Trash2 size={14} />
                  <span>Cancel This Demand</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedDemand(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
