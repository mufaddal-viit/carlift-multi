import type { Passenger, Payment, Trip } from '../repo/types';

export const pax = (o: Partial<Passenger> = {}): Passenger => ({
  id: 'p1', companyId: 'c1', carId: 'car1', name: 'A', phone: '971500000000',
  pickupArea: 'X', dropArea: 'Y', route: 'X → Y', seatNumber: 1,
  billingType: 'monthly', monthlyFee: 350, perTripFee: 0, joinDate: '2026-01-01',
  status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01', ...o,
});

export const pay = (amount: number, forMonth: string, o: Partial<Payment> = {}): Payment => ({
  id: `pay-${amount}-${forMonth}`, companyId: 'c1', passengerId: 'p1', amount, date: `${forMonth}-03`,
  method: 'cash', forMonth, loggedByUserId: 'u1', createdAt: `${forMonth}-03`, ...o,
});

export const trip = (date: string, status: Trip['status'] = 'travelled', passengerId = 'p1'): Trip =>
  ({ id: `t-${passengerId}-${date}`, companyId: 'c1', passengerId, date, status });
