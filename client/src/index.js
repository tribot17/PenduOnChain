import React from "react";
import ReactDOM from "react-dom/client";
import PagesRouter from "./pages/PagesRouter";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PagesRouter />
  </React.StrictMode>
);
