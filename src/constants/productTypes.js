/** Top-level collection slugs — fixed bundled photos, no user upload. */
export const COLLECTION_ROOT_SLUGS = ['saree', 'jewellery'];

export function isCollectionRoot(category) {
  if (!category) return false;
  return !category.parent_id && COLLECTION_ROOT_SLUGS.includes(category.slug);
}

export const PRODUCT_TYPE_CARDS = [
  {
    key: 'saree',
    slug: 'saree',
    label: 'Sarees',
    subtitle: 'Silks, cottons & handloom weaves',
    image: require('../../assets/saree.jpg'),
    bgColor: '#fff1f2',
    textColor: '#9f1239',
    borderColor: '#fecdd3',
    accentColor: '#db2777',
    icon: 'shirt-outline',
  },
  {
    key: 'jewellery',
    slug: 'jewellery',
    label: 'Gold & Jewellery',
    subtitle: 'Necklaces, bangles & temple gold',
    image: require('../../assets/jewellery.jpg'),
    bgColor: '#fffbeb',
    textColor: '#92400e',
    borderColor: '#fde68a',
    accentColor: '#d97706',
    icon: 'diamond-outline',
  },
];

export const PRODUCT_TYPE_MAP = Object.fromEntries(
  PRODUCT_TYPE_CARDS.map((t) => [t.key, t])
);
