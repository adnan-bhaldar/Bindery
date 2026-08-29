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
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>Bindery API</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
      --bg: #0a0b10;
      --panel: rgba(22, 25, 36, 0.72);
      --border: rgba(255, 255, 255, 0.08);
      --border-hard: rgba(255, 255, 255, 0.14);
      --text: #f1f2f6;
      --text-dim: #8a8fa3;
      --text-faint: #5c6178;
      --violet: #8b5cf6;
      --indigo: #6366f1;
      --violet-glow: rgba(139, 92, 246, 0.35);
      --green: #4ade80;
      --red: #f87171;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background:
        radial-gradient(ellipse 60% 50% at 15% 0%, var(--violet-glow), transparent 60%),
        radial-gradient(ellipse 50% 45% at 100% 100%, rgba(99, 102, 241, 0.18), transparent 60%),
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

    .card {
      position: relative;
      width: 100%;
      max-width: 400px;
      background: var(--panel);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-hard);
      border-radius: 22px;
      padding: 36px 32px 28px;
      box-shadow:
        0 24px 70px rgba(0, 0, 0, 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.02) inset,
        0 1px 0 rgba(255, 255, 255, 0.06) inset;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      inset: -40% -40% auto -40%;
      height: 220px;
      background: radial-gradient(ellipse 60% 100% at 50% 0%, var(--violet-glow), transparent 70%);
      pointer-events: none;
      filter: blur(10px);
    }

    .content { position: relative; z-index: 1; }

    .logo {
      width: 52px;
      height: 52px;
      border-radius: 15px;
      background: linear-gradient(135deg, var(--indigo), var(--violet));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 8px 24px var(--violet-glow),
        0 1px 0 rgba(255, 255, 255, 0.25) inset;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    h1 {
      font-size: 21px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: var(--text-dim);
      font-size: 13px;
      margin-top: 5px;
      margin-bottom: 26px;
      line-height: 1.5;
    }

    .status-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .live-dot {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      flex-shrink: 0;
    }

    .live-dot::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 1.5px solid var(--green);
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .status-line span {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--green);
      letter-spacing: 0.02em;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--border);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 14px;
      background: rgba(255, 255, 255, 0.02);
      font-size: 13px;
    }

    .label {
      color: var(--text-dim);
      font-weight: 500;
    }

    .value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text-faint);
    }

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

    .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .footer {
      margin-top: 22px;
      text-align: center;
      font-size: 11px;
      color: var(--text-faint);
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="content">
      <div class="logo"><img src="/favicon.svg" alt="Bindery" /></div>
      <h1>Bindery API</h1>
      <div class="subtitle">Backend service for account storage &amp; settings sync.</div>

      <div class="status-line">
        <span class="live-dot"></span>
        <span>All systems operational</span>
      </div>

      <div class="rows">
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
      </div>

      <div class="footer">Bindery — local-first document assembly</div>
    </div>
  </div>
</body>
</html>`;

  res.status(200).send(html);
};