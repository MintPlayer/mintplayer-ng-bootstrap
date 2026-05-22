import { test, expect, type Page } from '@playwright/test';
// Regression contract for issue #183 + PR #338:
// 1. bs-modal[scrollable]=true splits scrolling so modal-body — not the outer
//    .modal — is the actual scroll container.
// 2. bs-scrollspy resolves its scroll target to that modal-body and operates
//    against container-relative geometry.
// 3. Clicking a TOC entry scrolls the modal-body, never the window/page.
// 4. Scrolling the modal-body updates the spy's active section.

async function openScrollspyModal(page: Page) {
  await page.goto('/advanced/scrollspy');
  // Demo SSR uses destructive bootstrap — wait for hydration before clicking.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Open modal', exact: true }).click();
  await expect(page.getByText('Scrollspy in modal', { exact: true })).toBeVisible();
  // The modal animates in via EnterFromTop (animating `top`, not `transform`)
  // and FadeInOut. Wait for every WAAPI animation under bs-modal-content to
  // finish — otherwise the dialog is still moving between reads and the
  // "header is fixed" assertion is fooled by animation progress.
  await page.waitForFunction(() => {
    const host = document.querySelector('bs-modal-content');
    if (!host) return false;
    const anims = (host as Element & { getAnimations?: (opts?: { subtree?: boolean }) => Animation[] })
      .getAnimations?.({ subtree: true }) ?? [];
    return anims.every((a) => a.playState === 'finished' || a.playState === 'idle');
  });
}

test.describe('scrollspy inside a scrollable modal', () => {
  test('modal-body is the scroll container, .modal does not scroll', async ({ page }) => {
    await openScrollspyModal(page);

    const result = await page.evaluate(() => {
      const modal = document.querySelector('bs-modal-content .modal') as HTMLElement;
      const modalBody = document.querySelector('bs-modal-content .modal-body') as HTMLElement;
      const cs = getComputedStyle(modalBody);
      return {
        bodyOverflowY: cs.overflowY,
        bodyScrollable: modalBody.scrollHeight > modalBody.clientHeight,
        modalScrollHeight: modal.scrollHeight,
        modalClientHeight: modal.clientHeight,
      };
    });

    expect(result.bodyOverflowY).toBe('auto');
    expect(result.bodyScrollable).toBe(true);
    // The outer .modal stays the same size as its viewport — no content to scroll.
    expect(result.modalScrollHeight).toBe(result.modalClientHeight);
  });

  test('scrolling modal-body leaves the header fixed and the outer .modal untouched', async ({ page }) => {
    await openScrollspyModal(page);

    const result = await page.evaluate(async () => {
      const modal = document.querySelector('bs-modal-content .modal') as HTMLElement;
      const modalBody = document.querySelector('bs-modal-content .modal-body') as HTMLElement;
      const modalHeader = document.querySelector('bs-modal-content .modal-header') as HTMLElement;

      const headerTopBefore = modalHeader.getBoundingClientRect().top;
      const modalScrollTopBefore = modal.scrollTop;

      modalBody.scrollTop = 400;
      await new Promise((r) => setTimeout(r, 50));

      const headerTopAfter = modalHeader.getBoundingClientRect().top;
      const modalScrollTopAfter = modal.scrollTop;
      const bodyScrollTopAfter = modalBody.scrollTop;

      return {
        headerTopBefore: Math.round(headerTopBefore),
        headerTopAfter: Math.round(headerTopAfter),
        modalScrollTopBefore,
        modalScrollTopAfter,
        bodyScrollTopAfter,
      };
    });

    // modal-body actually scrolled.
    expect(result.bodyScrollTopAfter).toBeGreaterThan(0);
    // Header did not move.
    expect(result.headerTopAfter).toBe(result.headerTopBefore);
    // The outer .modal did not scroll along.
    expect(result.modalScrollTopAfter).toBe(result.modalScrollTopBefore);
  });

  test('clicking a TOC entry scrolls modal-body, not the window', async ({ page }) => {
    await openScrollspyModal(page);

    const before = await page.evaluate(() => {
      const modalBody = document.querySelector('bs-modal-content .modal-body') as HTMLElement;
      return { windowY: window.scrollY, bodyScrollTop: modalBody.scrollTop };
    });

    // Click "Warning" inside the modal's TOC (the inner scrollspy nav.spy).
    await page.locator('bs-modal-content nav.spy button', { hasText: 'Warning' }).click();

    // Wait for smooth-scroll to settle: poll modal-body.scrollTop until it is non-zero.
    await page.waitForFunction(() => {
      const mb = document.querySelector('bs-modal-content .modal-body') as HTMLElement | null;
      return mb !== null && mb.scrollTop > 0;
    });

    const after = await page.evaluate(() => {
      const modalBody = document.querySelector('bs-modal-content .modal-body') as HTMLElement;
      return { windowY: window.scrollY, bodyScrollTop: modalBody.scrollTop };
    });

    expect(after.bodyScrollTop).toBeGreaterThan(0);
    expect(after.windowY).toBe(before.windowY);
  });

  test('opening and closing the modal preserves the page scroll position', async ({ page }) => {
    await page.goto('/advanced/scrollspy');
    await page.waitForLoadState('networkidle');

    // Scroll the page down before opening the modal. The trigger button is
    // now well above the viewport — focus restore on close used to yank the
    // page back to the trigger, which we want to never happen again.
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 800);

    // Trigger via DOM rather than playwright's .click() so the framework's
    // auto-scroll-into-view does not move the page itself before measurement.
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Open modal');
      btn?.click();
    });
    await expect(page.getByText('Scrollspy in modal', { exact: true })).toBeVisible();
    await page.waitForFunction(() => {
      const host = document.querySelector('bs-modal-content');
      if (!host) return false;
      const anims = (host as Element & { getAnimations?: (opts?: { subtree?: boolean }) => Animation[] })
        .getAnimations?.({ subtree: true }) ?? [];
      return anims.every((a) => a.playState === 'finished' || a.playState === 'idle');
    });

    const afterOpen = await page.evaluate(() => window.scrollY);
    expect(afterOpen).toBe(800);

    await page.evaluate(() => {
      const closeBtn = document.querySelector('bs-modal-content button.btn-close') as HTMLButtonElement | null;
      closeBtn?.click();
    });
    // Wait for the modal to leave (no more bs-modal-content in DOM, or no running animations).
    await page.waitForFunction(() => {
      const host = document.querySelector('bs-modal-content .modal');
      return host === null;
    });

    const afterClose = await page.evaluate(() => window.scrollY);
    expect(afterClose).toBe(800);
  });

  test('scrolling modal-body updates the active TOC entry', async ({ page }) => {
    await openScrollspyModal(page);

    // Active section starts on the first one.
    const initialActive = await page.evaluate(() => {
      return document.querySelector('bs-modal-content nav.spy button.fw-bold')?.textContent?.trim() ?? null;
    });
    expect(initialActive).toBe('Primary');

    // Scroll modal-body far enough to push several headings above the trigger line.
    await page.evaluate(async () => {
      const modalBody = document.querySelector('bs-modal-content .modal-body') as HTMLElement;
      modalBody.scrollTop = modalBody.scrollHeight; // bottom
      await new Promise((r) => setTimeout(r, 80));
    });

    const finalActive = await page.evaluate(() => {
      return document.querySelector('bs-modal-content nav.spy button.fw-bold')?.textContent?.trim() ?? null;
    });

    expect(finalActive).not.toBe(initialActive);
    expect(finalActive).not.toBeNull();
  });
});
