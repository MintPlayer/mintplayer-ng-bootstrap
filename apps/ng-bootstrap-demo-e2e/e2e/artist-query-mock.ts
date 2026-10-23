import type { Page } from '@playwright/test';

export interface MockArtist {
  id: number;
  name: string;
  yearStarted: number;
  yearQuit: number | null;
}

/** The demo's artist query endpoint (the MintPlayer Spark app). */
export const ARTIST_QUERY_URL = '**/spark/queries/execute';

/**
 * Serves `artists` from the Spark query endpoint the demo's ArtistService
 * pages through, honouring skip/take, so the specs are deterministic and
 * offline-friendly. Row order is the array's; the sort is not applied.
 */
export async function mockArtistQuery(page: Page, artists: MockArtist[]) {
  await page.route(ARTIST_QUERY_URL, async (route) => {
    const req = JSON.parse(route.request().postData() ?? '{}') as { skip?: number; take?: number };
    const skip = req.skip ?? 0;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalItems: artists.length,
        skip,
        take: req.take ?? 20,
        items: artists.slice(skip, skip + (req.take ?? 20)).map((a) => ({
          id: `Artists/${a.id}`,
          breadcrumb: a.name,
          values: [
            { key: 'Name', value: a.name },
            { key: 'YearStarted', value: a.yearStarted },
            { key: 'YearQuit', value: a.yearQuit },
          ],
        })),
      }),
    });
  });
}
