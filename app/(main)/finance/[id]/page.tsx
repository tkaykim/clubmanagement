import { FinanceProjectDetailClient } from "@/components/finance/FinanceProjectDetailClient";

export const dynamic = "force-dynamic";

export default async function FinanceProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FinanceProjectDetailClient projectId={id} />;
}
