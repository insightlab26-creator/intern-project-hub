import { AuthProvider } from "./providers/AuthProvider";
import { V2Router } from "./router/V2Router";
import "./v2.css";

/**
 * V2 entry point. V1 remains mounted for every route outside of /v2.
 */
export default function V2App() {
  return <AuthProvider><V2Router /></AuthProvider>;
}
