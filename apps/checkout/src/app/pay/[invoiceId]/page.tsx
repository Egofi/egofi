import { CheckoutPageClient } from "@/components/CheckoutPageClient";
import { createApiClient } from "@egofi/sdk";
import { notFound } from "next/navigation";

const api = createApiClient();

interface Props {
  params: { invoiceId: string };
}

export default async function PayPage({ params }: Props) {
  try {
    const session = await api.checkout.getSession(params.invoiceId);
    return <CheckoutPageClient session={session} />;
  } catch {
    notFound();
  }
}
