import { notFound, permanentRedirect } from "next/navigation";
export default async function LegacyTaxonomy({ params }: { params: Promise<{ taxonomy: string }> }) {
  const { taxonomy } = await params;
  if (!["tags", "categories"].includes(taxonomy)) notFound();
  permanentRedirect("/posts/");
}
