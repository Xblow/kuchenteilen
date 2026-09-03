import React from 'react';
import { Text, TextStyle } from 'react-native';

const C = {
  success: '#22C55E',
  danger: '#EF4444',
  text: '#1A1A2E',
};

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'Fr', CAD: 'CA$', AUD: 'A$',
  NZD: 'NZ$', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč',
  HUF: 'Ft', RON: 'lei', BGN: 'лв', HRK: 'kn', RUB: '₽', CNY: '¥',
  KRW: '₩', INR: '₹', BRL: 'R$', MXN: '$', SGD: 'S$', HKD: 'HK$',
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? currency;
}

interface Props {
  cents: number;
  currency: string;
  style?: TextStyle;
  colored?: boolean;
}

export function AmountText({ cents, currency, style, colored }: Props) {
  const dollars = (Math.abs(cents) / 100).toFixed(2);
  const symbol = currencySymbol(currency);
  const sign = cents < 0 ? '-' : '';
  const label = `${sign}${symbol}${dollars}`;

  let color = C.text;
  if (colored) {
    if (cents > 0) color = C.success;
    else if (cents < 0) color = C.danger;
  }

  return <Text style={[{ color }, style]}>{label}</Text>;
}
