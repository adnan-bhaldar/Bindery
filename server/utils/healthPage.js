import mongoose from "mongoose";

const dbStateLabel = () => {
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return states[mongoose.connection.readyState] || "unknown";
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
};

// GET /api/health — a glassmorphic diagnostics console, deliberately laid
// out differently from the "/" status card (a table of checks + a live
// metrics grid vs. a simple summary card) but built to the same visual
// quality bar: blur, glow, gradient accents, real typography.
//
// Serves plain JSON to non-browser clients (curl, the GitHub Actions
// keep-alive ping, uptime monitors, the client app) so nothing depending on
// the old `{ status: "ok" }` body breaks; serves the HTML console only to
// an actual browser.
export const healthPage = (req, res) => {
  const start = process.hrtime.bigint();

  const dbState = dbStateLabel();
  const dbOk = dbState === "connected";
  const mem = process.memoryUsage();
  const now = new Date();
  const overallOk = dbOk;

  // Order matters: a browser's Accept header explicitly prefers text/html,
  // so it matches "html" regardless of list order. curl and most schedulers
  // send the bare wildcard `Accept: */*` with no explicit preference — with
  // a tie, `accepts` picks whichever offered type is listed first, so
  // "json" has to come first for those callers to keep getting JSON.
  const wantsHtml = req.accepts(["json", "html"]) === "html";

  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

  if (!wantsHtml) {
    return res.status(overallOk ? 200 : 503).json({
      status: overallOk ? "ok" : "degraded",
      db: dbState,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: now.toISOString(),
      responseTimeMs: Number(elapsedMs.toFixed(2)),
    });
  }

  const checks = [
    { name: "API", ok: true, detail: "reachable" },
    { name: "Database", ok: dbOk, detail: dbState },
  ];

  const checkRows = checks
    .map(
      (c) => /* html */ `
        <div class="check-row">
          <div class="check-left">
            <span class="check-icon ${c.ok ? "ok" : "fail"}">${c.ok ? "✓" : "✕"}</span>
            <span class="check-name">${c.name}</span>
          </div>
          <span class="pill ${c.ok ? "pill-ok" : "pill-down"}"><span class="dot"></span>${c.detail}</span>
        </div>`
    )
    .join("");

  const html = /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>Health · Bindery API</title>
  <meta http-equiv="refresh" content="15" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --bg: #06070b;
      --panel: rgba(18, 20, 30, 0.72);
      --panel-inner: rgba(255, 255, 255, 0.025);
      --border: rgba(255, 255, 255, 0.08);
      --border-hard: rgba(255, 255, 255, 0.14);
      --text: #f1f2f6;
      --text-dim: #8a8fa3;
      --text-faint: #5c6178;
      --cyan: #57d9ff;
      --blue: #4f8dfd;
      --cyan-glow: rgba(87, 217, 255, 0.32);
      --blue-glow: rgba(79, 141, 253, 0.2);
      --green: #4ade80;
      --red: #f87171;
      --amber: #ffb454;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background:
        radial-gradient(ellipse 55% 45% at 85% 0%, var(--cyan-glow), transparent 60%),
        radial-gradient(ellipse 50% 45% at 0% 100%, var(--blue-glow), transparent 60%),
        var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    .console {
      position: relative;
      width: 100%;
      max-width: 460px;
      background: var(--panel);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-hard);
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 24px 70px rgba(0, 0, 0, 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.02) inset,
        0 1px 0 rgba(255, 255, 255, 0.06) inset;
    }

    .console::before {
      content: '';
      position: absolute;
      inset: -40% -40% auto -40%;
      height: 220px;
      background: radial-gradient(ellipse 60% 100% at 50% 0%, var(--cyan-glow), transparent 70%);
      pointer-events: none;
      filter: blur(10px);
      z-index: 0;
    }

    .titlebar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.015);
    }

    .tb-dot { width: 9px; height: 9px; border-radius: 50%; opacity: 0.85; }
    .tb-r { background: #ff5f57; }
    .tb-y { background: #febc2e; }
    .tb-g { background: #28c840; }

    .tb-label {
      margin-left: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: var(--text-faint);
      letter-spacing: 0.01em;
    }

    .content { position: relative; z-index: 1; padding: 28px 26px 24px; }

    .head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }

    .logo {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      background: linear-gradient(135deg, var(--blue), var(--cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 8px 24px var(--cyan-glow),
        0 1px 0 rgba(255, 255, 255, 0.25) inset;
      overflow: hidden;
      flex-shrink: 0;
    }

    .logo img { width: 100%; height: 100%; object-fit: cover; }

    h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }

    .subtitle { color: var(--text-dim); font-size: 12.5px; margin-top: 2px; }

    .overall {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 11px 14px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.01em;
    }

    .overall.ok {
      color: var(--green);
      background: rgba(74, 222, 128, 0.08);
      border: 1px solid rgba(74, 222, 128, 0.2);
    }

    .overall.fail {
      color: var(--red);
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.2);
    }

    .live-dot {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    .live-dot::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 1.5px solid currentColor;
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.9); opacity: 0; }
    }

    .section-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-faint);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 2px 8px;
    }

    .checks {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--border);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      margin-bottom: 22px;
    }

    .check-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: var(--panel-inner);
    }

    .check-left { display: flex; align-items: center; gap: 10px; }

    .check-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .check-icon.ok { background: rgba(74, 222, 128, 0.14); color: var(--green); }
    .check-icon.fail { background: rgba(248, 113, 113, 0.14); color: var(--red); }

    .check-name { font-size: 13.5px; font-weight: 500; }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .pill-ok {
      background: rgba(74, 222, 128, 0.12);
      color: var(--green);
      border: 1px solid rgba(74, 222, 128, 0.2);
    }

    .pill-down {
      background: rgba(248, 113, 113, 0.12);
      color: var(--red);
      border: 1px solid rgba(248, 113, 113, 0.2);
    }

    .pill .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      background: var(--border);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .metric {
      background: var(--panel-inner);
      padding: 12px 14px;
    }

    .metric-label {
      font-size: 10.5px;
      color: var(--text-faint);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }

    .metric-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--amber);
      font-weight: 500;
    }

    .footer {
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--text-faint);
      letter-spacing: 0.02em;
    }

    .footer-right { display: flex; align-items: center; gap: 10px; }

    .footer .refresh { font-family: 'JetBrains Mono', monospace; }

    .footer .statuslink {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-faint);
      text-decoration: none;
    }

    .footer .statuslink:hover { color: var(--cyan); }
  </style>
