import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/kalam/400.css";
import "@fontsource/kalam/700.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
