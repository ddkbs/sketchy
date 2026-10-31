import { Analytics } from "@vercel/analytics/react";
import { RailBeam } from "./components/Backgrounds";
import { Hero } from "./components/Hero";
import { Cta, Footer, Install } from "./components/Install";
import { Nav } from "./components/Nav";
import { Features, Gallery, HowItWorks } from "./components/Sections";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Nav />
      <Hero />
      {/* Page rails: dashed verticals at the content edges, like a drafting sheet. */}
      <main className="relative mx-auto max-w-[1240px]">
        <div className="dash-y pointer-events-none absolute inset-y-0 left-0 w-px" />
        <div className="dash-y pointer-events-none absolute inset-y-0 right-0 w-px" />
        <RailBeam side="left" />
        <RailBeam side="right" delay={4.5} />
        <HowItWorks />
        <Gallery />
        <Features />
        <Install />
        <Cta />
        <Footer />
      </main>
      <Analytics />
    </div>
  );
}
