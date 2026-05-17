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

      return originalFetch(input, init);
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
}

function rewriteGoogleUrl(url: string): string {
  if (url.includes('identitytoolkit.googleapis.com')) {
    return url.replace('https://identitytoolkit.googleapis.com', '/__firebase/identitytoolkit');
  } else if (url.includes('securetoken.googleapis.com')) {
    return url.replace('https://securetoken.googleapis.com', '/__firebase/securetoken');
  } else if (url.includes('firestore.googleapis.com')) {
    return url.replace('https://firestore.googleapis.com', '/__firebase/firestore');
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
