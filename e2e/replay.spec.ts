import { test, expect } from "@playwright/test";

const FIXTURES = [
  "/fixtures/site-gallery.svg",
  "/fixtures/out/faithful-1.svg",
  "/fixtures/out/faithful-2.svg",
  "/fixtures/out/material-1.svg",
  "/fixtures/out/material-2.svg",
  "/fixtures/out/surprise-1.svg",
  "/fixtures/out/surprise-2.svg",
  "/fixtures/out/refine-1.svg",
  "/fixtures/out/refine-2.svg",
  "/fixtures/out/refine-3.svg",
  "/fixtures/out/motion-poster.svg",
];

test("public SVG fixtures decode with nonzero natural dimensions", async ({
  page,
}) => {
  for (const src of FIXTURES) {
    await page.setContent(
      `<!doctype html><img id="asset" src="http://127.0.0.1:4173${src}" alt="fixture">`,
    );
    const img = page.locator("#asset");
    await expect
      .poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
    const height = await img.evaluate(
      (el: HTMLImageElement) => el.naturalHeight,
    );
    expect(height, src).toBeGreaterThan(0);
  }
});

test("replay golden path reaches proposal and field note", async ({ page }) => {
  await page.goto("/replay");
  await expect(page.locator('[data-mode="replay"]')).toHaveText("REPLAY");
  await expect(
    page.getByText("UNOFFICIAL PROOF OF WORK").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Map three creative lanes" }).click();
  await expect(
    page.getByRole("heading", { name: "Faithful placement" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review generation plan" }).click();
  await page.getByRole("button", { name: "Approve plan and run jobs" }).click();
  await expect(page.getByRole("heading", { name: "Live jobs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Compare" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('[data-mode="replay"]')).toHaveText("REPLAY");
  await page.screenshot({
    path: "docs/assets/replay-compare.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Approve Faithful/ }).click();
  await expect(
    page.getByRole("heading", { name: "Refine the approved still" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate three refinements" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal board" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText(
      "Creative previsualization, not spatial validation. Not CAD, scale, structural, or permitting evidence.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/assets/replay-proposal.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Write product field note" }).click();
  await page
    .getByRole("button", { name: "Save field note and export" })
    .click();
  await expect(page.getByText(/Saved/)).toBeVisible();
  await expect(page.locator('[data-mode="replay"]')).toHaveText("REPLAY");
  await page.screenshot({
    path: "docs/assets/replay-note.png",
    fullPage: true,
  });
});
