export function enableFirebaseVPN() {
  if (typeof window === 'undefined') return;

  console.log('🛡️ VPN Tunnel for Firebase ACTIVATED. Routing traffic through backend proxy...');

  // 1. Intercept `fetch` for Auth / other API calls
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    value: async (...args: Parameters<typeof originalFetch>) => {
      let input = args[0];
      let init = args[1];

      if (typeof input === 'string') {
        input = rewriteGoogleUrl(input);
      } else if (input instanceof URL) {
        input = rewriteGoogleUrl(input.toString());
      } else if (input instanceof Request) {
        const newUrl = rewriteGoogleUrl(input.url);
        if (newUrl !== input.url) {
          const newInit: RequestInit = {
            method: input.method,
            headers: input.headers,
            credentials: input.credentials,
            mode: input.mode,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            integrity: input.integrity,
          };
          if (input.method !== 'GET' && input.method !== 'HEAD' && input.method !== 'OPTIONS') {
            try {
              const buffer = await input.clone().arrayBuffer();
              if (buffer.byteLength > 0) {
                newInit.body = buffer;
              }
            } catch (e) {
               // Ignored
            }
          }
          input = new Request(newUrl, newInit);
        }
      }

      return originalFetch.call(window, input, init);
    },
    writable: true,
    configurable: true
  });

  // 2. Intercept `XMLHttpRequest` safely via prototype
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    const finalUrl = rewriteGoogleUrl(url.toString());
    return origOpen.apply(this, [method, finalUrl, ...rest] as any);
  };

  // 3. Intercept `WebSocket` safely
  const OriginalWebSocket = window.WebSocket;
  const ProxyWebSocket = function(url: string | URL, protocols?: string | string[]) {
    let finalUrl = url.toString();
    if (finalUrl.includes('firestore.googleapis.com')) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      finalUrl = finalUrl.replace(/^wss?:\/\/firestore\.googleapis\.com/, `${wsProtocol}//${window.location.host}/__firebase/firestore`);
    }
    return new OriginalWebSocket(finalUrl, protocols);
  } as any;

  ProxyWebSocket.prototype = OriginalWebSocket.prototype;
  if ('CONNECTING' in OriginalWebSocket) {
    ProxyWebSocket.CONNECTING = (OriginalWebSocket as any).CONNECTING;
    ProxyWebSocket.OPEN = (OriginalWebSocket as any).OPEN;
    ProxyWebSocket.CLOSING = (OriginalWebSocket as any).CLOSING;
    ProxyWebSocket.CLOSED = (OriginalWebSocket as any).CLOSED;
  }

  try {
    Object.defineProperty(window, 'WebSocket', {
      value: ProxyWebSocket,
      configurable: true,
      writable: true
    });
  } catch (e) {
    console.warn('Could not redefine WebSocket directly, attempting fallback...', e);
    (window as any).WebSocket = ProxyWebSocket;
  }
}

function rewriteGoogleUrl(url: string): string {
  if (url.includes('identitytoolkit.googleapis.com')) {
    return url.replace(/^https?:\/\/identitytoolkit\.googleapis\.com/, '/__firebase/identitytoolkit');
  } else if (url.includes('securetoken.googleapis.com')) {
    return url.replace(/^https?:\/\/securetoken\.googleapis\.com/, '/__firebase/securetoken');
  } else if (url.includes('firestore.googleapis.com')) {
    return url.replace(/^https?:\/\/firestore\.googleapis\.com/, '/__firebase/firestore');
  }
  return url;
}

export function isVPNEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cmnl-vpn-enabled') === 'true';
}

export function toggleVPN() {
  if (typeof window === 'undefined') return;
  const current = isVPNEnabled();
  localStorage.setItem('cmnl-vpn-enabled', current ? 'false' : 'true');
  window.location.reload();
}
