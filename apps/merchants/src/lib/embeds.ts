import { checkoutBase, checkoutUrl } from "./checkout-url";

export type ButtonVariant = "black" | "white";

/** Hosted pay-button image served by the checkout app (public/embed). */
export function buttonImageUrl(variant: ButtonVariant): string {
  return `${checkoutBase()}/embed/pay-button-${variant}.svg`;
}

/** `<a><img></a>` snippet the merchant drops on their site. */
export function buttonSnippet(invoiceId: string, variant: ButtonVariant): string {
  const href = `${checkoutUrl(invoiceId)}?source=button`;
  return `<a href="${href}" target="_blank" rel="noreferrer noopener">\n  <img src="${buttonImageUrl(
    variant,
  )}" alt="Pay in crypto with egofi" />\n</a>`;
}

/** Inline `<iframe>` widget snippet embedding the hosted checkout. */
export function widgetSnippet(invoiceId: string): string {
  const src = `${checkoutUrl(invoiceId)}?source=widget`;
  return `<iframe src="${src}" width="420" height="720" frameborder="0" style="border:0;max-width:100%;box-shadow:0 8px 32px rgba(7,28,61,.16)">\n  Can't load widget\n</iframe>`;
}
