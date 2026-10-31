import { useEffect, useState } from "react";
import { REPO_URL } from "../lib";
import { GithubButton } from "./Buttons";

const LINKS = [
  ["Demo", "#demo"],
  ["How it works", "#how"],
  ["Gallery", "#gallery"],
  ["Install", "#install"],
  ["Changelog", `${REPO_URL}/blob/main/CHANGELOG.md`],
] as const;

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5" aria-label="Sketchy home">
      <img src="/favicon.svg" alt="" className="size-7 rounded-[7px]" />
      <span className="text-[19px] font-semibold tracking-[-0.03em]">Sketchy</span>
    </a>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl" : ""}`}
    >
      <div className="relative mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-[14px] text-muted-foreground lg:flex">
          {LINKS.map(([label, href]) => (
            <a key={label} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <GithubButton />
          <a
            href="#install"
            className="hidden h-9 items-center rounded-md bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/85 sm:inline-flex"
          >
            Install
          </a>
        </div>
        <div
          className={`dash-x absolute inset-x-0 bottom-0 h-px transition-opacity ${scrolled ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </header>
  );
}
