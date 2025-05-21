import { program, Option } from 'commander';
import { join } from 'node:path';
import fs from 'node:fs';
import _latestVersion from 'latest-version';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(join(import.meta.dirname, 'package.json'), 'utf8'));

program
  .name(pkg.name)
  .version(pkg.version)
  .addHelpText('after', `

Examples:

  node dev/update-blueprint-dependencies.js --ember-source=beta --ember-data=beta
  node dev/update-blueprint-dependencies.js --filter /eslint/
  node dev/update-blueprint-dependencies.js --filter some-package@beta
`)
  .description('This script updates the dependencies / devDependencies in package.json files and is tolerant of EJS templates')
  .requiredOption('--ember-source <dist-tag>', 'The dist-tag to use for ember-source')
  .requiredOption('--ember-data <dist-tag>', 'The dist-tag to use for ember-data')
  .option('--ember-cli <dist-tag>', 'The dist-tag to use for ember-cli')
  .addOption(new Option('--filter <regex>', 'A RegExp to filter the packages to update by').argParser((value) => new RegExp(value)))
  .option('--latest', `Always use the latest version available for a package (includes major bumps, 'false' by default)`)
  .argument('<files...>', 'package.json files to update');

export default async function main(argv) {
  program.parse(argv);

  const OPTIONS = program.opts();

  const PACKAGE_FILES = program.args;

  function shouldCheckDependency(dependency) {
    if (OPTIONS.filter) {
      return OPTIONS.filter.test(dependency);
    }

    return true;
  }

  const LATEST = new Map();
  async function latestVersion(packageName, semverRange) {
    let result = LATEST.get(packageName);

    if (result === undefined) {
      let options = {
        version: semverRange,
      };

      if (OPTIONS[packageName]) {
        options.version = OPTIONS[packageName];
      }

      result = _latestVersion(packageName, options);
      LATEST.set(packageName, result);
    }

    return result;
  }

  async function updateDependencies(dependencies) {
    for (let dependencyKey in dependencies) {
      let dependencyName = removeTemplateExpression(dependencyKey);

      if (!shouldCheckDependency(dependencyName)) {
        continue;
      }

      let previousValue = dependencies[dependencyKey];

      // grab the first char (~ or ^)
      let prefix = previousValue[0];
      let isValidPrefix = prefix === '~' || prefix === '^';

      // handle things from blueprints/app/files/package.json like `^2.4.0<% if (welcome) { %>`
      let templateSuffix = previousValue.includes('<') ? previousValue.slice(previousValue.indexOf('<')) : '';

      // check if we are dealing with `~<%= emberCLIVersion %>`
      let hasVersion = previousValue[1] !== '<';

      if (hasVersion && isValidPrefix) {
        const semverRange = OPTIONS.latest ? 'latest' : removeTemplateExpression(previousValue);
        const newVersion = await latestVersion(dependencyName, semverRange);

        dependencies[dependencyKey] = `${prefix}${newVersion}${templateSuffix}`;
      }
    }
  }

  function removeTemplateExpression(dependency) {
    if (dependency.includes('<') === false) {
      return dependency;
    }

    let semverRange = dependency.replace(
      dependency.substring(dependency.indexOf('<'), dependency.lastIndexOf('>') + 1),
      ''
    );

    return semverRange;
  }

  for (let filePath of PACKAGE_FILES) {
    let pkg = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf8' }));

    await updateDependencies(pkg.dependencies);
    await updateDependencies(pkg.devDependencies);

    let output = `${JSON.stringify(pkg, null, 2)}\n`;

    fs.writeFileSync(filePath, output, { encoding: 'utf8' });
  }
}