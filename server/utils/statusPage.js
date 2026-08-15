import mongoose from "mongoose";

const dbStateLabel = () => {
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return states[mongoose.connection.readyState] || "unknown";
};

export const statusPage = (req, res) => {
  const dbState = dbStateLabel();
  const dbOk = dbState === "connected";

  const html = /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bindery API</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
      --bg: #0f1117;
      --panel: #161a24;
      --border: #262b38;
      --text: #e2e5ef;
      --text-dim: #8890a4;
      --violet: #8b5cf6;
      --violet-glow: rgba(139, 92, 246, 0.25);
      --green: #4ade80;
      --red: #f87171;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: radial-gradient(ellipse 80% 60% at 50% -10%, var(--violet-glow), transparent),
                  var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 440px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }

    .logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .logo-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--violet);
      box-shadow: 0 0 12px var(--violet);
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .subtitle {
      color: var(--text-dim);
      font-size: 13px;
      margin-top: 4px;
      margin-bottom: 24px;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid var(--border);
      font-size: 13px;
    }

    .row:first-of-type { border-top: none; }

    .label {
      color: var(--text-dim);
    }

    .value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 500;
    }

    .pill-ok {
      background: rgba(74, 222, 128, 0.12);
      color: var(--green);
    }

    .pill-down {
      background: rgba(248, 113, 113, 0.12);
      color: var(--red);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .endpoints {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }

    .endpoints-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      margin-bottom: 10px;
    }

    code {
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text);
      background: #0d0f16;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 6px;
    }

    .method {
      color: var(--violet);
      font-weight: 600;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <div class="logo-dot"></div>
      <h1>Bindery API</h1>
    </div>
    <div class="subtitle">Backend service — settings &amp; account storage</div>

    <div class="row">
      <span class="label">Server</span>
      <span class="pill pill-ok"><span class="dot"></span>running</span>
    </div>
    <div class="row">
      <span class="label">Database</span>
      <span class="pill ${dbOk ? "pill-ok" : "pill-down"}"><span class="dot"></span>${dbState}</span>
    </div>
    <div class="row">
      <span class="label">Environment</span>
      <span class="value">${process.env.NODE_ENV || "development"}</span>
    </div>

    <div class="endpoints">
      <div class="endpoints-label">Endpoints</div>
      <code><span class="method">GET</span>/api/health</code>
      <code><span class="method">POST</span>/api/auth/signup</code>
      <code><span class="method">POST</span>/api/auth/login</code>
      <code><span class="method">GET</span>/api/settings</code>
    </div>
  </div>
</body>
</html>`;

  res.status(200).send(html);
};
