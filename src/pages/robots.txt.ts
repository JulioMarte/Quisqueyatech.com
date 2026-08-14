export const prerender = true;
export function GET({site}:{site:URL|undefined}){const base=(site||new URL("https://www.quisqueyatech.com")).toString();return new Response(`User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`,{headers:{"Content-Type":"text/plain"}})}
