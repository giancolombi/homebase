import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { bootCapacitor } from "./lib/capacitorBoot";
import "./index.css";

// On iOS we need to hydrate the Keychain token cache and migrate any
// legacy localStorage token before React mounts so the first /api/auth/me
// fetch in AuthContext reads the right token. On web/Android bootCapacitor
// returns immediately so this is a no-op there.
bootCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
