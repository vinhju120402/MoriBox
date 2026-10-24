// Payment methods offered at checkout.
//
// WORKING today:
//   cod            - pay cash to the courier on delivery (no external service)
//   bank_transfer  - customer scans a VietQR code and transfers manually; staff
//                    confirm receipt in the admin panel. Needs the shop's bank
//                    details, set by an admin in "Cài đặt cửa hàng".
//
// NOT CONNECTED yet (shown as "sắp ra mắt"): MoMo, ZaloPay, VNPay, card.
// Each needs a merchant account plus server-side code that signs the payment
// request and receives the gateway's confirmation callback (IPN/webhook) —
// secrets that must never live in this browser app.

import type { DictionaryKey } from '../app/i18n/dictionary';

export type PaymentMethodId = 'cod' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay' | 'card';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

// Dictionary keys for the labels (use with t()).
export const paymentLabelKey = (id: PaymentMethodId) => `pay.method.${id}` as DictionaryKey;
export const paymentFullKey = (id: PaymentMethodId) => `pay.full.${id}` as DictionaryKey;
export const paymentDescKey = (id: PaymentMethodId) => `pay.desc.${id}` as DictionaryKey;
export const paymentStatusKey = (s: PaymentStatus) => `pay.status.${s}` as DictionaryKey;

/** The slice of the shop settings that describes the shop's bank account. */
export interface BankInfo {
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
  bankName: string;
}

export const isBankConfigured = (b: BankInfo) => !!(b.bankBin && b.bankAccount && b.bankAccountName);

export interface PaymentMethod {
  id: PaymentMethodId;
  labelKey: DictionaryKey;
  descriptionKey: DictionaryKey;
  available: boolean;
}

export function getPaymentMethods(bank: BankInfo): PaymentMethod[] {
  const entry = (id: PaymentMethodId, available: boolean): PaymentMethod => ({
    id,
    labelKey: paymentFullKey(id),
    descriptionKey: paymentDescKey(id),
    available,
  });
  return [
    entry('cod', true),
    entry('bank_transfer', isBankConfigured(bank)),
    entry('momo', false),
    entry('zalopay', false),
    entry('vnpay', false),
    entry('card', false),
  ];
}

// Image from the public VietQR service — encodes bank + account + amount + note.
// (Only the amount and the order code are sent to that service.)
export function vietQrUrl(bank: BankInfo, amount: number, transferNote: string): string {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: transferNote,
    accountName: bank.bankAccountName,
  });
  return `https://img.vietqr.io/image/${bank.bankBin}-${bank.bankAccount}-compact2.png?${params.toString()}`;
}

export function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return typeof value === 'string' && ['cod', 'bank_transfer', 'momo', 'zalopay', 'vnpay', 'card'].includes(value);
}
