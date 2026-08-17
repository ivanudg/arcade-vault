import type { NextConfig } from "next";

/**
 * HSTS sólo en producción, y el interruptor es `NODE_ENV`.
 *
 * En Next 16 el archivo de configuración ya no lo carga el comando `next dev`,
 * así que mirar los argumentos del proceso en busca de `dev` —lo que hacen los
 * ejemplos de Next 14 y 15— devuelve `false` en desarrollo y colaría la cabecera
 * sin que nada avise. Lo dice `01-app/02-guides/upgrading/version-16.md`,
 * «`next dev` config load», y recomienda este interruptor.
 *
 * Y no se manda en desarrollo aunque sobre `http://` el navegador deba
 * ignorarla: HSTS se guarda por **host** y no por puerto, así que el día que
 * cualquier cosa de esta máquina sirva `localhost` sobre https, un `max-age` de
 * dos años con `includeSubDomains` arrastraría a todos los demás proyectos, y
 * quitarlo se hace a mano en las entrañas del navegador.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * Las cabeceras de seguridad de SPEC 18.
 *
 * Van aquí y no en `proxy.ts` por dos razones que la documentación empaquetada
 * deja claras: `headers()` se resuelve **antes del sistema de ficheros**, así
 * que cubre también las páginas y lo de `public/` —`snake/fruits.png` incluido—;
 * y el `matcher` de `proxy.ts` excluye justamente eso, además de
 * `_next/static`, `_next/image` y `favicon.ico`. Ese archivo construye encima
 * tres `NextResponse` distintos, uno dentro de `setAll()`, así que habría que
 * pegarlas tres veces.
 *
 * `Content-Security-Policy` **no** está aquí: necesita un `nonce` por petición
 * para los scripts en línea de Next y es su propia spec. Es también lo que
 * sustituirá a `X-Frame-Options`, con `frame-ancestors 'none'`.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // DENY y no SAMEORIGIN: no hay marco propio ni ajeno en todo el repo, y lo
  // único que DENY rompe es embeber una pantalla del vault en otra.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Sin `preload`: es un compromiso separado —hay que enviar el dominio a la
  // lista de Chrome y salir de ella es lento— y hoy no hay dominio propio.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  turbopack: {
    // Hay un package-lock.json suelto por encima de este repo, y sin esto
    // Turbopack lo toma como raíz del workspace y avisa en cada build.
    root: import.meta.dirname,
  },
  allowedDevOrigins: ["192.168.100.157"],
  // Un `X-Powered-By: Next.js` en cada respuesta es información que no hace
  // falta dar.
  poweredByHeader: false,
  // Ojo: este archivo no se recarga en caliente. Al tocarlo hay que reiniciar el
  // servidor de desarrollo o las cabeceras no cambian.
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
};

export default nextConfig;
