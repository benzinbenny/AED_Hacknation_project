import { PublicDirectory } from "@/components/PublicDirectory";
import { publicRecords } from "@/services/licensing";
import { loadAppStore } from "@/storage/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await loadAppStore();
  return <PublicDirectory records={publicRecords(store)} sources={store.sources} />;
}
