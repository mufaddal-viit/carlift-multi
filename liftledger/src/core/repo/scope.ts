import type { Car, Db, Passenger, Session, User } from './types';

export type WriteAction = 'passenger' | 'payment' | 'trip' | 'fleet';

/**
 * The session only says who is asking. What they may see comes from the stored
 * user record, so a tampered session cannot widen its own access.
 */
function actor(s: Session, db: Db): User | null {
  return db.users.find((u) => u.id === s.userId && u.role === s.role && u.companyId === s.companyId) ?? null;
}

export function visibleCars(s: Session, db: Db): Car[] {
  const u = actor(s, db);
  if (!u) return [];
  if (u.role === 'admin') return db.cars;
  const company = db.cars.filter((c) => c.companyId === u.companyId);
  if (u.role === 'manager') return company;
  if (u.role === 'driver') return company.filter((c) => c.driverId !== null && c.driverId === u.linkedDriverId);
  const me = db.passengers.find((p) => p.id === u.linkedPassengerId);
  return company.filter((c) => c.id === me?.carId);
}

export function visiblePassengers(s: Session, db: Db): Passenger[] {
  const u = actor(s, db);
  if (!u) return [];
  if (u.role === 'admin') return db.passengers;
  const company = db.passengers.filter((p) => p.companyId === u.companyId);
  if (u.role === 'manager') return company;
  if (u.role === 'driver') {
    const mine = new Set(visibleCars(s, db).map((c) => c.id));
    return company.filter((p) => mine.has(p.carId));
  }
  return company.filter((p) => p.id === u.linkedPassengerId);
}

export function canWrite(s: Session, action: WriteAction, target: { companyId: string; carId?: string }, db: Db): boolean {
  const u = actor(s, db);
  if (!u || u.companyId !== target.companyId) return false;
  if (u.role === 'manager') return true;
  if (u.role === 'driver') {
    if (action !== 'payment' && action !== 'trip') return false;
    return visibleCars(s, db).some((c) => c.id === target.carId);
  }
  return false;
}
