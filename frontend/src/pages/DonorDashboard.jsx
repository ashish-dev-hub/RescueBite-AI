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
  Building,
  Thermometer,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const getFutureDateTime = (hoursFromNow = 4) => {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
      const data = await api.getDonations({ ownOnly: 'true' });
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
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-soft-mint-border)',
            }}>
              {user?.organization || user?.name}
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
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFBEB 100%)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: '#166534' }}>
                  RescueBite
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#374151', marginTop: '0.2rem' }}>
                Forecast Date: <strong>{aiSupplyForecast.forecast_date}</strong> • Expected Surplus: <strong style={{ color: '#15803D', fontSize: '0.95rem' }}>{Math.round(aiSupplyForecast.predicted_surplus_meals)} meals</strong> (Uncertainty Bounds: {Math.round(aiSupplyForecast.surplus_p10)} – {Math.round(aiSupplyForecast.surplus_p90)} meals)
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
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                      }}>
                        {code}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
              Confidence Score: <strong>{Math.round((aiSupplyForecast.confidence_score || 0.82) * 100)}%</strong>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-muted-slate)', marginTop: '0.15rem' }}>
              Category: <strong>{aiSupplyForecast.donor_type || 'Commercial Donor'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Operational Highlights Banner */}
      <div className="dashboard-stats-grid">
        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Active Surplus Listings
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-deep-forest)', marginTop: '0.2rem' }}>
            {activeListings.length} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>open offers</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Total Available Meals
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-network-green)', marginTop: '0.2rem' }}>
            {totalAvailableMeals} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>meals awaiting</span>
          </p>
        </div>

        <div className="fresh-card" style={{ padding: '1.15rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
            Next Pickup Deadline
          </p>
          <p style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: nearestDeadline ? 'var(--color-harvest-coral)' : 'var(--color-muted-slate)',
            marginTop: '0.45rem',
          }}>
            {nearestDeadline ? nearestDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'No pending deadlines'}
          </p>
        </div>
      </div>

      {/* Your Active Donations Table */}
      <div className="fresh-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-forest)' }}>
            Your Surplus Food Listings
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
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
            <Package size={40} color="var(--color-muted-slate)" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-deep-forest)' }}>
              No active surplus listings
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginTop: '0.25rem', maxWidth: '380px', margin: '0.25rem auto 1rem auto' }}>
              Click "List Surplus Food" below to publish your first batch to local NGOs.
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
            <table className="data-table">
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
                        <strong style={{ fontSize: '0.92rem' }}>{item.foodName}</strong>
                        {item.specialInstructions && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '0.15rem' }}>
                            {item.specialInstructions}
                          </p>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{item.category}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: item.remainingQuantity > 0 ? 'var(--color-network-green)' : 'var(--color-muted-slate)',
                          }}>
                            {item.remainingQuantity}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
                            / {item.quantityMeals} meals
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.78rem',
                          backgroundColor: 'var(--color-pale-neutral)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid var(--color-soft-border)',
                        }}>
                          {item.storageInfo}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isExpiringSoon && <AlertTriangle size={14} color="var(--color-harvest-coral)" />}
                          <span style={{
                            fontSize: '0.82rem',
                            color: isExpiringSoon ? 'var(--color-harvest-coral)' : 'var(--color-dark-slate)',
                            fontWeight: isExpiringSoon ? 700 : 500,
                          }}>
                            {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
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
              placeholder="e.g. Vegetable Curry & Basmati Rice, Baked Bread Crates"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                placeholder="e.g. 50"
                value={quantityMeals}
                onChange={(e) => setQuantityMeals(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          </div>

          <div className="form-group">
            <label className="form-label">Dietary Tags</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['Vegetarian', 'Vegan', 'Halal-friendly', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'].map((tag) => {
                const isSelected = dietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietaryTag(tag)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-btn-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'var(--color-network-green)' : 'var(--color-pale-neutral)',
                      color: isSelected ? '#FFFFFF' : 'var(--color-deep-forest)',
                      border: `1px solid ${isSelected ? 'var(--color-network-green)' : 'var(--color-soft-border)'}`,
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
              placeholder="Address where vehicle will collect food"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Handling & Packaging Instructions</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Bring thermal insulated bags; back entrance access code 4821"
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
              {submitting ? 'Publishing...' : 'Publish Surplus Food'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
