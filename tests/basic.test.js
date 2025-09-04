import { beforeEach, it, describe, expect, vi } from 'vitest';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import semver from 'semver';
import { Project } from 'fixturify-project';

const mockConsoleError = vi.spyOn(console, 'error');
const mockExit = vi.spyOn(process, 'exit').mockImplementation((exitCode) => {
  throw new Error(`process exit: ${exitCode}`);
});

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

      if (version === 'beta') {
        return '8.0.0-beta.5';
      }

      // otherwise increment a minor
      return semver.inc(semver.valid(semver.coerce(version)), 'minor');
    },
  };
});

describe('Basic test', () => {
  beforeEach(async () => {
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
      '--tag',
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
          "mocha": "^7.7.7"
        },
        "devDependencies": {}
      }
      "
    `);
  });

  it('works correctly with --filter', async () => {
    project = new Project('test-project');

    project.addDependency('mocha', '^5.1.0');
    project.addDependency('@ember-data/thingy', '~5.3.8');
    project.addDependency('@ember-data/store', '~5.1.0');
    project.addDependency('ember-source', '~1.1.0');
    await project.write();

    await main([
      'fake',
      'fake',
      '--tag',
      'latest',
      '--filter',
      '@ember-data/*',
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
          "mocha": "^5.1.0",
          "@ember-data/thingy": "~7.7.7",
          "@ember-data/store": "~7.7.7",
          "ember-source": "~1.1.0"
        },
        "devDependencies": {}
      }
      "
    `);
  });

  it('works correctly with --filter and --tag', async () => {
    project = new Project('test-project');

    project.addDependency('mocha', '^5.1.0');
    project.addDependency('@ember-data/thingy', '~5.3.8');
    project.addDependency('@ember-data/store', '~5.1.0');
    await project.write();

    await main([
      'fake',
      'fake',
      '--tag',
      'beta',
      '--filter',
      '@ember-data/*',
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
          "mocha": "^5.1.0",
          "@ember-data/thingy": "~8.0.0-beta.5",
          "@ember-data/store": "~8.0.0-beta.5"
        },
        "devDependencies": {}
      }
      "
    `);
  });

  it('throws an error if you dont pass --filter or --ember-source', async () => {
    project = new Project('test-project');

    project.addDependency('mocha', '^5.1.0');
    project.addDependency('@ember-data/thingy', '~5.3.8');
    project.addDependency('@ember-data/store', '~5.1.0');
    await project.write();

    await expect(
      main(['fake', 'fake', join(project.baseDir, 'package.json')]),
    ).rejects.toThrowError();

    expect(mockExit).to.be.toBeCalledWith(1);
    expect(mockConsoleError.mock.lastCall).toMatchInlineSnapshot(`
      [
        "You must pass '--ember-source' or '--filter' arguments to this command. Try running again with '--help' for more information",
      ]
    `);

    // make sure that nothing in the package.json changed
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
          "mocha": "^5.1.0",
          "@ember-data/thingy": "~5.3.8",
          "@ember-data/store": "~5.1.0"
        },
        "devDependencies": {}
      }
      "
    `);
  });
});
