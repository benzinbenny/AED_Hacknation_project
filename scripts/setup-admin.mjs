import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

const target = new URL("../.env.local", import.meta.url);
try {
  await writeFile(target, `# Prywatny klucz edycji w lokalnym panelu /moderacja\nAED_ADMIN_TOKEN=${randomBytes(32).toString("hex")}\n`, { flag: "wx", mode: 0o600 });
  console.log("Klucz administratora zapisano w .env.local. Użyj jego wartości w panelu /moderacja.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Projekt ma już plik .env.local. Użyj wartości AED_ADMIN_TOKEN lub dodaj do tego pliku osobisty sekret pod tą nazwą.");
}
