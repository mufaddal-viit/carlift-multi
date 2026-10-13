'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaymentInput, Repository, Session, Trip } from '@/core/repo/types';

const RepoContext = createContext<Repository | null>(null);
const SessionContext = createContext<Session | null>(null);

export const RepoProvider = ({ repo, children }: { repo: Repository; children: ReactNode }) => (
  <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
);

export const SessionProvider = ({ session, children }: { session: Session; children: ReactNode }) => (
  <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
);

export function useRepo(): Repository {
  const repo = useContext(RepoContext);
  if (!repo) throw new Error('useRepo must be used inside Providers');
  return repo;
}

/** The signed-in user. Only available inside a portal layout. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside a portal layout');
  return session;
}

const LIVE = ['dashboard', 'statusBoard', 'payments', 'trips', 'passengers'];

function useInvalidateLive() {
  const client = useQueryClient();
  return () => Promise.all(LIVE.map((key) => client.invalidateQueries({ queryKey: [key] })));
}

export function useDemoUsers() {
  const repo = useRepo();
  return useQuery({ queryKey: ['demoUsers'], queryFn: () => repo.demoUsers() });
}

export function useCompany() {
  const repo = useRepo();
  const s = useSession();
  return useQuery({ queryKey: ['company', s.userId], queryFn: () => repo.company(s) });
}

export function useDashboard(month: string) {
  const repo = useRepo();
  const s = useSession();
  return useQuery({
    queryKey: ['dashboard', s.userId, month],
    queryFn: () => repo.dashboard(s, month),
    placeholderData: (previous) => previous,
  });
}

export function useStatusBoard(month: string) {
  const repo = useRepo();
  const s = useSession();
  return useQuery({ queryKey: ['statusBoard', s.userId, month], queryFn: () => repo.statusBoard(s, month) });
}

export function usePassengers() {
  const repo = useRepo();
  const s = useSession();
  return useQuery({ queryKey: ['passengers', s.userId], queryFn: () => repo.passengers(s) });
}

export function useCars() {
  const repo = useRepo();
  const s = useSession();
  return useQuery({ queryKey: ['cars', s.userId], queryFn: () => repo.cars(s) });
}

export function useLogPayment() {
  const repo = useRepo();
  const s = useSession();
  const invalidate = useInvalidateLive();
  return useMutation({ mutationFn: (input: PaymentInput) => repo.logPayment(s, input), onSuccess: invalidate });
}

export function useMarkTrips() {
  const repo = useRepo();
  const s = useSession();
  const invalidate = useInvalidateLive();
  return useMutation({
    mutationFn: (v: { date: string; marks: { passengerId: string; status: Trip['status'] }[] }) =>
      repo.markTrips(s, v.date, v.marks),
    onSuccess: invalidate,
  });
}
