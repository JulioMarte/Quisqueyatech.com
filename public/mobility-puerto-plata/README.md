# Puerto Plata · Laboratorio GIS de la Línea 1

Visor estático aislado del resto de QuisqueyaTech. Abrir `index.html` con conexión a internet para Leaflet y OpenStreetMap. No se introduce densidad sintética en el mapa.

## Formato de datos
- **Ruta**: GeoJSON `FeatureCollection` con `LineString` o `MultiLineString` en WGS84, generado a partir de KML/KMZ validado.
- **Paradas**: GeoJSON `FeatureCollection` con puntos WGS84 y propiedad `name` o `nombre`.
- **Censo**: GeoJSON `FeatureCollection` con polígonos y propiedad numérica de población, por defecto `poblacion`.

La ONE 2022 publica tablas agregadas, pero el conjunto población + polígonos submunicipales georreferenciados aún no ha sido validado. No atribuir cifras municipales homogéneamente a manzanas. La captura Google Maps 10.6 km y 18 min corresponde a viaje sin paradas y tráfico ligero, no es ruta GIS ni demanda.

Los círculos de 500m son distancias geodésicas, NO isócronas a pie. Las densidades se calculan en el navegador con una fórmula aproximada de área esférica adecuada para exploración, no auditoría de ingeniería. Verificar CRS, clasificación censal, población, geometrías y licencias antes de publicar conclusiones.

## Pruebas
`python3 tests/validate_mobility.py` confirma estructura, etiquetas de incertidumbre y ausencia de datos censales falsos.

## CI
Workflow `mobility-map-ci.yml` ejecuta las validaciones y publica el HTML como artefacto de Actions. **No se activa GitHub Pages automáticamente ni se modifica producción.** Una vez aceptado el PR se puede configurar Pages o montar la página en un dominio de QuisqueyaTech.
