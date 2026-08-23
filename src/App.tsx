import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import Router from "./app/router";

/**
 * Toasts sit at the bottom on a phone and the top on anything larger.
 *
 * Found by actually running the app: at 390px two stacked error toasts
 * completely cover the header — brand, connectivity indicator, notification
 * bell and profile menu all disappear behind them. On a till that's the worst
 * possible thing to hide, because "offline" and "3 pending sync" live up
 * there and a cashier needs them exactly when errors are firing.
 *
 * Bottom placement clears the header; the offset lifts it above the 57px
 * bottom tab bar plus the home indicator so it never covers navigation either.
 * From `md` up the top bar is roomy and the bottom is unobstructed, so the
 * original top-centre placement is kept.
 */
const PHONE_QUERY = "(max-width: 767px)";

function App() {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <Toaster
        position={isPhone ? "bottom-center" : "top-center"}
        containerStyle={
          isPhone
            ? { bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
        toastOptions={{
          duration: 3000,
          style: { maxWidth: "min(26rem, calc(100vw - 1.5rem))" },
        }}
      />
      <Router />
    </>
  );
}

export default App;
