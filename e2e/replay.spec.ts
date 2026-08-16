import { test, expect } from "@playwright/test";

test("replay golden path reaches compare without credentials", async ({
  page,
}) => {
  await page.goto("/replay");
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
  await page.screenshot({
    path: "docs/assets/replay-compare.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Approve Faithful/ }).click();
  await expect(
    page.getByRole("heading", { name: "Refine the approved still" }),
  ).toBeVisible();
});
