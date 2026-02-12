import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from "web-vitals";

export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  const report = onPerfEntry ?? ((metric: Metric) => console.log(metric));

  onCLS(report);
  onINP(report); // Replaces deprecated onFID (Interaction to Next Paint)
  onFCP(report);
  onLCP(report);
  onTTFB(report);
}
