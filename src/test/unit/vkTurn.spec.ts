import { describe, expect, test } from 'vitest';

import {
  buildVkTurnProxySettings,
  buildVkTurnProxyUrl,
} from '#server/utils/vkTurn';

const WRAP_KEY_HEX = '00'.repeat(32);

const settings = {
  privateKey: 'JPJ2DWzJbwrRkY6cPbZaJasL6bHQOM6J2Ollx4D/OHU=',
  peerPublicKey: 'xTIBA5rboUvnH4htodjb6e697QjLERt1NAB4mZqp8Dg=',
  tunnelAddress: '10.8.0.2/32',
  vkLink: 'https://vk.me/join/AbCdEf123',
  peerAddress: '203.0.113.10:51820',
  presharedKey: 'FpV7pY3P6v0yq2m9cS1oQ4bW8mZt5rJx7kLd2nH6uE0=',
  dnsServers: ['1.1.1.1', '2606:4700:4700::1111'],
  wrapKeyHex: WRAP_KEY_HEX,
  obfProfile: 'rtpopus' as const,
  clientID: 'iPhone',
  serverName: 'iPhone',
};

function decode(url: string) {
  const encoded = url.split('?data=')[1];
  expect(encoded).toBeTruthy();
  return JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8'));
}

describe('vkTurn', () => {
  test('builds the same URL as quick_link.py', () => {
    expect(buildVkTurnProxyUrl(buildVkTurnProxySettings(settings))).toBe(
      'vkturnproxy://import?data=eyJzZXR0aW5ncyI6eyJjbGllbnRJRCI6ImlQaG9uZSIsImRuc1NlcnZlcnMiOiIxLjEuMS4xLCAyNjA2OjQ3MDA6NDcwMDo6MTExMSIsIm51bUNvbm5lY3Rpb25zIjozMCwib2JmUHJvZmlsZSI6InJ0cG9wdXMiLCJwZWVyQWRkcmVzcyI6IjIwMy4wLjExMy4xMDo1MTgyMCIsInBlZXJQdWJsaWNLZXkiOiJ4VElCQTVyYm9Vdm5INGh0b2RqYjZlNjk3UWpMRVJ0MU5BQjRtWnFwOERnPSIsInByZXNoYXJlZEtleSI6IkZwVjdwWTNQNnYweXEybTljUzFvUTRiVzhtWnQ1ckp4N2tMZDJuSDZ1RTA9IiwicHJpdmF0ZUtleSI6IkpQSjJEV3pKYndyUmtZNmNQYlphSmFzTDZiSFFPTTZKMk9sbHg0RC9PSFU9Iiwic2VydmVyTmFtZSI6ImlQaG9uZSIsInR1bm5lbEFkZHJlc3MiOiIxMC44LjAuMi8zMiIsInVzZURUTFMiOnRydWUsInVzZVNydHAiOmZhbHNlLCJ1c2VVRFAiOmZhbHNlLCJ1c2VXcmFwIjpmYWxzZSwidXNlV3JhcEEiOmZhbHNlLCJ1c2VXcmFwUyI6dHJ1ZSwidmtMaW5rIjoiaHR0cHM6Ly92ay5tZS9qb2luL0FiQ2RFZjEyMyIsIndyYXBLZXlIZXgiOiIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIn0sInR5cGUiOiJjb25uZWN0aW9uIiwidmVyc2lvbiI6MX0'
    );
  });

  test('omits empty optional settings', () => {
    const payload = decode(
      buildVkTurnProxyUrl(
        buildVkTurnProxySettings({
          ...settings,
          presharedKey: '',
          dnsServers: [],
          serverName: '',
        })
      )
    );

    expect(payload).toMatchObject({
      version: 1,
      type: 'connection',
      settings: {
        useWrapS: true,
        obfProfile: 'rtpopus',
        privateKey: settings.privateKey,
        peerPublicKey: settings.peerPublicKey,
        tunnelAddress: '10.8.0.2/32',
        vkLink: settings.vkLink,
        peerAddress: settings.peerAddress,
        wrapKeyHex: WRAP_KEY_HEX,
        clientID: 'iPhone',
      },
    });
    expect(payload.settings).not.toHaveProperty('presharedKey');
    expect(payload.settings).not.toHaveProperty('dnsServers');
    expect(payload.settings).not.toHaveProperty('serverName');
  });

  test('emits url-safe base64 without padding', () => {
    const url = buildVkTurnProxyUrl(buildVkTurnProxySettings(settings));
    const encoded = url.split('?data=')[1]!;

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
