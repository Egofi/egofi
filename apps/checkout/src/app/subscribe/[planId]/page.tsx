import { SubscribePageClient } from "@/components/SubscribePageClient";
import { createApiClient } from "@egofi/sdk";
import { notFound } from "next/navigation";

const api = createApiClient();

interface Props {
  // Next.js 15: dynamic route params are async (Promises).
  params: Promise<{ planId: string }>;
}

export default async function SubscribePage({ params }: Props) {
  const { planId } = await params;
  try {
    const plan = await api.publicPlans.get(planId);
    return <SubscribePageClient plan={plan} />;
  } catch {
    notFound();
  }
}
