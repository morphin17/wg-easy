import { defineEventHandler } from 'h3';
import { gt } from 'semver';

import Database from '#server/utils/Database';
import { RELEASE, WG_ENV } from '#server/utils/config';
import { cachedFetchLatestRelease } from '#server/utils/release';
import { VK_TURN_WRAP_KEY_PATTERN } from '#server/utils/vkTurn';

export default defineEventHandler(async () => {
  const latestRelease = await cachedFetchLatestRelease();
  const updateAvailable = gt(latestRelease.version, RELEASE);
  const insecure = WG_ENV.INSECURE;
  const isAwg = WG_ENV.WG_EXECUTABLE === 'awg';
  const wgInterface = await Database.interfaces.get();

  return {
    currentRelease: RELEASE,
    latestRelease: latestRelease,
    updateAvailable,
    insecure,
    isAwg,
    firewallEnabled: wgInterface.firewallEnabled,
    vkTurnProxyEnabled: Boolean(
      WG_ENV.VK_TURN_LINK &&
      WG_ENV.VK_TURN_WRAP_KEY &&
      VK_TURN_WRAP_KEY_PATTERN.test(WG_ENV.VK_TURN_WRAP_KEY)
    ),
  };
});
