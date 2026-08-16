import { chromium } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const file = pathToFileURL(path.resolve("static/og.html")).href;
const out = path.resolve("static/og.png");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(file);
await page.waitForTimeout(800);
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log("wrote", out);
