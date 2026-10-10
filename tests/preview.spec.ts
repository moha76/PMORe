import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const routes = [
  ["landing", ""],
  ["discover", "v5/discover?demo=1"],
  ["study", "v5/study/DEMO-001/DEMO?demo=1&lot=1"],
  ["prepare", "v5/prepare/DEMO-001/DEMO/1?demo=1"],
  ["submit", "v5/submit/DEMO-001/DEMO/1?demo=1"],
  ["follow", "v5/mes-dossiers?demo=1"],
  ["company", "company?demo=1"],
  ["intelligence", "intelligence?demo=1"],
] as const;
for (const [name, route] of routes) {
  for (const [device, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ] as const) {
    test(`${name} · ${device} · render, layout and accessibility`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForTimeout(2200);
      await page.evaluate(() => document.fonts.ready);
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (name !== "landing")
        await expect(page.locator(".demo-notice")).toBeVisible();
      if (name === "prepare")
        await expect(
          page.getByRole("heading", { name: "Registre des exigences" }),
        ).toBeVisible();
      await mkdir("artifacts/screenshots", { recursive: true });
      await page.screenshot({
        path: `artifacts/screenshots/${name}-${device}.png`,
        fullPage: true,
      });
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      await mkdir("artifacts/accessibility", { recursive: true });
      await writeFile(
        `artifacts/accessibility/${name}-${device}.json`,
        JSON.stringify(accessibility.violations, null, 2),
      );
      expect(
        accessibility.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    });
  }
}
test("commercial navigation, product tabs and login", async ({ page }) => {
  await page.goto("");
  await page.getByRole("tab", { name: "Étudier" }).click();
  await expect(
    page.getByRole("heading", { name: "Une décision, avec ses preuves." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Étudier" }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Préparer" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("link", { name: "Entrer dans MOR" }).first().click();
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});
test("discovery filters, persisted query and empty state", async ({ page }) => {
  await page.goto("v5/discover?demo=1");
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page
    .getByRole("textbox", { name: "Rechercher des marchés" })
    .fill("informatique");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/q=informatique/);
  await page
    .getByRole("textbox", { name: "Rechercher des marchés" })
    .fill("introuvable");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aucun marché dans cette sélection." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Pour mon entreprise", exact: false })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
});
test("lot context, decision, sourced qualification, PDF review and external submission", async ({
  page,
}) => {
  await page.goto("v5/study/DEMO-001/DEMO?demo=1&lot=1");
  await page.locator(".study-lot-card").nth(1).click();
  await expect(page).toHaveURL(/lot=2/);
  await expect(page.locator(".study-lot-dashboard")).toContainText("1.100.000");
  await page
    .getByRole("button", { name: "Je souhaite participer", exact: false })
    .click();
  await page.getByRole("button", { name: "Enregistrer ma décision" }).click();
  await expect(
    page.getByText("Décision enregistrée pour le lot 2."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Passer à Préparer" }).click();
  await expect(page).toHaveURL(/prepare.*\/2/);
  await expect(
    page.getByRole("heading", { name: "Registre des exigences" }),
  ).toBeVisible();
  await page
    .locator(".m5-prep-item")
    .filter({ hasText: "Attestation CNSS" })
    .click();
  await page.getByLabel("Décision documentaire").selectOption("REQUIRED");
  await page
    .getByLabel("Passage vérifié dans le DCE")
    .fill("Le candidat fournit une attestation fiscale\nen cours de validité");
  await page
    .getByLabel("Justification de la décision")
    .fill("Exemple : exigence vérifiée dans le règlement de consultation.");
  await expect(
    page.getByRole("button", { name: "Enregistrer la qualification" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Enregistrer la qualification" })
    .click();
  await expect(
    page.getByText("Qualification enregistrée. Le registre a été actualisé."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pièces et contrôle", exact: false })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "exemple.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      "%PDF-1.4\n%Exemple de document, sans valeur officielle\n%%EOF",
    ),
  });
  await page
    .getByRole("button", { name: "Déposer une nouvelle version" })
    .click();
  await expect(
    page.getByText("Version 1 déposée.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accepter", exact: true }).click();
  await page
    .getByLabel("Justification obligatoire")
    .fill("Document illustratif contrôlé pour ce test local.");
  await page
    .getByRole("button", { name: "Confirmer : Accepter", exact: true })
    .click();
  await expect(
    page.getByText("Décision enregistrée dans l'historique."),
  ).toBeVisible();
  await page
    .locator(".premium-journey")
    .getByRole("link", { name: "Soumettre" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Déclarer un dépôt externe" }),
  ).toBeVisible();
  await page.getByLabel("Référence", { exact: false }).fill("DEMO-RECU-001");
  await page.locator("input[type=datetime-local]").fill("2026-10-10T12:00");
  await page.locator("input[type=checkbox]").check();
  await page
    .getByRole("button", { name: "Enregistrer la déclaration", exact: true })
    .click();
  await expect(
    page.getByText("Déclaration enregistrée dans MOR."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Annuler la déclaration MOR" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Conserver la déclaration" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Annuler la déclaration MOR" })
    .click();
  await page.getByRole("button", { name: "Annuler dans MOR" }).click();
  await expect(
    page.getByText("Déclaration annulée dans MOR. Historique conservé."),
  ).toBeVisible();
});
test("mobile navigation and evidence dialog keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("v5/discover?demo=1");
  await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mes dossiers" })
    .click();
  await expect(page).toHaveURL(/v5\/mes-dossiers/);
  await page.goto("v5/study/DEMO-001/DEMO?demo=1&lot=1");
  await page.locator(".study-proof").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("connected mode shows failure instead of fabricated records", async ({
  page,
}) => {
  await page.route(/\/api\/v[45]\//, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"API de test indisponible"}',
    }),
  );
  await page.goto("v5/discover");
  await expect(
    page.getByRole("heading", {
      name: "Le registre est momentanément indisponible.",
    }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.locator(".demo-notice")).not.toBeVisible();
});

test("dossier board, stage filtering and list preserve the lot destination", async ({
  page,
}) => {
  await page.goto("v5/mes-dossiers?demo=1");
  await expect(
    page.getByRole("button", { name: "Par étapes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".mission-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Rechercher dans les dossiers chargés" })
    .fill("introuvable");
  await expect(
    page.getByRole("heading", { name: "Aucun dossier dans cette sélection." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher dans les dossiers chargés" })
    .fill("");
  await page.getByRole("button", { name: "Liste", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Liste", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Par étapes", exact: true }).click();
  await page
    .locator(".mission-overview-item.mission-preparation")
    .click();
  await expect(page.locator(".mission-column")).toHaveCount(1);
  const card = page.locator(".mission-card").filter({ hasText: "Lot 1" });
  await card.getByRole("link", { name: /Reprendre/ }).click();
  await expect(page).toHaveURL(/v5\/prepare\/DEMO-001\/DEMO\/1/);
});
