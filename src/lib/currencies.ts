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
  if (!code) return "$"; // Default to $ if no code provided
  const currency = CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
  return currency?.symbol || code; // Fallback to code if symbol not found
};

/**
 * Formats a number as currency, prioritizing the symbol.
 * Uses Intl.NumberFormat for number formatting only.
 * @param amount The numeric amount.
 * @param currencyCode The currency code (e.g., 'USD').
 * @param locale Optional locale string (e.g., 'en-US'). Defaults to undefined (system default).
 * @returns The formatted currency string with symbol first.
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  locale: string | undefined = undefined
): string => {
  // Handle null/undefined amount gracefully
  const numericAmount = amount ?? 0;
  const code = currencyCode ?? "USD"; // Default to USD if no code

  const symbol = getCurrencySymbol(code);

  try {
    // Use Intl.NumberFormat just for number formatting (commas, decimals)
    const numberFormatter = new Intl.NumberFormat(locale, {
      // style: 'currency', // REMOVED
      // currency: code, // REMOVED
      minimumFractionDigits: 2, // Keep decimals consistent
      maximumFractionDigits: 2,
    });
    // Manually prepend the symbol
    return `${symbol}${numberFormatter.format(numericAmount)}`;
  } catch (error) {
    // Fallback for environments without Intl support or other errors
    console.warn(`Intl.NumberFormat failed for locale/number:`, error);
    // Basic fallback formatting
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
};
