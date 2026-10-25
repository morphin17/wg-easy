import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { WG_ENV } from '#server/utils/config';
import { formatEndpoint } from '#server/utils/endpoint';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import {
  buildVkTurnProxySettings,
  buildVkTurnProxyUrl,
  VK_TURN_WRAP_KEY_PATTERN,
} from '#server/utils/vkTurn';
import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    const vkLink = WG_ENV.VK_TURN_LINK;
    const wrapKeyHex = WG_ENV.VK_TURN_WRAP_KEY;

    if (!vkLink || !wrapKeyHex) {
      throw createError({
        statusCode: 404,
        statusMessage: 'VK Turn Proxy is not configured',
      });
    }

    if (!VK_TURN_WRAP_KEY_PATTERN.test(wrapKeyHex)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'VK_TURN_WRAP_KEY must be 64 hex characters',
      });
    }

    if (!client.privateKey) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Client has no known private key',
      });
    }

    const wgInterface = await Database.interfaces.get();
    const userConfig = await Database.userConfigs.get();

    const settings = buildVkTurnProxySettings({
      privateKey: client.privateKey,
      peerPublicKey: wgInterface.publicKey,
      tunnelAddress: `${client.ipv4Address}/32`,
      presharedKey: client.preSharedKey,
      dnsServers: client.dns ?? userConfig.defaultDns,
      vkLink,
      peerAddress: formatEndpoint(userConfig.host, userConfig.port),
      wrapKeyHex,
      obfProfile: WG_ENV.VK_TURN_OBF_PROFILE,
      clientID: WireGuard.cleanClientFilename(client.name) || String(client.id),
      serverName: client.name,
    });

    return { url: buildVkTurnProxyUrl(settings) };
  }
);
