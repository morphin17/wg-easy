import { afterEach, describe, expect, test, vi } from 'vitest';

import { databaseFixture } from '../helpers/database';

import * as schema from '#db/schema';
import { roles } from '#shared/utils/permissions';

const environment = vi.hoisted(() => ({
  VK_TURN_LINK: 'https://vk.me/join/AbCd' as string | null,
  VK_TURN_WRAP_KEY: '00'.repeat(32) as string | null,
  VK_TURN_OBF_PROFILE: 'rtpopus',
  VK_TURN_PORT: 56000 as number | null,
}));

vi.mock('#server/utils/config', () => ({ WG_ENV: environment }));

const admin = { id: 1, role: roles.ADMIN };

afterEach(() => {
  environment.VK_TURN_PORT = 56000;
});

async function fixture() {
  const { db, store } = await databaseFixture();
  await store.userConfigs.update({ host: 'vpn.example.com', port: 51820 });
  await db.insert(schema.user).values({
    id: 1,
    username: 'admin',
    name: 'Admin',
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
  await db.insert(schema.client).values({
    id: 1,
    userId: 1,
    interfaceId: 'wg0',
    name: 'Client',
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fdcc:ad94:bacf:61a4::cafe:2',
    privateKey: 'private',
    publicKey: 'public',
    serverAllowedIps: [],
    persistentKeepalive: 0,
    enabled: true,
  });
  return import('#server/features/vpn/turn');
}

function decode(url: string) {
  return JSON.parse(
    Buffer.from(url.split('?data=')[1]!, 'base64url').toString('utf8')
  );
}

describe('VK Turn Proxy link', () => {
  test('uses the TURN server port instead of the WireGuard port', async () => {
    const turn = await fixture();
    const { url } = await turn.turnLink(admin, 1);
    expect(decode(url).settings.peerAddress).toBe('vpn.example.com:56000');
    expect(turn.isVkTurnProxyEnabled()).toBe(true);
  });

  test('is disabled without VK_TURN_PORT', async () => {
    const turn = await fixture();
    environment.VK_TURN_PORT = null;
    expect(turn.isVkTurnProxyEnabled()).toBe(false);
    await expect(turn.turnLink(admin, 1)).rejects.toMatchObject({
      status: 404,
    });
  });
});
