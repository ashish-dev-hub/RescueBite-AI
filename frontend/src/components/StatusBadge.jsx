import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  available: {
    bg: '#EAF4EC',
    text: '#1F6F43',
    border: '#CBE5D3',
    icon: CheckCircle2,
    label: 'Available',
  },
  reserved: {
    bg: '#F5F0E6',
    text: '#6E5D53',
    border: '#DDD0B8',
    icon: Clock,
    label: 'Reserved',
  },
  allocated: {
    bg: '#EAF4EC',
    text: '#1F6F43',
    border: '#B9D7BF',
    icon: Clock,
    label: 'Allocated',
  },
  approved: {
    bg: '#FFF4ED',
    text: '#C44824',
    border: '#FAD5C5',
    icon: Clock,
    label: 'Pending NGO',
  },
  accepted: {
    bg: '#EAF4EC',
    text: '#1F6F43',
    border: '#B9D7BF',
    icon: CheckCircle2,
    label: 'Accepted',
  },
  picked_up: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    icon: Truck,
    label: 'In Transit',
  },
  delivered: {
    bg: '#EAF4EC',
    text: '#15803D',
    border: '#86EFAC',
    icon: PackageCheck,
    label: 'Delivered',
  },
  rejected: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
    icon: XCircle,
    label: 'Declined',
  },
  cancelled: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    icon: XCircle,
    label: 'Cancelled',
  },
  open: {
    bg: '#FFF8F0',
    text: '#C2410C',
    border: '#FED7AA',
    icon: Clock,
    label: 'Awaiting Match',
  },
  partially_fulfilled: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    icon: Clock,
    label: 'Partially Fulfilled',
  },
  fulfilled: {
    bg: '#EAF4EC',
    text: '#15803D',
    border: '#86EFAC',
    icon: CheckCircle2,
    label: 'Fulfilled',
  },
  standard: {
    bg: '#F5F0E6',
    text: '#5C4E46',
    border: '#DDD0B8',
    icon: Clock,
    label: 'Standard',
  },
  urgent: {
    bg: '#FFF1ED',
    text: '#C44824',
    border: '#FAD5C5',
    icon: AlertCircle,
    label: 'Urgent',
  },
  critical: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    icon: AlertCircle,
    label: 'Critical Deficit',
  },
};

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status || 'available').toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.available;
  const IconComponent = config.icon;

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: '6px',
        padding: '0.22rem 0.55rem',
        fontSize: '0.78rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      <IconComponent size={13} strokeWidth={2.4} />
      <span>{config.label}</span>
    </span>
  );
}
