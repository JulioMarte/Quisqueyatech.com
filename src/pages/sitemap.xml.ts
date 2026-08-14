import { pages } from "../data/pages";
export const prerender = true;
export function GET({site}:{site:URL|undefined}) {
  const base=site||new URL("https://www.quisqueyatech.com");
  const paths=["/","/en",...pages.map(p=>`/${p.path}`)];
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${new URL(path,base).toString()}</loc><changefreq>${path==="/"||path==="/en"?"weekly":"monthly"}</changefreq><priority>${path==="/"||path==="/en"?"1.0":"0.7"}</priority></url>`).join("")}</urlset>`;
  return new Response(xml,{headers:{"Content-Type":"application/xml; charset=utf-8"}});
}
