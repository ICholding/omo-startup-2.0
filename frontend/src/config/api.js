/**
 * API configuration helpers.
 *
 * Vite exposes environment variables via import.meta.env and requires
 * variables to be prefixed with VITE_. We also support REACT_APP_API_URL
 * to ease migrations from Create React App projects.
 */

const trimTrailingSlash = (value) => value?.replace(/\/+$/, '') || '';

const getConfiguredBaseUrl = () => {
  const viteApiUrl = import.meta.env?.VITE_API_URL;
  const legacyReactApiUrl = import.meta.env?.REACT_APP_API_URL;

  return trimTrailingSlash(viteApiUrl || legacyReactApiUrl || '');
};

const inferRenderBackendUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname } = window.location;
  const explicitRenderBackendHost = trimTrailingSlash(import.meta.env?.VITE_RENDER_BACKEND_HOST || '');

  if (explicitRenderBackendHost) {
    if (/^https?:\/\//.test(explicitRenderBackendHost)) {
      return explicitRenderBackendHost;
    }

    return `${protocol}//${explicitRenderBackendHost}`;
  }

  if (!hostname.endsWith('.onrender.com') || hostname.includes('-backend.')) {
    return '';
  }

  const service = hostname.replace('.onrender.com', '');

  if (service.endsWith('-frontend')) {
    return `${protocol}//${service.replace(/-frontend$/, '-backend')}.onrender.com`;
  }

  return `${protocol}//${service}-backend.onrender.com`;
};

export const getApiBaseUrl = () => {
  const configuredBaseUrl = getConfiguredBaseUrl();
  return configuredBaseUrl || inferRenderBackendUrl();
};

export const getSocketBaseUrl = () => {
  const socketUrl = import.meta.env?.VITE_SOCKET_URL;
  return trimTrailingSlash(socketUrl || getApiBaseUrl());
};

export const getApiUrl = (path = '') => {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path?.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
};

export const getAdminAuthHeader = () => {
  const username = import.meta.env?.VITE_ADMIN_USERNAME || 'admin';
  const password = import.meta.env?.VITE_ADMIN_PASSWORD || 'changeme123';

  return `Basic ${btoa(`${username}:${password}`)}`;
};
