/**
 * Card processing costs on a rent payment.
 *
 * UK domestic card processing is 1.5% + 20p, plus a 3.5% managed payments fee,
 * so the combined cost is 5% + 20p of the amount charged.
 */
export const CARD_FEE_PERCENT = 0.05;
export const CARD_FEE_FIXED = 0.2;

/** Card processing rates by card type (UK, before the managed payments fee). */
export const MANAGED_PAYMENTS_PERCENT = 0.035;
export const CARD_RATES = {
  ukDomestic: { percent: 0.015, fixed: 0.2, label: "UK cards" },
  eea: { percent: 0.025, fixed: 0.2, label: "European (EEA) cards" },
  international: { percent: 0.0325, fixed: 0.2, label: "International cards" },
} as const;

/**
 * Pay by bank (open banking) is 0.8% per payment, capped at £5, plus the
 * 3.5% managed payments fee. There is no fixed pence charge.
 */
export const BANK_FEE_PERCENT = 0.008;
export const BANK_FEE_CAP = 5;

export type FeePaidBy = "salon" | "renter";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Fee taken out of a payment of `amount`. */
export function cardFeeOn(amount: number) {
  if (amount <= 0) return 0;
  return round2(amount * CARD_FEE_PERCENT + CARD_FEE_FIXED);
}

/**
 * What the renter is charged so the salon nets `rent` after fees.
 * When the salon absorbs the fee, the renter is charged the rent as is.
 */
export function chargeTotal(rent: number, feePaidBy: FeePaidBy) {
  const amount = Number(rent) || 0;
  if (amount <= 0) return 0;
  if (feePaidBy !== "renter") return round2(amount);
  return round2((amount + CARD_FEE_FIXED) / (1 - CARD_FEE_PERCENT));
}

/** The amount added on top of rent when the renter covers the fee. */
export function feeAddedOn(rent: number, feePaidBy: FeePaidBy) {
  return round2(chargeTotal(rent, feePaidBy) - (Number(rent) || 0));
}

/** Fee taken out of a pay by bank payment of `amount`. */
export function bankFeeOn(amount: number) {
  if (amount <= 0) return 0;
  const processing = Math.min(amount * BANK_FEE_PERCENT, BANK_FEE_CAP);
  return round2(processing + amount * MANAGED_PAYMENTS_PERCENT);
}

/** What a renter pays by bank so the salon still nets `rent`. */
export function bankChargeTotal(rent: number, feePaidBy: FeePaidBy) {
  const amount = Number(rent) || 0;
  if (amount <= 0) return 0;
  if (feePaidBy !== "renter") return round2(amount);
  const combined = BANK_FEE_PERCENT + MANAGED_PAYMENTS_PERCENT;
  const grossed = amount / (1 - combined);
  // Respect the £5 processing cap on larger payments.
  const capped = (amount + BANK_FEE_CAP) / (1 - MANAGED_PAYMENTS_PERCENT);
  return round2(Math.min(grossed, capped));
}

/** Amount added on top of rent for a bank payment when the renter covers it. */
export function bankFeeAddedOn(rent: number, feePaidBy: FeePaidBy) {
  return round2(bankChargeTotal(rent, feePaidBy) - (Number(rent) || 0));
}

export const FEE_PAID_BY_LABEL: Record<FeePaidBy, string> = {
  salon: "Salon covers payment fee",
  renter: "Renter covers payment fee",
};
