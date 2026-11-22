import path from "node:path";
import { createDemoStore } from "../data/demo";
import type { AedStore } from "../services/staging";
import { JsonFileRepository, type AedRepository } from "./file-repository";

const globalForRepository = globalThis as typeof globalThis & { __aedRepository?: AedRepository };

export const repository: AedRepository = globalForRepository.__aedRepository ?? new JsonFileRepository(
  process.env.AED_STORE_PATH ? path.resolve(process.env.AED_STORE_PATH) : path.join(process.cwd(), ".data", "aed-store.json"),
  createDemoStore,
);

if (process.env.NODE_ENV !== "production") globalForRepository.__aedRepository = repository;

export async function loadAppStore(): Promise<AedStore> {
  const existing = await repository.load();
  if (existing.sources.length > 0 || existing.records.length > 0 || existing.pendingRecords.length > 0 || existing.deletedSourceIds?.length || existing.forgottenSourceIds?.length) return existing;
  const result = await repository.update((current) => {
    const isStillEmpty = current.sources.length === 0 && current.records.length === 0 && current.pendingRecords.length === 0 && !current.deletedSourceIds?.length && !current.forgottenSourceIds?.length;
    return isStillEmpty ? createDemoStore() : current;
  });
  return result as AedStore;
}

