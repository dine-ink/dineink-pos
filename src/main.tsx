import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";

import { PersistGate } from "redux-persist/integration/react";

// Bundled with the app rather than fetched from a font CDN — a till spends
// real time offline, and a failed webfont request would silently fall back to
// a system face mid-shift. Must precede index.css so the @theme
// --font-sans declaration wins over the @font-face defaults.
import "@fontsource-variable/geist";

import "./index.css";

import App from "./App";
import { persistor, store } from "./store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
