export type Role = 'admin' | 'manager' | 'driver' | 'rider';
export type PayMethod = 'cash' | 'transfer' | 'wallet';
export type BillingType = 'monthly' | 'perTrip';
export type Locale = 'en' | 'ar';

export interface Plan {
  id: string;
  name: string;
  priceAed: number;
  maxCars: number | null;
  maxRiders: number | null;
  features: string[];
}

export interface Company {
  id: string;
  name: string;
  tradeLicense?: string;
  city: string;
  phone: string;
  planId: string;
  status: 'active' | 'suspended' | 'trial';
  dueDay: number;
  currency: 'AED';
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string | null;
  role: Role;
  name: string;
  email?: string;
  phone: string;
  password: string;
  locale: Locale;
  linkedDriverId?: string;
  linkedPassengerId?: string;
}

export interface Car {
  id: string;
  companyId: string;
  model: string;
  plate: string;
  capacity: number;
  driverId: string | null;
  status: 'active' | 'inactive';
  photoKey: string;
}

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  licenseNo?: string;
  status: 'active' | 'inactive';
}

export interface Passenger {
  id: string;
  companyId: string;
  carId: string;
  name: string;
  phone: string;
  pickupArea: string;
  dropArea: string;
  route: string;
  seatNumber: number;
  billingType: BillingType;
  monthlyFee: number;
  perTripFee: number;
  joinDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  companyId: string;
  passengerId: string;
  amount: number;
  date: string;
  method: PayMethod;
  forMonth: string;
  note?: string;
  loggedByUserId: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  companyId: string;
  passengerId: string;
  date: string;
  status: 'travelled' | 'absent';
}
