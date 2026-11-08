import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Plus,
  Package,
  Clock,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Building,
  Thermometer,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Utensils,
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
];

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState('Prepared Hot Meals');
  const [quantityMeals, setQuantityMeals] = useState('');
  const [storageInfo, setStorageInfo] = useState('Refrigerated (4°C)');
  const [pickupDeadline, setPickupDeadline] = useState(() => getFutureDateTime(4));
  const [dietaryTags, setDietaryTags] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [address, setAddress] = useState(user?.location?.address || '');

  const [aiSupplyForecast, setAiSupplyForecast] = useState(null);

  const fetchMyDonations = async () => {
    setLoading(true);
    try {
      const data = await api.getDonations(user?.role === 'coordinator' ? {} : { ownOnly: 'true' });
      setDonations(data.donations || []);

      // Fetch Model C AI Supply Forecast for tomorrow
      try {
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const forecast = await api.getDonorSupplyForecast(tomorrowStr);
        if (forecast && forecast.success) {
          setAiSupplyForecast(forecast);
        }
      } catch (forecastErr) {
        console.warn('Model C Supply Forecast unavailable:', forecastErr);
      }
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const handleOpenModal = () => {
    if (!pickupDeadline) {
      setPickupDeadline(getFutureDateTime(4));
    }
    setIsModalOpen(true);
  };

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    try {
      let validDeadline = pickupDeadline;
      if (!validDeadline) {
        validDeadline = getFutureDateTime(4);
      } else if (validDeadline.length === 10) {
        validDeadline = `${validDeadline}T18:00`;
      }
      const parsedDate = new Date(validDeadline);
      const safeDeadlineIso = isNaN(parsedDate.getTime())
        ? new Date(Date.now() + 4 * 3600 * 1000).toISOString()
        : parsedDate.toISOString();

      await api.createDonation({
        foodName,
        category,
        quantityMeals: parseInt(quantityMeals, 10),
        storageInfo,
        pickupDeadline: safeDeadlineIso,
        dietaryInfo: dietaryTags,
        specialInstructions,
        location: {
          address: address || user?.location?.address || 'Donor Kitchen Address',
          coordinates: user?.location?.coordinates || { lat: 40.72, lng: -73.99 },
        },
      });

      setNotification({
        type: 'success',
        message: 'Surplus food listing successfully published to the network!',
      });

      setIsModalOpen(false);
      // Reset form
      setFoodName('');
      setQuantityMeals('');
      setSpecialInstructions('');
      setPickupDeadline(getFutureDateTime(4));
      setDietaryTags([]);

      await fetchMyDonations();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to list surplus food',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDonation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this surplus donation?')) return;
    try {
      await api.cancelDonation(id);
      setNotification({
        type: 'success',
        message: 'Donation listing cancelled',
      });
      await fetchMyDonations();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel listing',
      });
    }
  };

  const toggleDietaryTag = (tag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Metrics summary
  const activeListings = donations.filter((d) => ['available', 'reserved'].includes(d.status));
  const totalAvailableMeals = activeListings.reduce((sum, d) => sum + (d.remainingQuantity || 0), 0);

  // Find nearest upcoming pickup deadline
  const nearestDeadline = activeListings
    .map((d) => new Date(d.pickupDeadline))
    .filter((d) => d > new Date())
    .sort((a, b) => a - b)[0];

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
              Donor Operations Portal
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
                ? `${user.name} • Verified Donor`
                : 'Verified Donor'}
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-slate)', marginTop: '0.2rem' }}>
            List surplus edible food, designate storage requirements, and track redistribution status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleOpenModal}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Plus size={16} />
            <span>List Surplus Food</span>
          </button>

          <button
            onClick={fetchMyDonations}
            disabled={loading}
            className="btn btn-outline btn-sm"
            title="Refresh listings"
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

      {/* Model C AI Surplus Supply Forecast Banner */}
      {aiSupplyForecast && (
        <div className="fresh-card" style={{
          padding: '1.15rem 1.35rem',
          backgroundColor: '#FFFDF9',
          border: '1px solid var(--color-soft-border)',
          borderLeft: '4px solid var(--color-forest-green)',
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
              backgroundColor: 'var(--color-soft-mint)',
              color: 'var(--color-forest-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--color-coffee-dark)', fontFamily: 'var(--font-heading)' }}>
                  RescueBite Supply Forecast
                </strong>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-forest-green)',
                  backgroundColor: 'var(--color-soft-mint)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-soft-mint-border)',
                }}>
                  Sample data
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-coffee-dark)', marginTop: '0.2rem' }}>
                Forecast Date: <strong>{aiSupplyForecast.forecast_date}</strong> • Expected Surplus: <strong style={{ color: 'var(--color-forest-green)', fontSize: '0.95rem' }}>{Math.round(aiSupplyForecast.predicted_surplus_meals)} meals</strong> (Bounds: {Math.round(aiSupplyForecast.surplus_p10)} – {Math.round(aiSupplyForecast.surplus_p90)} meals)
              </p>
              {Array.isArray(aiSupplyForecast.reason_codes) &&
                aiSupplyForecast.reason_codes.filter(
                  (code) =>
                    typeof code === 'string' &&
                    !code.toLowerCase().includes('offline') &&
                    !code.toLowerCase().includes('fallback')
                ).length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {aiSupplyForecast.reason_codes
                    .filter(
                      (code) =>
                        typeof code === 'string' &&
                        !code.toLowerCase().includes('offline') &&
                        !code.toLowerCase().includes('fallback')
                    )
                    .map((code, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'var(--color-pale-neutral)',
                        color: 'var(--color-coffee-dark)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        border: '1px solid var(--color-soft-border)',
                        fontWeight: 600,
                      }}>
                        {code}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                Confidence: <strong style={{ color: 'var(--color-deep-forest)' }}>{Math.round((aiSupplyForecast.confidence_score || 0.82) * 100)}%</strong>
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>
                {aiSupplyForecast.donor_type ? `Type: ${aiSupplyForecast.donor_type}` : 'Commercial Kitchen'}
              </span>
            </div>
            <button
              onClick={() => {
                const predicted = Math.round(aiSupplyForecast.predicted_surplus_meals);
                setQuantityMeals(String(predicted));
                if (user?.location?.address) {
                  setAddress(user.location.address);
                }
                if (!pickupDeadline) {
                  setPickupDeadline(getFutureDateTime(4));
                }
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ whiteSpace: 'nowrap' }}
            >
              <Plus size={14} />
              <span>Prefill Surplus Listing</span>
            </button>
          </div>
        </div>
      )}

      {/* Operational Highlights Banner */}
      <div className="dashboard-stats-grid">
        <div className="fresh-card" style={{ padding: '1.15rem', borderLeft: '4px solid #1F6F43' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Active Surplus Listings
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
              <Package size={16} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1613', margin: '0.2rem 0 0 0', lineHeight: 1.1 }}>
            {activeListings.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#382C25' }}>listings active</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem', borderLeft: '4px solid #1F6F43' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Total Available Meals
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
              <Utensils size={16} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F6F43', margin: '0.2rem 0 0 0', lineHeight: 1.1 }}>
            {totalAvailableMeals} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#382C25' }}>meals available</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem', borderLeft: '4px solid #C44824' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C221E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Next Pickup Deadline
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
              <Clock size={16} />
            </div>
          </div>
          <p style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: nearestDeadline ? '#C44824' : '#382C25',
            margin: '0.45rem 0 0 0',
          }}>
            {nearestDeadline ? nearestDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'No pending pickups'}
          </p>
        </div>
      </div>

      {/* Your Active Donations Table */}
      <div className="fresh-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1613' }}>
            Your Surplus Food Listings
          </h3>
          <span style={{ fontSize: '0.84rem', color: '#382C25', fontWeight: 600 }}>
            Total listings: {donations.length}
          </span>
        </div>

        {donations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            border: '1px dashed var(--color-soft-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-pale-neutral)',
            width: '100%',
          }}>
            <Package size={40} color="#382C25" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1C1613' }}>
              No active surplus listings
            </p>
            <p style={{ fontSize: '0.84rem', color: '#382C25', marginTop: '0.25rem', maxWidth: '380px', margin: '0.25rem auto 1rem auto', lineHeight: 1.45 }}>
              List fresh surplus edible food to connect with nearby verified NGOs and shelters.
            </p>
            <button
              onClick={handleOpenModal}
              className="btn btn-primary btn-sm"
              style={{ margin: '0 auto' }}
            >
              <Plus size={14} />
              <span>List Surplus Food</span>
            </button>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table data-table-stacked-mobile">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Category</th>
                  <th>Remaining / Total</th>
                  <th>Safe Storage</th>
                  <th>Pickup Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((item) => {
                  const deadlineDate = new Date(item.pickupDeadline);
                  const isExpiringSoon = deadlineDate - new Date() < 6 * 60 * 60 * 1000 && item.status === 'available';

                  return (
                    <tr key={item._id}>
                      <td>
                        <strong style={{ fontSize: '0.94rem', color: '#1C1613' }}>{item.foodName}</strong>
                        {item.specialInstructions && (
                          <p style={{ fontSize: '0.78rem', color: '#382C25', marginTop: '0.15rem', fontWeight: 500 }}>
                            {item.specialInstructions}
                          </p>
                        )}
                      </td>
                      <td style={{ fontSize: '0.86rem', color: '#2C221E', fontWeight: 600 }}>{item.category}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: item.remainingQuantity > 0 ? '#1F6F43' : '#382C25',
                          }}>
                            {item.remainingQuantity}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#382C25', fontWeight: 600 }}>
                            / {item.quantityMeals} meals
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#2C221E',
                          backgroundColor: '#F5EFE3',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #E5DBC5',
                        }}>
                          {item.storageInfo}
                        </span>
                      </td>
                      <td data-label="Pickup Deadline">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isExpiringSoon && <AlertTriangle size={14} color="#C44824" />}
                          <span style={{
                            fontSize: '0.84rem',
                            color: isExpiringSoon ? '#C44824' : '#1C1613',
                            fontWeight: isExpiringSoon ? 700 : 600,
                          }}>
                            {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={item.status} />
                      </td>
                      <td data-label="Actions">
                        {['available', 'reserved'].includes(item.status) ? (
                          <button
                            onClick={() => handleCancelDonation(item._id)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                            title="Cancel Listing"
                          >
                            <Trash2 size={13} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                            Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* List Surplus Food Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="List Surplus Edible Food"
        subtitle="Publish available meals with required storage temperatures and pickup deadlines"
        maxWidth="580px"
      >
        <form onSubmit={handleCreateDonation}>
          <div className="form-group">
            <label className="form-label">Food Description / Meal Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Fresh Hot Meals (Dal, Rice & Roti)"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label">Food Category *</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Prepared Hot Meals</option>
                <option>Fresh Produce & Fruits</option>
                <option>Bakery & Bread</option>
                <option>Packaged & Canned Goods</option>
                <option>Dairy & Chilled Items</option>
                <option>Beverages & Snacks</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Total Quantity (in Meals) *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                placeholder="e.g. 50 (Please enter number of meals)"
                value={quantityMeals}
                onChange={(e) => setQuantityMeals(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: '#382C25', marginTop: '0.25rem', display: 'block', fontWeight: 500 }}>
                Total meal portions ready for redistribution
              </span>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label">Storage Requirement *</label>
              <select
                className="form-select"
                value={storageInfo}
                onChange={(e) => setStorageInfo(e.target.value)}
              >
                <option>Refrigerated (4°C)</option>
                <option>Room Temperature</option>
                <option>Frozen (-18°C)</option>
                <option>Hot Holding (60°C+)</option>
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Pickup Deadline *</label>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Date & Time</span>
              </div>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={pickupDeadline}
                onChange={(e) => setPickupDeadline(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setPickupDeadline(getFutureDateTime(4));
                  } else if (val.length === 10) {
                    setPickupDeadline(`${val}T18:00`);
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
                        setPickupDeadline(getFutureDateTime(preset.hours));
                      } else if (preset.target === 'noon') {
                        const d = new Date(Date.now() + 86400000);
                        const pad = (n) => String(n).padStart(2, '0');
                        setPickupDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`);
                      } else if (preset.target === 'evening') {
                        const d = new Date(Date.now() + 86400000);
                        const pad = (n) => String(n).padStart(2, '0');
                        setPickupDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`);
                      }
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-soft-border)',
                      backgroundColor: 'var(--color-warm-bg)', color: 'var(--color-coffee-dark)',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Dietary Tags</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Select all applicable</span>
            </div>
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {DIETARY_OPTIONS.map((tag) => {
                const isSelected = dietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietaryTag(tag)}
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

          <div className="form-group">
            <label className="form-label">Pickup Address</label>
            <input
              type="text"
              className="form-input"
              placeholder={user?.location?.address ? `Default: ${user.location.address}` : "e.g. Loading dock, Gate 2, 45 MG Road"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Handling & Packaging Instructions</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Bring thermal bags, rear loading entrance"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
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
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Listing Surplus...' : 'List Surplus Food'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
