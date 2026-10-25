import React from 'react';
import {
  Target,
  Zap,
  Navigation,
  Layers,
  ShieldAlert,
  CheckCircle,
  Leaf,
  Clock,
  Building,
  AlertTriangle,
} from 'lucide-react';

const REASON_LABELS = {
  // Model B ML Reason Codes
  HIGH_DELIVERY_SUCCESS: {
    label: 'High Delivery Success',
    icon: CheckCircle,
    desc: 'ML Model predicts >70% likelihood of successful completion',
  },
  NEARBY_LOCATION: {
    label: 'Nearby (<5km)',
    icon: Navigation,
    desc: 'Close distance minimizes transit time and carbon footprint',
  },
  EXTENDED_TRANSIT_DISTANCE: {
    label: 'Extended Distance',
    icon: AlertTriangle,
    desc: 'Transit exceeds 12km; insulated containers recommended',
  },
  DIETARY_COMPATIBLE_VEG: {
    label: 'Veg Compatible',
    icon: Leaf,
    desc: 'Meets vegetarian dietary requirements',
  },
  DIETARY_VERIFIED_NONVEG: {
    label: 'Non-Veg Accepted',
    icon: CheckCircle,
    desc: 'Facility confirmed to accept non-vegetarian donations',
  },
  ADEQUATE_RECEIVING_CAPACITY: {
    label: 'Capacity Matched',
    icon: Layers,
    desc: 'Fits within recipient storage and intake thresholds',
  },
  HIGH_CAPACITY_UTILIZATION_WARNING: {
    label: 'High Intake Volume',
    icon: AlertTriangle,
    desc: 'Allocation fills >85% of recipient daily capacity',
  },
  COMFORTABLE_PICKUP_WINDOW: {
    label: 'Safe Time Buffer',
    icon: Clock,
    desc: 'Ample transit time before food safe hours expire',
  },
  URGENT_PICKUP_REQUIRED: {
    label: 'Urgent Pickup',
    icon: Zap,
    desc: 'Immediate dispatch required to preserve food quality',
  },

  // Beneficiary Facility Tags
  BENEFICIARY_FACILITY_ORPHANAGE: {
    label: 'Orphanage Facility',
    icon: Building,
    desc: 'Verified child care institution',
  },
  BENEFICIARY_FACILITY_COMMUNITY_KITCHEN: {
    label: 'Community Kitchen',
    icon: Building,
    desc: 'High-volume community meal distribution center',
  },
  BENEFICIARY_FACILITY_SHELTER: {
    label: 'Shelter Home',
    icon: Building,
    desc: 'Temporary shelter housing vulnerable beneficiaries',
  },
  BENEFICIARY_FACILITY_SOUP_KITCHEN: {
    label: 'Soup Kitchen',
    icon: Building,
    desc: 'Direct walk-in hot meal feeding center',
  },

  // Deterministic Heuristic Reason Codes
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
    label: code.replace(/^BENEFICIARY_FACILITY_/, '').replace(/_/g, ' '),
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
