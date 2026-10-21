export type Role = 'admin' | 'manager' | 'driver' | 'passenger';
export type PayMethod = 'cash' | 'transfer' | 'wallet';
export type BillingType = 'monthly' | 'perTrip';
export type Locale = 'en' | 'ar';

export interface Plan {
  id: string;
  name: string;
  priceAed: number;
  maxCars: number | null;
  maxPassengers: number | null;
  features: string[];
}

export interface Company {
  id: string;
  /** The company's address in URLs: /en/{slug}/login. Unique across the platform. */
  slug: string;
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
  /** Null while the passenger waits for a car. */
  carId: string | null;
  name: string;
  employerName: string;
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
  /** Sequential within the company; shown as R-000123. */
  receiptNo: number;
  /** Voided payments stay on record but count towards nothing. */
  voided: boolean;
  voidedAt?: string;
  voidedByUserId?: string;
  voidReason?: string;
  createdAt: string;
}

/** A payment with the names a list or receipt shows next to it. */
export interface PaymentEntry extends Payment {
  passengerName: string;
  employerName: string;
  passengerPhone: string;
  loggedByName: string | null;
  voidedByName: string | null;
}

/** Everything a printed or shared receipt needs. */
export interface Receipt {
  payment: PaymentEntry;
  company: Pick<Company, 'name' | 'phone' | 'city' | 'tradeLicense'>;
}

export interface Trip {
  id: string;
  companyId: string;
  passengerId: string;
  date: string;
  status: 'travelled' | 'absent';
}

export interface Db {
  version: number;
  seedMonth: string;
  plans: Plan[];
  companies: Company[];
  users: User[];
  cars: Car[];
  drivers: Driver[];
  passengers: Passenger[];
  payments: Payment[];
  trips: Trip[];
}

export interface Session {
  userId: string;
  role: Role;
  companyId: string | null;
  /** Kept in the signed cookie so the URL guard can check the company without a database call. */
  companySlug: string | null;
  name: string;
  locale: Locale;
}

export interface StatusRow {
  passenger: Passenger;
  car: Car | null;
  driver: Driver | null;
  ledger: import('../billing/engine').Ledger;
}

/** A car with its driver and how many active passengers ride in it. */
export type FleetCar = Car & { driver: Driver | null; passengers: number };

/** One change of a passenger's car. */
export interface CarAssignment {
  id: string;
  passengerId: string;
  fromCarId: string | null;
  toCarId: string | null;
  /** Null when the system chose the car at self-registration. */
  byUserId: string | null;
  byName: string | null;
  at: string;
}

export interface DashboardData {
  summary: import('../billing/summary').CompanySummary;
  rows: StatusRow[];
  recentPayments: (Payment & { passengerName: string })[];
  cars: FleetCar[];
}

export type PassengerInput = Pick<
  Passenger,
  'carId' | 'name' | 'employerName' | 'phone' | 'pickupArea' | 'dropArea' | 'seatNumber' | 'billingType' | 'monthlyFee' | 'perTripFee' | 'joinDate'
>;

export type PaymentInput = Pick<Payment, 'passengerId' | 'amount' | 'date' | 'method' | 'forMonth' | 'note'>;

export type RegistrationInput = Pick<Passenger, 'name' | 'employerName' | 'phone' | 'pickupArea' | 'dropArea'>;

export type DemoUser = Pick<User, 'id' | 'name' | 'role' | 'email' | 'companyId'>;

/** What anyone may know about a company: enough to brand its login and registration pages. */
export type PublicCompany = Pick<Company, 'id' | 'slug' | 'name' | 'phone' | 'status'>;

export interface Repository {
  /** Signs in to one company (by slug), or to the platform console when the slug is null. */
  login(identifier: string, password: string, companySlug: string | null): Promise<Session>;
  /** The demo accounts shown on a company login page, or the platform admin when the slug is null. */
  demoUsers(companySlug: string | null): Promise<DemoUser[]>;
  company(s: Session): Promise<Company>;
  cars(s: Session): Promise<Car[]>;
  drivers(s: Session): Promise<Driver[]>;
  passengers(s: Session): Promise<Passenger[]>;
  passenger(s: Session, id: string): Promise<Passenger>;
  savePassenger(s: Session, input: PassengerInput, id?: string): Promise<Passenger>;
  deactivatePassenger(s: Session, id: string): Promise<Passenger>;
  /** Cars with their driver and seats taken, for choosing where a passenger rides. */
  fleet(s: Session): Promise<FleetCar[]>;
  /** Manager: put a passenger in a car (checks it is active, in the company and has a free seat), or take them out with null. */
  assignCar(s: Session, passengerId: string, carId: string | null): Promise<Passenger>;
  /** A passenger's car changes, newest first. */
  assignments(s: Session, passengerId: string): Promise<CarAssignment[]>;
  payments(s: Session, month?: string): Promise<Payment[]>;
  logPayment(s: Session, input: PaymentInput): Promise<Payment>;
  /** A month's payments (by the month they pay for), voided ones included and flagged, newest first. */
  paymentLedger(s: Session, month: string): Promise<PaymentEntry[]>;
  /** Manager: void a payment with a reason. It stays on record and leaves every total. */
  voidPayment(s: Session, id: string, reason: string): Promise<PaymentEntry>;
  /** One payment's receipt. */
  receipt(s: Session, id: string): Promise<Receipt>;
  trips(s: Session, date: string): Promise<Trip[]>;
  markTrips(s: Session, date: string, marks: { passengerId: string; status: Trip['status'] }[]): Promise<Trip[]>;
  statusBoard(s: Session, month: string): Promise<StatusRow[]>;
  dashboard(s: Session, month: string): Promise<DashboardData>;
  /** Public: get company name by id (no auth required). */
  companyById(companyId: string): Promise<PublicCompany | null>;
  /** Public: the company at an address, or null when there is none. */
  companyBySlug(slug: string): Promise<PublicCompany | null>;
  /** Server only: the current address of a company that used to be at `slug`, or null. */
  currentSlugFor(oldSlug: string): Promise<string | null>;
  /** Public: self-register a passenger from QR/link (no auth required). */
  registerPassenger(companyId: string, input: RegistrationInput): Promise<Passenger>;
}
