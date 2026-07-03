import { CheckoutPageClient } from "@/components/CheckoutPageClient";
import { createApiClient } from "@egofi/sdk";
import { notFound } from "next/navigation";

const api = createApiClient();

interface Props {
  // Next.js 15: dynamic route params are async (a Promise).
  params: Promise<{ invoiceId: string }>;
}

export default async function PayPage({ params }: Props) {
  const { invoiceId } = await params;
  try {
    const session = await api.checkout.getSession(invoiceId);
    return <CheckoutPageClient session={session} />;
  } catch {
    notFound();
  }
}
