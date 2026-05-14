import { expect } from 'vitest';
import { getLatestVersion } from '../lib/latest-version';

import { describe, it, vi } from 'vitest';
import { afterEach } from 'vitest';
import { beforeEach } from 'vitest';

// this is to prevent the tests from being flakey and also stops it hitting the network
vi.mock('@pnpm/deps.inspection.commands', () => {
  return {
    view: {
      handler: (_config, [, command]) => {
        if (command === 'time') {
          return JSON.stringify({
            '6.8.1': '2025-10-30T21:30:31.370Z',
            '6.8.2': '2025-11-18T03:17:47.374Z',
            '6.8.3': '2026-02-04T16:40:48.317Z',
            '6.11.0': '2026-02-17T19:17:36.602Z',
            '6.12.0-beta.1': '2026-02-17T19:44:18.872Z',
            '6.12.0-beta.3': '2026-03-25T21:10:01.406Z',
            '6.11.1': '2026-03-27T18:30:03.295Z',
            '6.8.4': '2026-03-27T18:33:51.904Z',
            '6.12.0': '2026-03-31T22:18:12.452Z',
            '7.0.0-beta.1': '2026-04-01T01:15:02.043Z',
            '7.0.0-alpha.1': '2026-04-01T20:38:07.383Z',
            '7.1.0-alpha.1': '2026-04-08T20:43:50.777Z',
            '7.1.0-alpha.2': '2026-04-15T20:47:34.803Z',
            '7.0.0': '2026-05-12T03:06:57.388Z',
            '7.1.0-beta.1': '2026-05-12T17:52:31.003Z',
          });
        }

        if (command === 'dist-tags') {
          return JSON.stringify({
            old: '6.8.4',
            lts: '6.12.0',
            beta: '7.1.0-beta.1',
            alpha: '7.1.0-alpha.5',
            latest: '7.0.0',
          });
        }
      },
    },
  };
});

describe('getLatestVersion function', function () {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('can get the latest in range', async function () {
    const result = await getLatestVersion('ember-soruce', '~6.8.1');
    expect(result).to.equal('6.8.4');
  });

  it('does not update to the latest range version if it is outside of our 1 week window', async function () {
    const date = new Date('2026-03-29');
    vi.setSystemTime(date);
    const result = await getLatestVersion('ember-soruce', '~6.8.1');
    expect(result).to.equal('6.8.3');
  });

  it('gives you the beta version if you ask for the beta tag', async function () {
    const result = await getLatestVersion('ember-soruce', '~6.8.1', 'beta');
    expect(result).to.equal('7.1.0-beta.1');
  });
});
