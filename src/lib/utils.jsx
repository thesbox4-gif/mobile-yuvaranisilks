import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a');
  } catch {
    return dateStr;
  }
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
};

export const shortId = (id) => (id ? id.slice(-8).toUpperCase() : '—');

export const truncate = (str, n = 40) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

export const initials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
};

export const discountedPrice = (base, pct) => {
  if (!pct) return base;
  return Math.round(base - (base * pct) / 100);
};
