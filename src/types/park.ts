export interface ParkFeature {
  id: string;
  type: string;
  count?: number;
  description: string;
}

export interface ParkInfo {
  slug: string;
  name: string;
  borough: string;
  location: { lat: number; lng: number };
  address?: string;
  nearestSubway?: string;
  parkType: string;
  surfaceType?: string;
  sunExposure?: string;
  drainage?: string;
  coveredPct?: number;
  isGated?: boolean;
  hours?: { open: string; close: string } | null;
  features: ParkFeature[];
  heroImage?: string;
  updatedAt?: string;
}

export interface ConditionReport {
  reporter: string;
  reportedAt: string;
  status: string;
  surface?: number;
  crowd?: number;
  notes?: string;
  photos?: string[];
}

export interface ParkConditions {
  slug: string;
  compositeStatus: string | null;
  avgSurface: number | null;
  avgCrowd: number | null;
  activeHazards: string[];
  reportCount: number;
  lastReportAt: string | null;
  dryEstimate: string | null;
  reports: ConditionReport[];
  updatedAt: string | null;
}
