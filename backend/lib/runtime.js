const dns = require('dns').promises;
const net = require('net');

const { createAdapter } = require('./adapters');

const PRIVATE_IPV4_RANGES = [
  ['10.0.0.0', '10.255.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255']
];

const ipv4ToInt = (ip) => ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0);

const isPrivateIPv4 = (ip) => {
  const ipAsInt = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([start, end]) => ipAsInt >= ipv4ToInt(start) && ipAsInt <= ipv4ToInt(end));
};

const isPrivateIPv6 = (ip) => ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');

const isPrivateHost = async (hostname) => {
  const normalized = (hostname || '').toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }

  if (net.isIP(normalized) === 4) {
    return isPrivateIPv4(normalized);
  }

  if (net.isIP(normalized) === 6) {
    return isPrivateIPv6(normalized);
  }

  try {
    const records = await dns.lookup(normalized, { all: true, verbatim: true });
    return records.some(({ address }) => {
      if (net.isIP(address) === 4) {
        return isPrivateIPv4(address);
      }

      if (net.isIP(address) === 6) {
        return isPrivateIPv6(address);
      }

      return false;
    });
  } catch {
    return false;
  }
};

const validateEgressUrl = async (name, value, allowlist = []) => {
  if (!value) {
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS.`);
  }

  const isAllowedHost = allowlist.some((allowedHost) => parsedUrl.hostname === allowedHost || parsedUrl.hostname.endsWith(`.${allowedHost}`));
  if (!isAllowedHost && await isPrivateHost(parsedUrl.hostname)) {
    throw new Error(`${name} resolves to a private or loopback address, which is not allowed.`);
  }
};

class AgentRuntime {
  constructor(options = {}) {
    this.provider = options.provider || process.env.AGENT_PROVIDER || 'moltbot';
    this.adapter = options.adapter || createAdapter(this.provider);
  }

  async getStatus() {
    return {
      provider: this.provider,
      healthy: await this.adapter.health()
    };
  }

  async execute(input) {
    if (this.provider === 'moltbot') {
      const allowlist = (process.env.ALLOWED_EGRESS_HOSTS || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      await validateEgressUrl('MOLTBOT_URL', process.env.MOLTBOT_URL, allowlist);
    }

    return this.adapter.execute(input);
  }
}

module.exports = AgentRuntime;
module.exports.validateEgressUrl = validateEgressUrl;
module.exports.isPrivateHost = isPrivateHost;
