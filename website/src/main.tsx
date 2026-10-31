import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

document.documentElement.style.setProperty("--accent", "#ef5444");
const page = location.pathname.replace(/\/$/, "").endsWith("/docs") ? "docs" : "home";

// No StrictMode: its double mount would hand the WebGL backgrounds an already lost context.
createRoot(document.getElementById("root")!).render(<App page={page} />);
