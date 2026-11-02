import { notFound, permanentRedirect } from "next/navigation";
export default async function LegacyTerm({ params }: { params: Promise<{ taxonomy: string; term: string }> }) {
  const { taxonomy, term } = await params;
  const filter = taxonomy === "tags" ? "tag" : taxonomy === "categories" ? "category" : null;
  if (!filter) notFound();
  permanentRedirect(`/posts/?${filter}=${encodeURIComponent(term)}`);
}
