import { test, expect } from "@playwright/test";

test("replay completes the full decision and field-note path", async ({
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
  await expect(
    page.getByRole("heading", { name: "Generation jobs" }),
  ).toBeVisible();
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
  await page
    .getByRole("button", { name: "Generate three refinements" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal board" }),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Write product field note" }).click();
  await page
    .getByLabel("Observed friction")
    .fill(
      "Preservation constraints were visible in the brief but not beside each comparison tile.",
    );
  await page
    .getByRole("button", { name: "Save field note and export" })
    .click();
  await expect(page.getByText("Saved. Status: exported")).toBeVisible();
});

test("reset returns an in-progress replay to a clean brief", async ({
  page,
}) => {
  await page.goto("/replay");
  await page.getByRole("button", { name: "Map three creative lanes" }).click();
  await page.getByRole("button", { name: "Reset this replay" }).click();
  await expect(
    page.getByRole("button", { name: "Map three creative lanes" }),
  ).toBeVisible();
});
