import { Keypair, TransactionBuilder, Transaction } from 'stellar-sdk';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

async function buildUnsignedPaymentXdr(params: {
  fromPublicKey: string;
  toPublicKey: string;
  amount: string;
  memo?: string;
  timeoutSeconds?: number;
}) {
  const res = await fetch('/api/stellar/build-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to build payment XDR');
  return json.xdr as string;
}

export async function submitSignedXdr(signedXdr: string) {
  const res = await fetch('/api/stellar/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXdr }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to submit signed XDR');
  return json.hash as string;
}

/**
 * Direct: build unsigned on server -> sign with secret key -> submit on server
 */
export async function sendXlmWithSecretKey(params: {
  fromPublicKey: string;
  fromSecretKey: string;
  toPublicKey: string;
  amount: string;
  memo?: string;
}) {
  const unsignedXdr = await buildUnsignedPaymentXdr({
    fromPublicKey: params.fromPublicKey,
    toPublicKey: params.toPublicKey,
    amount: params.amount,
    memo: params.memo,
    timeoutSeconds: 60,
  });

  // Sign with secret key
  const sourceKeypair = Keypair.fromSecret(params.fromSecretKey);
  const transaction = TransactionBuilder.fromXDR(unsignedXdr, TESTNET_PASSPHRASE) as Transaction;
  transaction.sign(sourceKeypair);
  const signedXdr = transaction.toXDR();

  return await submitSignedXdr(signedXdr);
}

/**
 * Protected Pay: build unsigned (LONG timeout) -> sign once -> return signedXdr (do NOT submit yet)
 */
export async function buildAndSignXlmPaymentWithSecretKey(params: {
  fromPublicKey: string;
  fromSecretKey: string;
  toPublicKey: string;
  amount: string;
  memo?: string;
  timeoutSeconds?: number; // set to 48h for protected pay
}) {
  const unsignedXdr = await buildUnsignedPaymentXdr({
    fromPublicKey: params.fromPublicKey,
    toPublicKey: params.toPublicKey,
    amount: params.amount,
    memo: params.memo,
    timeoutSeconds: params.timeoutSeconds ?? 172800, // 48h
  });

  // Sign with secret key
  const sourceKeypair = Keypair.fromSecret(params.fromSecretKey);
  const transaction = TransactionBuilder.fromXDR(unsignedXdr, TESTNET_PASSPHRASE) as Transaction;
  transaction.sign(sourceKeypair);
  const signedXdr = transaction.toXDR();

  return signedXdr;
}
