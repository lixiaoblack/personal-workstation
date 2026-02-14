import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";

// 引入 Google Fonts - Material Symbols
const link = document.createElement("link");
link.href =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

// 引入 Inter 字体
const interLink = document.createElement("link");
interLink.href =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap";
interLink.rel = "stylesheet";
document.head.appendChild(interLink);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
