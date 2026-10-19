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

export type PaymentMethodId = 'cod' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay' | 'card';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

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
  label: string;
  description: string;
  available: boolean;
}

export function getPaymentMethods(bank: BankInfo): PaymentMethod[] {
  return [
    {
      id: 'cod',
      label: 'Thanh toán khi nhận hàng (COD)',
      description: 'Trả tiền mặt cho người giao hàng khi bạn nhận và kiểm tra hàng.',
      available: true,
    },
    {
      id: 'bank_transfer',
      label: 'Chuyển khoản ngân hàng (QR)',
      description: 'Quét mã VietQR bằng app ngân hàng, đơn được xác nhận khi shop nhận được tiền.',
      available: isBankConfigured(bank),
    },
    { id: 'momo', label: 'Ví MoMo', description: 'Thanh toán nhanh bằng ví điện tử MoMo.', available: false },
    { id: 'zalopay', label: 'ZaloPay', description: 'Thanh toán bằng ví ZaloPay.', available: false },
    { id: 'vnpay', label: 'VNPay (ATM / QR / thẻ nội địa)', description: 'Thanh toán qua cổng VNPay.', available: false },
    { id: 'card', label: 'Thẻ Visa / Mastercard', description: 'Thanh toán bằng thẻ quốc tế.', available: false },
  ];
}

export const PAYMENT_LABEL: Record<PaymentMethodId, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  vnpay: 'VNPay',
  card: 'Thẻ',
};

export const PAYMENT_METHOD_FULL_LABEL: Record<PaymentMethodId, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng (QR)',
  momo: 'Ví MoMo',
  zalopay: 'ZaloPay',
  vnpay: 'VNPay',
  card: 'Thẻ Visa / Mastercard',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thu tiền',
  paid: 'Đã thu tiền',
  refunded: 'Đã hoàn tiền',
};

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
