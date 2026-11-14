import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ReasonCodeBadge from '../components/ReasonCodeBadge';
import Modal from '../components/Modal';
import LiveLocationPicker from '../components/LiveLocationPicker';
import LiveDeliveryModal from '../components/LiveDeliveryModal';
import locationService from '../services/locationService';
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
  Eye,
  Trash2,
} from 'lucide-react';

const getFutureDateTime = (hoursFromNow = 4) => {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Jain',
  'Gluten-Free',
  'Nut-Free',
  'Dairy-Free',
  'No Restrictions',
];

export default function NgoDashboard() {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [aiForecast, setAiForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [trackingAllocation, setTrackingAllocation] = useState(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Demand form state
  const [requestedMeals, setRequestedMeals] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState('');
  const [receivingCapacity, setReceivingCapacity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [coordinates, setCoordinates] = useState(user?.location?.coordinates || null);
  const [neededBy, setNeededBy] = useState(() => getFutureDateTime(4));
  const [urgency, setUrgency] = useState('standard');
  const [notes, setNotes] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState([]);

  // Reject modal state
  const [rejectingAllocId, setRejectingAllocId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Demand detail modal state
  const [selectedDemand, setSelectedDemand] = useState(null);

  const toggleDietaryPref = (pref) => {
    setDietaryPrefs((prev) => {
      if (pref === 'No Restrictions') {
        return prev.includes('No Restrictions') ? [] : ['No Restrictions'];
      }
      const filtered = prev.filter((p) => p !== 'No Restrictions');
      return filtered.includes(pref)
        ? filtered.filter((p) => p !== pref)
        : [...filtered, pref];
    });
  };

  const fetchNgoData = async () => {
    setLoading(true);
    try {
      const demandsPromise = user?.role === 'coordinator' ? api.getDemands() : api.getMyDemands();
      const [demandData, allocData] = await Promise.all([
        demandsPromise,
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
    if (!deliveryAddress && user?.location?.address) {
      setDeliveryAddress(user.location.address);
    }
    if (!receivingCapacity && user?.receivingCapacity) {
      setReceivingCapacity(String(user.receivingCapacity));
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

      const meals = parseInt(requestedMeals, 10);
      const beneficiaries = parseInt(beneficiaryCount, 10);
      const capInput = parseInt(receivingCapacity, 10);
      const safeCapacity = (!isNaN(capInput) && capInput > 0)
        ? capInput
        : (user?.receivingCapacity || meals || 1);

      await api.createDemand({
        requestedMeals: meals,
        beneficiaryCount: beneficiaries,
        neededBy: safeNeededByIso,
        receivingCapacity: safeCapacity,
        urgency,
        notes,
        dietaryPreferences: dietaryPrefs,
        location: {
          address: (deliveryAddress && deliveryAddress.trim()) || user?.location?.address || 'NGO Shelter Kitchen',
          city: user?.location?.city || '',
          zip: user?.location?.zip || '',
          coordinates: coordinates || user?.location?.coordinates || { lat: 0, lng: 0 },
        },
      });

      setNotification({
        type: 'success',
        message: 'Meal demand successfully registered! Coordinator will match incoming surplus.',
      });

      setIsModalOpen(false);
      setRequestedMeals('');
      setBeneficiaryCount('');
      setReceivingCapacity(user?.receivingCapacity ? String(user.receivingCapacity) : '');
      setDeliveryAddress(user?.location?.address || '');
      setCoordinates(user?.location?.coordinates || null);
      setDietaryPrefs([]);
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
  const pendingIncomingAllocations = allocations.filter((a) => {
    if (!['approved', 'accepted', 'picked_up'].includes(a.status)) return false;
    // Food safety filter: exclude expired approved offers whose pickup deadline has passed
    if (a.status === 'approved' && a.donationId?.pickupDeadline) {
      if (new Date(a.donationId.pickupDeadline) <= new Date()) return false;
    }
    return true;
  });

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
              borderRadius: 'var(--radius-xs, 6px)',
              border: '1px solid var(--color-soft-mint-border)',
              whiteSpace: 'nowrap',
            }}>
              {user?.organization && user.organization !== user?.name
                ? user.organization
                : user?.name
                ? `${user.name} • Verified NGO`
                : 'Verified NGO'}
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

      {/* Highlights */}
      <div className="dashboard-stats-grid">
        <div
          className="fresh-card"
          onClick={() => {
            document.getElementById('my-demands-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            padding: '1.15rem',
            borderLeft: '4px solid #C44824',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          title="Click to view and manage your active meal demands"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Unfulfilled Meal Deficit
            </span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: '#FDEEE9',
              color: '#C44824',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C44824', margin: '0.2rem 0 0 0', lineHeight: 1.1 }}>
            {totalNeededMeals} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#382C25' }}>meals needed</span>
          </p>
          <span style={{ fontSize: '0.72rem', color: '#C44824', fontWeight: 600, display: 'inline-block', marginTop: '0.35rem' }}>
            ↓ Click to view requests
          </span>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem', borderLeft: '4px solid #1F6F43' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Max Intake Capacity
            </span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: '#E3F2E7',
              color: '#1F6F43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={16} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1613', margin: '0.2rem 0 0 0', lineHeight: 1.1 }}>
            {user?.receivingCapacity ?? 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#382C25' }}>meals capacity</span>
          </p>
          <span style={{ fontSize: '0.72rem', color: '#6E5D53', fontWeight: 500, display: 'inline-block', marginTop: '0.35rem' }}>
            Your kitchen storage limit
          </span>
        </div>

        <div
          className="fresh-card"
          onClick={() => {
            const section = document.getElementById('assigned-offers-section');
            if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
              section.style.transition = 'outline 0.3s ease';
              section.style.outline = '2px solid #1F6F43';
              setTimeout(() => {
                section.style.outline = 'none';
              }, 1500);
            }
          }}
          style={{
            padding: '1.15rem',
            borderLeft: '4px solid #1F6F43',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          title="Click to jump to assigned incoming food offers"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Incoming Food Offers
            </span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: '#E3F2E7',
              color: '#1F6F43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Truck size={16} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F6F43', margin: '0.2rem 0 0 0', lineHeight: 1.1 }}>
            {pendingIncomingAllocations.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#382C25' }}>incoming allocations</span>
          </p>
          <span style={{ fontSize: '0.72rem', color: '#1F6F43', fontWeight: 600, display: 'inline-block', marginTop: '0.35rem' }}>
            ↓ Click to view active offers
          </span>
        </div>
      </div>

      {/* Incoming / Assigned Allocations for this NGO */}
      <div id="assigned-offers-section" className="fresh-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1613' }}>
              Assigned Food Offers from Dispatch Desk
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#382C25', marginTop: '0.2rem', fontWeight: 500 }}>
              Surplus matched by coordinator for your community beneficiaries
            </p>
          </div>
          <span style={{ fontSize: '0.84rem', color: '#382C25', fontWeight: 600 }}>
            {allocations.length} total assigned
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allocations.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', backgroundColor: '#F5EFE3', borderRadius: 'var(--radius-md)' }}>
              <Soup size={32} color="#382C25" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1C1613', margin: 0 }}>No food offers currently waiting for response</p>
              <p style={{ fontSize: '0.84rem', color: '#382C25', marginTop: '0.25rem', lineHeight: 1.45 }}>
                Ensure your meal demand is submitted below so the coordinator can assign surplus to you.
              </p>
            </div>
          ) : (
            allocations.map((alloc) => {
              const isExpired = Boolean(
                alloc.donationId?.pickupDeadline &&
                new Date(alloc.donationId.pickupDeadline) <= new Date()
              );
              const isPendingOrApproved = ['proposed', 'approved'].includes(alloc.status);

              return (
              <div
                key={alloc._id}
                style={{
                  border: `1px solid ${isExpired && isPendingOrApproved ? '#FECACA' : 'var(--color-soft-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.15rem',
                  backgroundColor: isExpired && isPendingOrApproved ? '#FFFDFD' : (alloc.status === 'approved' ? '#FFFFFF' : 'var(--color-pale-neutral)'),
                  boxShadow: alloc.status === 'approved' && !isExpired ? 'var(--shadow-card)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.05rem', color: isExpired && isPendingOrApproved ? '#991B1B' : 'var(--color-deep-forest)' }}>
                        {alloc.donationId?.foodName || 'Surplus Meal Listing'}
                      </h4>
                      {isExpired && isPendingOrApproved ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                          }}
                        >
                          <AlertTriangle size={12} />
                          Expired (Food Safety)
                        </span>
                      ) : (
                        <StatusBadge status={alloc.status} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
                      From Donor: <strong>{alloc.donationId?.donorOrg || alloc.donationId?.donorName}</strong> ({alloc.donationId?.location?.address || 'Local'})
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: isExpired && isPendingOrApproved ? '#9CA3AF' : 'var(--color-network-green)' }}>
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
                  color: isExpired && isPendingOrApproved ? '#991B1B' : 'var(--color-dark-slate)',
                  backgroundColor: isExpired && isPendingOrApproved ? '#FEF2F2' : '#FFFFFF',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isExpired && isPendingOrApproved ? '#FECACA' : 'var(--color-soft-border)'}`,
                  marginBottom: isExpired && isPendingOrApproved ? '0.65rem' : '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <span style={{ color: 'var(--color-muted-slate)' }}>Storage: </span>
                    <strong>{alloc.donationId?.storageInfo || 'Refrigerated'}</strong>
                  </div>
                  <div>
                    <span style={{ color: isExpired && isPendingOrApproved ? '#991B1B' : 'var(--color-muted-slate)' }}>Pickup By: </span>
                    <strong style={{ color: isExpired && isPendingOrApproved ? '#DC2626' : 'inherit' }}>
                      {alloc.donationId?.pickupDeadline
                        ? new Date(alloc.donationId.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                        : 'Today'}
                      {isExpired && isPendingOrApproved && ' (EXPIRED)'}
                    </strong>
                  </div>
                </div>

                {/* Food Safety Notice Banner for Expired Consignments */}
                {isExpired && isPendingOrApproved && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-sm)',
                    color: '#991B1B',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                  }}>
                    <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Food Safety Expiry:</strong> Consignment pickup deadline passed on {alloc.donationId?.pickupDeadline ? new Date(alloc.donationId.pickupDeadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'earlier'}. To prevent foodborne risks, expired surplus cannot be accepted or dispatched.
                    </span>
                  </div>
                )}

                {/* NGO Action Buttons */}
                <div className="ngo-card-actions">
                  {['cancelled', 'rejected'].includes(alloc.status) || isExpired ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        disabled
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          opacity: 0.55,
                          cursor: 'not-allowed',
                          borderColor: '#D1D5DB',
                          color: '#6B7280',
                        }}
                        title="Delivery inactive: consignment was cancelled or expired"
                      >
                        <Truck size={14} />
                        <span>Delivery Inactive</span>
                      </button>

                      <button
                        disabled
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          borderColor: '#FECACA',
                          cursor: 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontWeight: 600,
                        }}
                        title="Cancelled or expired consignment cannot be accepted"
                      >
                        <XCircle size={14} />
                        <span>{alloc.status === 'rejected' ? 'Offer Declined' : 'Offer Expired & Cancelled'}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setTrackingAllocation(alloc);
                          setIsTrackingOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          borderColor: '#065F46',
                          color: '#065F46',
                          fontWeight: 600,
                        }}
                        title="Track Courier & Route in Real-Time"
                      >
                        <Truck size={14} />
                        <span>Track Live Delivery</span>
                      </button>

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
                    </>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* NGO Demands Table */}
      <div id="my-demands-section" className="fresh-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1613' }}>
            Your Active Meal Demands
          </h3>
          <span style={{ fontSize: '0.84rem', color: '#382C25', fontWeight: 600 }}>
            {demands.length} requests
          </span>
        </div>

        {demands.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            border: '1px dashed var(--color-soft-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#F5EFE3',
            width: '100%',
          }}>
            <Soup size={40} color="#382C25" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1C1613' }}>
              No active meal demands
            </p>
            <p style={{ fontSize: '0.84rem', color: '#382C25', marginTop: '0.25rem', maxWidth: '380px', margin: '0.25rem auto 1rem auto', lineHeight: 1.45 }}>
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
            <table className="data-table data-table-stacked-mobile">
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
                    <td data-label="Needed By">
                      <strong style={{ fontSize: '0.9rem', color: '#1C1613' }}>
                        {new Date(demand.neededBy).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </td>
                    <td data-label="Requested">
                      <strong style={{ color: '#1C1613', fontWeight: 800 }}>
                        {demand.requestedMeals} meals
                      </strong>
                    </td>
                    <td data-label="Fulfilled">
                      <span style={{
                        color: demand.fulfilledMeals > 0 ? '#1F6F43' : '#382C25',
                        fontWeight: 700,
                      }}>
                        {demand.fulfilledMeals} meals
                      </span>
                    </td>
                    <td data-label="Beneficiaries" style={{ color: '#2C221E', fontWeight: 600 }}>{demand.beneficiaryCount} people</td>
                    <td data-label="Urgency">
                      <span onClick={() => setSelectedDemand(demand)} style={{ cursor: 'pointer', display: 'inline-block' }} title="Click to view details">
                        <StatusBadge status={demand.urgency} />
                      </span>
                    </td>
                    <td data-label="Status">
                      <span onClick={() => setSelectedDemand(demand)} style={{ cursor: 'pointer', display: 'inline-block' }} title="Click to view details">
                        <StatusBadge status={demand.status} />
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button onClick={() => setSelectedDemand(demand)}
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
        maxWidth="580px"
      >
        <form onSubmit={handleCreateDemand} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Row 1: Meals Needed & Beneficiary Count */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Meals Needed *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                placeholder="e.g. 80 (Please enter number of meals)"
                value={requestedMeals}
                onChange={(e) => setRequestedMeals(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Beneficiary Headcount *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                placeholder="e.g. 75 (Please enter headcount)"
                value={beneficiaryCount}
                onChange={(e) => setBeneficiaryCount(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Receiving Capacity & Urgency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Intake / Storage Capacity</label>
                <span style={{ fontSize: '0.74rem', color: '#382C25', fontWeight: 600 }}>Max meals</span>
              </div>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder={user?.receivingCapacity ? `Shelter limit: ${user.receivingCapacity} meals` : 'e.g. 100 (Please enter max meals)'}
                value={receivingCapacity}
                onChange={(e) => setReceivingCapacity(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: '#382C25', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>
                Limits single batch size for coordinator dispatch checks
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
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
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem', display: 'block' }}>
                Urgent requests are boosted in matching priority queue
              </span>
            </div>
          </div>

          {/* Row 3: Needed By (Deadline) */}
          <div className="form-group" style={{ marginBottom: 0 }}>
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
                    fontSize: '0.74rem',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-soft-border)',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 600,
                    flex: '1 1 calc(50% - 0.35rem)',
                    minWidth: '95px',
                    textAlign: 'center',
                    minHeight: '34px',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Dietary Preferences */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Dietary Preferences & Restrictions</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Optional Filter</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {DIETARY_OPTIONS.map((tag) => {
                const isSelected = dietaryPrefs.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietaryPref(tag)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'var(--color-network-green)' : 'var(--color-pale-neutral)',
                      color: isSelected ? '#FFFFFF' : 'var(--color-deep-forest)',
                      border: `1.5px solid ${isSelected ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(31, 111, 67, 0.25)' : 'none',
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Delivery / Drop-off Location */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Delivery / Drop-off Address</label>
            <input
              type="text"
              className="form-input"
              placeholder={user?.location?.address ? `Default: ${user.location.address}` : 'Enter destination shelter or drop-off address'}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              onBlur={async () => {
                if (deliveryAddress && deliveryAddress.trim().length > 3) {
                  const geo = await locationService.forwardGeocode(deliveryAddress);
                  if (geo) {
                    setCoordinates({ lat: geo.lat, lng: geo.lng });
                  }
                }
              }}
            />
            <LiveLocationPicker
              currentCoordinates={coordinates}
              onLocationDetected={({ address: detectedAddr, coordinates: detectedCoords }) => {
                if (detectedAddr) setDeliveryAddress(detectedAddr);
                if (detectedCoords) setCoordinates(detectedCoords);
              }}
            />
          </div>

          {/* Row 6: Special Needs or Delivery Notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Special Needs or Delivery Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Rear loading dock on 5th Ave, cold storage ready, phone kitchen supervisor on dispatch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
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
              {actionLoading ? 'Submitting...' : 'Submit Meal Demand'}
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

              {selectedDemand.location?.address && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>Delivery Location</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep-forest)', textAlign: 'right', maxWidth: '65%' }}>
                    {selectedDemand.location.address}
                  </span>
                </div>
              )}

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

      {/* Real-Time Live Delivery Tracking Modal for NGO */}
      {isTrackingOpen && trackingAllocation && (
        <LiveDeliveryModal
          allocation={trackingAllocation}
          isOpen={isTrackingOpen}
          currentUser={user}
          onClose={() => {
            setIsTrackingOpen(false);
            setTrackingAllocation(null);
          }}
        />
      )}
    </div>
  );
}
