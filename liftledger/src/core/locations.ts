/** Default pickup and dropoff location options for the registration form. */

export const PICKUP_LOCATIONS = ['Deira', 'Bur Dubai', 'Burjuman', 'Karama', 'Satwa'] as const;

export const DROPOFF_LOCATIONS = ['Al Quoz 1', 'Al Quoz 2', 'Al Quoz 3', 'Al Quoz 4', 'Umm Suqeim'] as const;

export type PickupLocation = (typeof PICKUP_LOCATIONS)[number];
export type DropoffLocation = (typeof DROPOFF_LOCATIONS)[number];
