/**
 * Lead-unlock decision and an in-process serialized wallet.
 * SQL adapters apply the same decision inside a database transaction.
 */

export type PaymentGate = 'WALLET' | 'VERIFIED' | 'FAILED' | 'PENDING' | 'NOT_CONFIGURED';

export interface UnlockState {
  balance: number;
  alreadyUnlocked: boolean;
  idempotencyReplay: boolean;
}

export interface UnlockRules {
  price: number;
  verifiedProfessional: boolean;
  consentRecorded: boolean;
  listingEligible: boolean;
  paymentGate: PaymentGate;
}

export interface UnlockDecision {
  outcome: 'REVEAL_NO_CHARGE' | 'DEBIT_AND_REVEAL' | 'DENY';
  charge: number;
  nextBalance: number;
  reason?: string;
}

export function evaluateUnlock(state: UnlockState, rules: UnlockRules): UnlockDecision {
  const balance = Number(state.balance);
  const price = Number(rules.price);
  const deny = (reason: string): UnlockDecision => ({
    outcome: 'DENY',
    charge: 0,
    nextBalance: balance,
    reason
  });

  if (state.alreadyUnlocked) {
    return { outcome: 'REVEAL_NO_CHARGE', charge: 0, nextBalance: balance };
  }
  if (!rules.verifiedProfessional) return deny('Professional verification is required before contact details can be revealed.');
  if (!rules.consentRecorded) return deny('Seeker consent was not recorded for this enquiry.');
  if (!rules.listingEligible) return deny('This listing is not approved for lead matching.');
  if (!Number.isFinite(price) || price < 0) return deny('Lead price is invalid.');
  if (rules.paymentGate === 'NOT_CONFIGURED') return deny('Payment provider is NOT_CONFIGURED.');
  if (rules.paymentGate === 'FAILED') return deny('Payment was not verified.');
  if (rules.paymentGate === 'PENDING') return deny('Payment is still pending verification.');

  if (state.idempotencyReplay) {
    return { outcome: 'REVEAL_NO_CHARGE', charge: 0, nextBalance: balance };
  }

  if (rules.paymentGate === 'VERIFIED') {
    return { outcome: 'REVEAL_NO_CHARGE', charge: 0, nextBalance: balance };
  }

  if (balance < price) return deny('Insufficient wallet balance.');

  return {
    outcome: 'DEBIT_AND_REVEAL',
    charge: price,
    nextBalance: Math.round((balance - price) * 100) / 100
  };
}

export interface LedgerEntry {
  idempotencyKey: string;
  amount: number;
  balanceAfter: number;
  leadKey: string;
}

/**
 * Serializes unlock attempts so concurrent callers cannot double-charge.
 * Database implementations use row locks; this store is the executable model.
 */
export class SerializedWallet {
  private chain: Promise<unknown> = Promise.resolve();
  balance: number;
  unlocks = new Set<string>();
  idempotencyKeys = new Set<string>();
  ledger: LedgerEntry[] = [];

  constructor(balance: number) {
    this.balance = balance;
  }

  unlock(leadKey: string, idempotencyKey: string, rules: Omit<UnlockRules, 'paymentGate'> & { paymentGate?: PaymentGate }): Promise<UnlockDecision> {
    const run = (): UnlockDecision => {
      const decision = evaluateUnlock(
        {
          balance: this.balance,
          alreadyUnlocked: this.unlocks.has(leadKey),
          idempotencyReplay: this.idempotencyKeys.has(idempotencyKey)
        },
        { ...rules, paymentGate: rules.paymentGate || 'WALLET' }
      );
      if (decision.outcome === 'DEBIT_AND_REVEAL') {
        this.balance = decision.nextBalance;
        this.unlocks.add(leadKey);
        this.idempotencyKeys.add(idempotencyKey);
        this.ledger.push({
          idempotencyKey,
          amount: decision.charge,
          balanceAfter: this.balance,
          leadKey
        });
      } else if (decision.outcome === 'REVEAL_NO_CHARGE') {
        this.unlocks.add(leadKey);
        this.idempotencyKeys.add(idempotencyKey);
      }
      return decision;
    };

    const next = this.chain.then(run, run);
    this.chain = next.then(() => undefined, () => undefined);
    return next;
  }
}
