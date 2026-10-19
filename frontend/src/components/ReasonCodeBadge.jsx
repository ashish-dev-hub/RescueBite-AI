import React from 'react';
import { Target, Zap, Navigation, Layers, ShieldAlert } from 'lucide-react';

const REASON_LABELS = {
  DEMAND_MATCH: {
    label: 'Demand Match',
    icon: Target,
    desc: 'Surplus quantity meets recipient hunger need',
  },
  DEADLINE_SOON: {
    label: 'Urgent Deadline',
    icon: Zap,
    desc: 'Expiring soon; prioritized to prevent food waste',
  },
  NEARBY: {
    label: 'Local Proximity',
    icon: Navigation,
    desc: 'Close geographic distance minimizes transit time',
  },
  CAPACITY_FIT: {
    label: 'Storage Match',
    icon: Layers,
    desc: 'Fits recipient intake & refrigerator capacity',
  },
  HIGH_BENEFICIARY_PRIORITY: {
    label: 'Critical Need',
    icon: ShieldAlert,
    desc: 'Beneficiary group facing urgent meal deficit',
  },
};

export default function ReasonCodeBadge({ code }) {
  const info = REASON_LABELS[code] || {
    label: code.replace(/_/g, ' '),
    icon: Target,
    desc: '',
  };
  const Icon = info.icon;

  return (
    <span className="reason-tag" title={info.desc}>
      <Icon size={12} strokeWidth={2.4} />
      <span>{info.label}</span>
    </span>
  );
}
