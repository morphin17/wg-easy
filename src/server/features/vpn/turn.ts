import { createError } from 'nuxt/server';

import { authorizeClient, type Actor } from './policies';

import { WG_ENV } from '#server/utils/config';
import { formatEndpoint } from '#server/utils/endpoint';
import {
  buildVkTurnProxySettings,
  buildVkTurnProxyUrl,
  VK_TURN_WRAP_KEY_PATTERN,
} from '#server/utils/vkTurn';
import { getDatabase } from '#db';

function vkTurnProxyConfig() {
  const vkLink = WG_ENV.VK_TURN_LINK;
  const wrapKeyHex = WG_ENV.VK_TURN_WRAP_KEY;
  const port = WG_ENV.VK_TURN_PORT;

  if (!vkLink || !wrapKeyHex || !port) {
    return null;
  }

  return { vkLink, wrapKeyHex, port };
}

/** If the UI should offer vkturnproxy:// links. */
export function isVkTurnProxyEnabled() {
  const config = vkTurnProxyConfig();
  return config !== null && VK_TURN_WRAP_KEY_PATTERN.test(config.wrapKeyHex);
}

function clientId(name: string, id: number) {
  const clean = name
    .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
    .replace(/(-{2,}|-$)/g, '-')
    .replace(/-$/, '')
    .substring(0, 32);
  return clean || String(id);
}

/** Builds a 1-Click vkturnproxy:// import link for the client. */
export function turnLink(actor: Actor, id: number) {
  return getDatabase().transaction(async (tx) => {
    const client = authorizeClient(actor, 'view', await tx.clients.get(id));

    const config = vkTurnProxyConfig();
    if (!config) {
      throw createError({
        status: 404,
        statusText: 'VK Turn Proxy is not configured',
      });
    }

    if (!VK_TURN_WRAP_KEY_PATTERN.test(config.wrapKeyHex)) {
      throw createError({
        status: 500,
        statusText: 'VK_TURN_WRAP_KEY must be 64 hex characters',
      });
    }

    const network = await tx.interfaces.get();
    const defaults = await tx.userConfigs.get();

    const settings = buildVkTurnProxySettings({
      privateKey: client.privateKey,
      peerPublicKey: network.publicKey,
      tunnelAddress: `${client.ipv4Address}/32`,
      presharedKey: client.preSharedKey,
      dnsServers: client.dns ?? defaults.defaultDns,
      vkLink: config.vkLink,
      peerAddress: formatEndpoint(defaults.host, config.port),
      wrapKeyHex: config.wrapKeyHex,
      obfProfile: WG_ENV.VK_TURN_OBF_PROFILE,
      clientID: clientId(client.name, client.id),
      serverName: client.name,
    });

    return { url: buildVkTurnProxyUrl(settings) };
  });
}
