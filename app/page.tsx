import { PublicDirectory } from "@/components/PublicDirectory";
import { loadAppStore } from "@/storage/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await loadAppStore();
  return <PublicDirectory records={store.records} sources={store.sources} />;
}
