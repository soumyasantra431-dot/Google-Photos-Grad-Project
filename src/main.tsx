import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./AppV3";
import RecallLab from "./RecallLab";
import "./styles-v3.css";
import "./recall-lab.css";

const root = document.getElementById("root");
const isRecallLab = window.location.pathname.startsWith("/recall-lab");
if (isRecallLab) document.title = "Photo Recall Lab — retrieval prototype";

if (!root) {
  throw new Error("Root element was not found");
}

createRoot(root).render(
  <StrictMode>
    {isRecallLab ? <RecallLab /> : <App />}
  </StrictMode>,
);
