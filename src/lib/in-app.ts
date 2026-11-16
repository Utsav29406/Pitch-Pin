// Google refuses sign-in inside apps' built-in browsers (Error 403: disallowed_useragent),
// which is where links shared on WhatsApp, Instagram or Facebook open.
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|Snapchat|LinkedInApp|Line\/|MicroMessenger|Twitter|; wv\)/i;
const IOS_WEBVIEW = /(iPhone|iPad|iPod).*AppleWebKit(?!.*Safari)/i;

export function isInAppBrowser(ua: string | null | undefined) {
  return !!ua && (IN_APP.test(ua) || IOS_WEBVIEW.test(ua));
}

/** Opens a URL in Chrome from an Android in-app browser, falling back to the same URL. */
export function chromeIntent(url: string) {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
