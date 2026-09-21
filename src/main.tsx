import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./AppV3";
import "./styles-v3.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
