import { api } from './api';

export interface PromoConfig {
  active: boolean;
  type: 'image' | 'text';
  imageData: string;
  title: string;
  text: string;
  fontFamily: string;   // cond | sans | mono
  color: string;
  bgColor: string;
  animation: string;    // none | fade | slide | pulse
  autoCloseSec: number;
  ctaText: string;
  ctaLink: string;
  discountPct: number;
  discountM2: string[];
  startDate: string;
  endDate: string;
  branchId?: string;
  updatedAt?: string;
}

export const getPromo = async (branchId: string): Promise<PromoConfig> => {
  const r = await api.get(`/promo/branch/${encodeURIComponent(branchId)}`);
  return r.data;
};

export const savePromo = async (branchId: string, data: Partial<PromoConfig>): Promise<PromoConfig> => {
  const r = await api.put(`/promo/branch/${encodeURIComponent(branchId)}`, data);
  return r.data;
};
