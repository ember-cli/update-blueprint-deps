import { view } from '@pnpm/deps.inspection.commands';
import { getConfig } from '@pnpm/config.reader';
import { packageManager } from '@pnpm/cli.meta';
import semver from 'semver';
import 'temporal-polyfill/global';

const { config, context } = await getConfig({
  cliOptions: {},
  packageManager,
});

/**
 * This function is used to get the latest version of a package that is in-range for the specified semverRange. There is a built-in
 * implementation for minimum package age to prevent you forcing an update to a compromised npm package. For the use-case of this
 * function it would be a small window that you would need to be compromised but better safe than sorry!
 *
 * @param {string} dependencyName - npm dependency
 * @param {string} semverRange - a valid semver range that can be passed directly to the semver package
 * @param {string} [tag] - if passed it will pick the relevant dist-tag from npm instead of reading semverRange
 * @returns {string|undefined} the updated version in range or undefined if tag requested and the tag is missing from dist-tags
 */
export async function getLatestVersion(dependencyName, semverRange, tag) {
  if (tag) {
    const distTags = JSON.parse(
      await view.handler({ config, context, registries: config.registries }, [
        dependencyName,
        'dist-tags',
      ]),
    );

    if (!distTags[tag]) {
      console.warn(`No tag ${tag} found for ${dependencyName}`);
      return;
    }

    return distTags[tag];
  }

  const timeResults = JSON.parse(
    await view.handler({ config, context, registries: config.registries }, [
      dependencyName,
      'time',
    ]),
  );

  const minimumDaysOld = 7;

  const filteredResults = Object.entries(timeResults).filter(
    ([version, datestring]) => {
      if (!semver.satisfies(version, semverRange)) {
        return false;
      }

      const now = Temporal.Now.instant();
      const releaseTime = Temporal.Instant.from(datestring);

      const duration = releaseTime.until(now);

      if (
        Temporal.Duration.compare(
          duration,
          Temporal.Duration.from({ days: minimumDaysOld }),
        ) < 0
      ) {
        return false;
      }

      return true;
    },
  );

  if (filteredResults.length === 0) {
    console.warn(
      `There are no versions that match range "${semverRange}" for "${dependencyName}" that are older than ${minimumDaysOld} days`,
    );
    console.warn('skipping this package');
    return;
  }

  return filteredResults.at(-1)[0];
}
