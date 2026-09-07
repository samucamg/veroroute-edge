import vm from "node:vm";
import { renderDashboardHtml } from "../src/ui/dashboard";

const html = renderDashboardHtml();
const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
if (scripts.length === 0) throw new Error("Dashboard HTML does not contain a client script");
scripts.forEach((source, index) => new vm.Script(source, { filename: "dashboard-inline-" + (index + 1) + ".js" }));
console.log("Dashboard validation passed: " + scripts.length + " inline script(s), " + html.length + " HTML bytes.");
