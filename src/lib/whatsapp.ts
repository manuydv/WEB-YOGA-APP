/** `https://wa.me/...` link, prefilled with `message`. Assumes a bare 10-digit number is Indian and adds the 91 country code; leaves anything else as-is. */
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
