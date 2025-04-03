export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

// Add more currencies as needed
export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tugrik" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

/**
 * Gets the currency symbol for a given currency code.
 * Falls back to the code itself if the symbol is not found.
 * @param code The currency code (e.g., 'USD'). Case-insensitive.
 * @returns The currency symbol (e.g., '$') or the code if not found.
 */
export const getCurrencySymbol = (code: string | null | undefined): string => {
  if (!code) return "";
  const currency = CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  return currency?.symbol || code; // Fallback to code if symbol not found
};

/**
 * Formats a number as currency with the appropriate symbol.
 * Uses Intl.NumberFormat for locale-aware formatting if possible,
 * otherwise falls back to basic symbol + fixed decimal places.
 * @param amount The numeric amount.
 * @param currencyCode The currency code (e.g., 'USD').
 * @param locale Optional locale string (e.g., 'en-US'). Defaults to undefined (system default).
 * @returns The formatted currency string.
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  locale: string | undefined = undefined
): string => {
  if (amount === null || amount === undefined || !currencyCode) return "";

  try {
    // Use Intl.NumberFormat for better localization and formatting
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      // minimumFractionDigits: 2, // Default for most currencies
      // maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currency codes or environments
    console.warn(`Intl.NumberFormat failed for ${currencyCode}:`, error);
    const symbol = getCurrencySymbol(currencyCode);
    // Basic fallback formatting
    return `${symbol}${amount.toFixed(2)}`;
  }
};
