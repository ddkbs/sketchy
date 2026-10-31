import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultDataDir } from "../src/storage/database.js";

describe("defaultDataDir", () => {
  const original = process.env.SKETCHY_DATA_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.SKETCHY_DATA_DIR;
    else process.env.SKETCHY_DATA_DIR = original;
  });

  it("falls back to ~/.sketchy when unset or empty", () => {
    process.env.SKETCHY_DATA_DIR = " ";
    expect(defaultDataDir()).toBe(join(homedir(), ".sketchy"));
  });

  it("expands home placeholders the host left unsubstituted", () => {
    for (const value of ["${HOME}/.sketchy", "$HOME/.sketchy", "~/.sketchy"]) {
      process.env.SKETCHY_DATA_DIR = value;
      expect(defaultDataDir()).toBe(`${homedir()}/.sketchy`);
    }
  });

  it("keeps explicit paths", () => {
    process.env.SKETCHY_DATA_DIR = "/data/sketchy";
    expect(defaultDataDir()).toBe("/data/sketchy");
  });
});
