import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8")) as {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  lang?: string;
  icons?: { src: string; sizes: string; purpose?: string }[];
};

describe("PWA-manifest", () => {
  it("beschrijft een installeerbare Nederlandse app met relatieve paden", () => {
    expect(manifest.name).toBe("Landkaarten");
    expect(manifest.short_name).toBe("Landkaarten");
    expect(manifest.lang).toBe("nl");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
  });

  it("verwijst naar pictogrammen die in de repo staan", () => {
    for (const icon of manifest.icons ?? []) {
      expect(icon.src.startsWith("icons/")).toBe(true);
      const bytes = readFileSync(new URL(`../public/${icon.src}`, import.meta.url));
      expect(bytes.byteLength).toBeGreaterThan(200);
    }
  });
});