</head>
<body>
  <div class="console">
    <div class="titlebar">
      <span class="tb-dot tb-r"></span>
      <span class="tb-dot tb-y"></span>
      <span class="tb-dot tb-g"></span>
      <span class="tb-label">GET /api/health</span>
    </div>

    <div class="content">
      <div class="head">
        <div class="logo"><img src="/favicon.svg" alt="Bindery" /></div>
        <div>
          <h1>Health</h1>
          <div class="subtitle">Live diagnostics for the Bindery API</div>
        </div>
      </div>

      <div class="overall ${overallOk ? "ok" : "fail"}">
        <span class="live-dot"></span>
        ${overallOk ? "All systems operational" : "Degraded — one or more checks failing"}
      </div>

      <div class="section-label">Checks</div>
      <div class="checks">
        ${checkRows}
      </div>

      <div class="section-label">Metrics</div>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Uptime</div>
          <div class="metric-value">${formatUptime(process.uptime())}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Response</div>
          <div class="metric-value">${elapsedMs.toFixed(2)} ms</div>
        </div>
        <div class="metric">
          <div class="metric-label">Environment</div>
          <div class="metric-value">${process.env.NODE_ENV || "development"}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Node</div>
          <div class="metric-value">${process.version}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Memory (RSS)</div>
          <div class="metric-value">${(mem.rss / 1024 / 1024).toFixed(1)} MB</div>
        </div>
        <div class="metric">
          <div class="metric-label">Checked at</div>
          <div class="metric-value">${now.toLocaleTimeString("en-US", { hour12: false })}</div>
        </div>
      </div>

      <div class="footer">
        <span>Bindery — local-first document assembly</span>
        <div class="footer-right">
          <span class="refresh">↻ 15s</span>
          <a class="statuslink" href="/">← / status</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  res.status(overallOk ? 200 : 503).send(html);
};