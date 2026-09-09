/**
 * Browser extensions rewrite the server HTML before React gets to hydrate it.
 *
 * Form fillers and password managers stamp `fdprocessedid` onto every `<button>`
 * and `<input>`; Grammarly, Dark Reader, BitDefender and ColorZilla each add
 * their own bookkeeping attributes. None of it is in the HTML the server sent —
 * `curl` the page and there is not one of these attributes in it — so React's
 * hydration pass finds a DOM that no longer matches its own render and reports
 * a mismatch. React then recovers by client-rendering the whole boundary, which
 * on this page is the entire tree under `<SiteProvider>`.
 *
 * We cannot stop the extensions, but we can put the DOM back the way the server
 * left it before React looks at it. `HYDRATION_GUARD` is an inline script that
 * runs while the browser is still parsing `<head>` — before any element exists,
 * before hydration — and strips these attributes as they appear, then stands
 * down once the page has loaded and hydration is long finished.
 *
 * Anything not enumerated here (`__processed_<uuid>__` and `data-darkreader-*`
 * land on `<html>` and `<body>`) is covered by `suppressHydrationWarning` on
 * those two elements in the root layout, which is the only place React accepts
 * unknown attributes without complaint.
 */

/** Fixed attribute names, safe to hand to `MutationObserver.attributeFilter`. */
const EXACT = [
  // Form fillers / password managers — the one this project actually hit.
  "fdprocessedid",
  // BitDefender Anti-tracker.
  "bis_skin_checked",
  "bis_register",
  // ColorZilla.
  "cz-shortcut-listen",
  // Grammarly.
  "data-gr-ext-installed",
  "data-gr-c-s-loaded",
  "data-new-gr-c-s-check-loaded",
  "data-new-gr-c-s-loaded",
  "data-gramm",
  "data-gramm_editor",
  // LanguageTool.
  "data-lt-installed",
  // Honey / coupon injectors.
  "data-honey-extension-installed",
];

/** Prefixes with a generated suffix — matched by a sweep, not by the observer. */
const PREFIXES = ["__processed", "data-darkreader", "data-gr-", "data-lt-"];

/**
 * Runs synchronously during `<head>` parsing. Kept dependency-free, ES5, and
 * wrapped in `try`/`catch`: it must never be the reason a page fails to boot.
 *
 * The observer is given an `attributeFilter` on purpose. An unfiltered
 * `attributes: true` subtree observer would fire on every `style` write, and
 * this page writes `canvas.style.transform` once per animation frame.
 */
export const HYDRATION_GUARD = `(function(){try{
var E=${JSON.stringify(EXACT)},P=${JSON.stringify(PREFIXES)};
function s(el){var a=el.attributes;if(!a)return;for(var i=a.length-1;i>=0;i--){var n=a[i].name;
if(E.indexOf(n)>-1){el.removeAttribute(n);continue;}
for(var j=0;j<P.length;j++){if(n.lastIndexOf(P[j],0)===0){el.removeAttribute(n);break;}}}}
function all(){s(document.documentElement);var l=document.getElementsByTagName("*");for(var i=0;i<l.length;i++)s(l[i]);}
var o=new MutationObserver(function(r){for(var i=0;i<r.length;i++){var t=r[i].target;if(t&&t.nodeType===1)s(t);}});
o.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:E});
all();
document.addEventListener("DOMContentLoaded",all);
function done(){all();setTimeout(function(){try{o.disconnect();}catch(e){}},2000);}
if(document.readyState==="complete")done();else window.addEventListener("load",done,{once:true});
}catch(e){}})();`;
