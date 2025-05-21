import { beforeEach, it, describe, expect, vi } from 'vitest';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import semver from 'semver';

let project;

import main from '../index.js';

// this is to prevent the tests from being flakey and also stops it hitting the network
vi.mock('latest-version', () => {
  return {
    default(pkg, { version }) {
      // latest is always all sevens
      if (version === 'latest') {
        return '7.7.7';
      }

      // otherwise increment a minor
      return semver.inc(semver.valid(semver.coerce(version)), 'minor');
    },
  };
});

describe('Basic test', () => {
  beforeEach(async () => {
    const { Project } = require('fixturify-project');
    project = new Project('test-project');

    project.addDependency('mocha', '^5.1.0');
    await project.write();
  });

  it('updates a package.json', async () => {
    await main([
      'fake',
      'fake',
      '--ember-source',
      'latest',
      '--ember-data',
      'latest',
      join(project.baseDir, 'package.json'),
    ]);

    const contents = await readFile(
      join(project.baseDir, 'package.json'),
      'utf8',
    );
    expect(contents).toMatchInlineSnapshot(`
      "{
        "name": "test-project",
        "version": "0.0.0",
        "keywords": [],
        "dependencies": {
          "mocha": "^5.2.0"
        },
        "devDependencies": {}
      }
      "
    `);
  });

  it('updates a package.json with latest version', async () => {
    await main([
      'fake',
      'fake',
      '--ember-source',
      'latest',
      '--ember-data',
      'latest',
      '--latest',
      join(project.baseDir, 'package.json'),
    ]);

    const contents = await readFile(
      join(project.baseDir, 'package.json'),
      'utf8',
    );
    expect(contents).toMatchInlineSnapshot(`
      "{
        "name": "test-project",
        "version": "0.0.0",
        "keywords": [],
        "dependencies": {
          "mocha": "^7.7.7"
        },
        "devDependencies": {}
      }
      "
    `);
  });
});
