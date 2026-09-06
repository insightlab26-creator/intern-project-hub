import { AuthProvider } from "./providers/AuthProvider";
import { V2Router } from "./router/V2Router";
import "./v2.css";
import { LocaleProvider } from "../i18n/internLocale";

/**
 * Production application entry point. V1 source remains in the repository only.
 */
export default function V2App() {
  return <div className="v2-root"><AuthProvider><LocaleProvider><V2Router /></LocaleProvider></AuthProvider></div>;
}
