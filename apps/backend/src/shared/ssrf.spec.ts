import { describe, expect, it } from "vitest";
import { SsrfError, assertPublicUrl, isPrivateHostname, isPrivateIp } from "./ssrf";

describe("isPrivateIp", () => {
  it("flags loopback, private, link-local, CGNAT and metadata addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "::1",
      "fd00::1", // ULA
      "fe80::1", // link-local
      "::ffff:10.0.0.1", // IPv4-mapped private
    ]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "139.59.187.13", "2606:4700:4700::1111"]) {
      expect(isPrivateIp(ip)).toBe(false);
    }
  });

  it("treats a non-IP string as unsafe", () => {
    expect(isPrivateIp("not-an-ip")).toBe(true);
  });
});

describe("isPrivateHostname", () => {
  it("blocks localhost and private IP literals", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
    expect(isPrivateHostname("foo.localhost")).toBe(true);
    expect(isPrivateHostname("127.0.0.1")).toBe(true);
    expect(isPrivateHostname("169.254.169.254")).toBe(true);
  });

  it("allows ordinary public hostnames (no DNS)", () => {
    expect(isPrivateHostname("example.com")).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("rejects non-http schemes, credentials and private literals", async () => {
    await expect(assertPublicUrl("ftp://example.com")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl("http://user:pass@example.com")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl("http://127.0.0.1/x")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toBeInstanceOf(
      SsrfError,
    );
    await expect(assertPublicUrl("not a url")).rejects.toBeInstanceOf(SsrfError);
  });

  it("accepts a public IP literal", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/hook")).resolves.toBeUndefined();
  });
});
