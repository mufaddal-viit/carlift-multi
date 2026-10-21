'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import type { PublicCompany } from '@/core/repo/types';

const TenantContext = createContext<PublicCompany | null>(null);

export const TenantProvider = ({ company, children }: { company: PublicCompany; children: ReactNode }) => (
  <TenantContext.Provider value={company}>{children}</TenantContext.Provider>
);

/** The company whose address the page is under. Only available below /[locale]/[company]. */
export function useTenant(): PublicCompany {
  const company = useContext(TenantContext);
  if (!company) throw new Error('useTenant must be used below a company address');
  return company;
}

/** Turns a portal path into the company's address: '/app/payments' → '/al-majra-transport/app/payments'. */
export function useTenantPath(): (path: string) => string {
  const { slug } = useTenant();
  return useCallback((path: string) => `/${slug}${path === '/' ? '' : path}`, [slug]);
}
