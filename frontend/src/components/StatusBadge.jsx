import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  XCircle,
  Sparkles,
} from 'lucide-react';

const STATUS_CONFIG = {
  available: {
    bg: '#EAF4EC',
    text: '#1E5A4A',
    border: '#CBE5D3',
    icon: Sparkles,
    label: 'Available',
  },
  reserved: {
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: Clock,
    label: 'Reserved',
  },
  allocated: {
    bg: '#EEF2FF',
    text: '#4338CA',
    border: '#C7D2FE',
    icon: Clock,
    label: 'Allocated',
  },
  approved: {
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    icon: Clock,
    label: 'Pending NGO',
  },
  accepted: {
    bg: '#F0FDFA',
    text: '#0F766E',
    border: '#99F6E4',
    icon: CheckCircle2,
    label: 'Accepted',
  },
  picked_up: {
    bg: '#F5F3FF',
    text: '#6D28D9',
    border: '#DDD6FE',
    icon: Truck,
    label: 'In Transit',
  },
  delivered: {
    bg: '#DCFCE7',
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
    bg: '#EAF4EC',
    text: '#1E5A4A',
    border: '#CBE5D3',
    icon: Sparkles,
    label: 'Open',
  },
  urgent: {
    bg: '#FFF1ED',
    text: '#C2410C',
    border: '#FED7AA',
    icon: AlertCircle,
    label: 'Urgent',
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
      }}
    >
      <IconComponent size={13} strokeWidth={2.2} />
      <span>{config.label}</span>
    </span>
  );
}
