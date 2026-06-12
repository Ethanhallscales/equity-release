import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EquityAccelerator from "./EquityAccelerator";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EquityAccelerator />
  </StrictMode>
);
