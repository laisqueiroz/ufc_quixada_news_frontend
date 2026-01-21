const { chromium } = require("playwright");
const fetch = require("node-fetch");

(async () => {
  // discover frontend base
  const candidates = ["http://localhost:3001", "http://localhost:3000"];
  let base = null;
  for (const c of candidates) {
    try {
      const res = await fetch(c);
      if (res.ok || res.status === 200) {
        base = c;
        break;
      }
    } catch (e) {}
  }
  if (!base) {
    console.error("Frontend dev server not reachable at 3000/3001");
    process.exit(1);
  }

  // create a test user (reuses existing tools script pattern)
  const apiBase = process.env.VITE_API_URL || "http://localhost:8080";
  const timestamp = Date.now();
  const login = `auto${timestamp}`;
  const email = `${login}@example.com`;
  const senha = "P4ssword!";
  const nome = `Auto User ${timestamp}`;

  const registerRes = await fetch(`${apiBase}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, login, email, senha, perfil: "bolsista" }),
  });
  if (!registerRes.ok) {
    console.error("Register failed", await registerRes.text());
    process.exit(1);
  }
  const j = await registerRes.json();
  const token = j.token;
  console.log("Registered user", login);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(base);
  await page.evaluate((t) => localStorage.setItem("auth_token", t), token);

  const target = `${base}/status`;

  const viewports = [
    { w: 375, h: 800, name: "mobile-320" },
    { w: 768, h: 1024, name: "tablet-768" },
    { w: 1280, h: 900, name: "desktop-1280" },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(target, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Status da sua solicitação", {
      timeout: 5000,
    });
    const path = `screenshots/status-${vp.name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log("Saved", path);
  }

  await browser.close();
})();
