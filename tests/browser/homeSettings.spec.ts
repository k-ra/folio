import { test, expect } from "./fixtures";

for (const width of [1440, 390, 320]) {
  test(`homepage settings stay compact and usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Homepage settings", exact: true })
      .click();
    const panel = page.getByRole("region", { name: "Homepage settings" });
    await expect(
      panel.getByRole("button", { name: "Moody blue" }),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: "Paper" })).toBeVisible();
    await expect(panel.getByLabel("Describe your homepage")).toBeVisible();
    await expect(panel.getByText("ACCOUNT", { exact: true })).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Open offline chat sample" }),
    ).toBeVisible();
    await expect(panel.getByLabel("Import .folio backup")).toHaveCount(1);
    await expect(panel.getByLabel("Import .folio backup")).toBeHidden();
    const google = panel.getByRole("button", {
      name: "Sign in with Google & import browser stories",
    });
    if (await google.count()) {
      await expect(google).toBeVisible();
      await expect(panel.getByLabel("Email", { exact: true })).toHaveCount(0);
      await panel.getByRole("button", { name: "Email sign-in" }).click();
      await expect(panel.getByLabel("Email", { exact: true })).toBeVisible();
    } else {
      await expect(
        panel.getByText(/Cloud accounts unavailable here/),
      ).toBeVisible();
    }
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await page.screenshot({
      path: test.info().outputPath(`home-settings-${width}.png`),
      animations: "disabled",
    });
  });
}
