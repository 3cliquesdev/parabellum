import { describe, expect, it } from "vitest";
import {
  assertSafePublicUrl,
  isPrivateAddress,
} from "./safe-fetch";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "fe80::1",
  ])("bloqueia endereco privado %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "aceita endereco publico %s",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe("assertSafePublicUrl", () => {
  it("rejeita IP privado literal", async () => {
    await expect(assertSafePublicUrl("http://127.0.0.1/admin")).rejects.toThrow(
      "rede privada",
    );
  });

  it("rejeita protocolo fora de HTTP", async () => {
    await expect(assertSafePublicUrl("file:///etc/passwd")).rejects.toThrow(
      "HTTP ou HTTPS",
    );
  });

  it("rejeita credenciais embutidas", async () => {
    await expect(assertSafePublicUrl("https://user:pass@example.com")).rejects.toThrow(
      "credenciais",
    );
  });
});
