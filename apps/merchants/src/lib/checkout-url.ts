/**
 * Builds the public checkout link a merchant shares with a customer. The
 * checkout app is a separate deployment; its base URL comes from env, with a
 * localhost default for dev.
 */
export function checkoutUrl(invoiceId: string): string {
  const base =
    process.env["NEXT_PUBLIC_CHECKOUT_URL"] ?? "http://localhost:3001";
  return `${base.replace(/\/$/, "")}/pay/${invoiceId}`;
}
