import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const apiRoot = join(process.cwd(), "src", "app", "api");

function routeFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? routeFiles(path)
      : entry === "route.ts"
        ? [path]
        : [];
  });
}

describe("contratos de seguranca das APIs", () => {
  it("nao reutiliza service_role como header interno", () => {
    for (const file of routeFiles(apiRoot)) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(
        /x-internal-key[^\r\n]{0,200}SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY[^\r\n]{0,200}x-internal-key/,
      );
    }
  });

  it.each([
    "ai/crawl/route.ts",
    "ai/upload/route.ts",
    "ai/sandbox/route.ts",
    "broadcast/templates/route.ts",
    "webhooks/outgoing/route.ts",
    "whatsapp/embedded-signup/route.ts",
  ])("mantem autorizacao por recurso em %s", (relativePath) => {
    const source = readFileSync(join(apiRoot, ...relativePath.split("/")), "utf8");
    expect(source).toMatch(/assertTenant(Member|Admin)/);
  });
});
