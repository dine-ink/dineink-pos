import { Toaster } from "react-hot-toast";
import Router from "./app/router";

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Router />
    </>
  );
}

export default App;
