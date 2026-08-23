import { AuthProvider } from "./providers/AuthProvider";
import { V2Router } from "./router/V2Router";
import "./v2.css";

/**
 * V2 entry point. V1 remains mounted for every route outside of /v2.
 */
export default function V2App() {
  return <div className="v2-root"><AuthProvider><V2Router /></AuthProvider></div>;
}
