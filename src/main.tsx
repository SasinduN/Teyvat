import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/palette.css";
import "./styles/glass.css";
import "./styles/glass3d.css";
import App from "./App";
import { applyTheme, initialTheme } from './lib/theme';

applyTheme(initialTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
