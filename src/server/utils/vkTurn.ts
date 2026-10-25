/**
 * Builds 1-Click vkturnproxy:// connection links, mirroring quick_link.py.
 *
 * The payload is a compact, key-sorted JSON document wrapped in URL-safe
 * base64 (no padding). Tapping the link on an iPhone imports the server
 * settings into the VK Turn Proxy app.
 */

/** Must match BackupManager.supportedConfigVersion in the iOS app. */
export const VK_TURN_PROXY_SCHEMA_VERSION = 1;

export const VK_TURN_PROXY_OBF_PROFILES = [
  'rtpopus',
  'rtpopus2',
  'rtpopus3',
] as const;

/** 32-byte key, as required by free-turn-proxy's -obf-key */
export const VK_TURN_WRAP_KEY_PATTERN = /^[0-9a-f]{64}$/i;

export type VkTurnProxyObfProfile = (typeof VK_TURN_PROXY_OBF_PROFILES)[number];

export type VkTurnProxySettings = {
  privateKey: string;
  peerPublicKey: string;
  tunnelAddress: string;
  vkLink: string;
  peerAddress: string;
  presharedKey?: string | null;
  dnsServers?: string[] | null;
  wrapKeyHex: string;
  obfProfile: VkTurnProxyObfProfile;
  clientID: string;
  serverName?: string | null;
};

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)])
    );
  }

  return value;
}

export function buildVkTurnProxyUrl(settings: Record<string, unknown>) {
  const payload = sortKeys({
    version: VK_TURN_PROXY_SCHEMA_VERSION,
    type: 'connection',
    settings,
  });

  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );

  return `vkturnproxy://import?data=${data}`;
}

/**
 * Maps a WireGuard client onto the settings quick_link.py derives from a
 * client .conf. Optional keys are omitted entirely when empty so the iOS
 * importer keeps its current value.
 */
export function buildVkTurnProxySettings({
  privateKey,
  peerPublicKey,
  tunnelAddress,
  vkLink,
  peerAddress,
  presharedKey,
  dnsServers,
  wrapKeyHex,
  obfProfile,
  clientID,
  serverName,
}: VkTurnProxySettings): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    privateKey,
    peerPublicKey,
    tunnelAddress,
    vkLink,
    peerAddress,
  };

  if (presharedKey) {
    settings.presharedKey = presharedKey;
  }

  if (dnsServers && dnsServers.length > 0) {
    settings.dnsServers = dnsServers.join(', ');
  }

  settings.numConnections = 30;

  if (serverName) {
    settings.serverName = serverName;
  }

  settings.useDTLS = true;
  settings.useWrap = false;
  settings.wrapKeyHex = wrapKeyHex;
  settings.useSrtp = false;
  settings.useUDP = false;
  settings.useWrapA = false;
  settings.useWrapS = true;
  settings.obfProfile = obfProfile;
  settings.clientID = clientID;

  return settings;
}
