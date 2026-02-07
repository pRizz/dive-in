import { describe, expect, it } from "vitest";
import { formatJobStatusDisplay } from "./job-status";

describe("formatJobStatusDisplay", () => {
  it("maps queued status to friendly text", () => {
    const display = formatJobStatusDisplay({ jobStatus: "queued" });
    expect(display.statusLine).toBe("Status: Queued for analysis");
    expect(display.isActive).toBe(true);
    expect(display.isFailure).toBe(false);
  });

  it("maps running status without message", () => {
    const display = formatJobStatusDisplay({
      jobStatus: "running",
      elapsedLabel: "12s",
    });
    expect(display.statusLine).toBe("Status: Analyzing image (12s)");
  });

  it("includes non-redundant running stage messages inline", () => {
    const display = formatJobStatusDisplay({
      jobStatus: "running",
      jobMessage: "Pulling image...",
    });
    expect(display.statusLine).toBe(
      "Status: Analyzing image — Pulling image..."
    );
  });

  it("maps succeeded status and includes target", () => {
    const display = formatJobStatusDisplay({
      jobStatus: "succeeded",
      elapsedLabel: "1m 2s",
      target: "nginx:latest",
    });
    expect(display.statusLine).toBe(
      "Status: Analysis complete (1m 2s) — nginx:latest"
    );
    expect(display.isActive).toBe(false);
  });

  it("maps failed status and keeps detail message separate", () => {
    const display = formatJobStatusDisplay({
      jobStatus: "failed",
      jobMessage: "Dive timed out",
    });
    expect(display.statusLine).toBe("Status: Analysis failed");
    expect(display.detailMessage).toBe("Dive timed out");
    expect(display.isFailure).toBe(true);
  });

  it("falls back gracefully for unknown statuses", () => {
    const display = formatJobStatusDisplay({ jobStatus: "processing_layers" });
    expect(display.statusLine).toBe("Status: Processing Layers");
  });
});
