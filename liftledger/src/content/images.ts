/**
 * Every photograph the app uses, in one place. All are from Unsplash under the Unsplash licence;
 * `credit` is the photographer. Screens refer to photos by key, never by raw URL.
 */
export interface ImageEntry {
  id: string;
  alt: { en: string; ar: string };
  credit: string;
  width: number;
  height: number;
}

export const images = {
  heroCity: {
    id: 'photo-1652707228067-25672fa0b082',
    alt: { en: 'A city skyline at night seen from the top of a skyscraper', ar: 'أفق المدينة ليلاً من أعلى ناطحة سحاب' },
    credit: 'PhotoHound',
    width: 7360,
    height: 4912,
  },
  skylineDusk: {
    id: 'photo-1623725259601-b8c41ad6a532',
    alt: { en: 'A city skyline across the water at sunset', ar: 'أفق المدينة عبر الماء عند الغروب' },
    credit: 'Ahmed Galal',
    width: 5345,
    height: 3871,
  },
  vanRoad: {
    id: 'photo-1647702504702-6b3dc40eafe5',
    alt: { en: 'A white van driving down a street beside tall buildings', ar: 'حافلة بيضاء تسير في شارع بجانب مبانٍ عالية' },
    credit: 'Big Dodzy',
    width: 7008,
    height: 4672,
  },
  commuters: {
    id: 'photo-1646173864575-4d39caaa8e37',
    alt: { en: 'Passengers sitting next to each other on a bus', ar: 'ركاب يجلسون جنباً إلى جنب في حافلة' },
    credit: 'Allen Yoo',
    width: 5353,
    height: 3569,
  },
  driverPortrait: {
    id: 'photo-1521136095380-08fbd7be93c8',
    alt: { en: 'A man driving during golden hour', ar: 'رجل يقود مركبته وقت الغروب' },
    credit: 'Darwin Vegher',
    width: 5971,
    height: 3981,
  },
  phonePay: {
    id: 'photo-1509017174183-0b7e0278f1ec',
    alt: { en: 'A person holding a smartphone', ar: 'شخص يحمل هاتفاً ذكياً' },
    credit: 'Jonas Leupe',
    width: 4139,
    height: 2759,
  },
  hiace: {
    id: 'photo-1641199788912-9a7385a35c82',
    alt: { en: 'A white van parked at the side of the road', ar: 'حافلة بيضاء متوقفة على جانب الطريق' },
    credit: 'Mathias Reding',
    width: 6214,
    height: 3497,
  },
  urvan: {
    id: 'photo-1639416943955-c1281e3c2da3',
    alt: { en: 'A white van driving down a street at night', ar: 'حافلة بيضاء تسير في شارع ليلاً' },
    credit: 'Dwiinshito',
    width: 5184,
    height: 3888,
  },
  emptyRoad: {
    id: 'photo-1511173855943-aeec034188a9',
    alt: { en: 'An empty road stretching through open landscape', ar: 'طريق خالٍ يمتد وسط منظر طبيعي مفتوح' },
    credit: 'Leximphoto',
    width: 2500,
    height: 1667,
  },
} satisfies Record<string, ImageEntry>;

export type ImageKey = keyof typeof images;

export const unsplashUrl = (key: ImageKey, width: number, quality = 70): string =>
  `https://images.unsplash.com/${images[key].id}?w=${width}&q=${quality}&auto=format&fit=crop`;

/** Car photos are chosen by the `photoKey` stored on a car; unknown keys fall back to a generic van. */
export const carImage = (photoKey: string): ImageKey => (photoKey in images ? (photoKey as ImageKey) : 'hiace');
