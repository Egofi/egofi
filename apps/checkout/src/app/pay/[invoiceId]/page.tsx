import { CheckoutPageClient } from "@/components/CheckoutPageClient";
import { createApiClient } from "@egofi/sdk";
import { notFound } from "next/navigation";

const api = createApiClient();

interface Props {
  // Next.js 15: dynamic route params + searchParams are async (Promises).
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PayPage({ params, searchParams }: Props) {
  const { invoiceId } = await params;
  const sp = await searchParams;
  // Embedded (iframe widget) mode strips the page chrome so it renders cleanly
  // inside a merchant's site. Triggered by ?source=widget or ?embed=1.
  const embedded = sp["source"] === "widget" || sp["embed"] === "1";
  try {
    const session = await api.checkout.getSession(invoiceId);
    return <CheckoutPageClient session={session} embedded={embedded} />;
  } catch {
    notFound();
  }
}
