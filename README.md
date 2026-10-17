# Entrenador de Lectura Rápida

Web app estática (HTML + CSS + JavaScript puro, sin dependencias ni build) basada en la
*Guía Práctica de Lectura Rápida*: visión periférica y eliminación de la subvocalización.

## Ejercicios

- **Tablas de Schulte** (3×3, 5×5, 7×7): modo clic o modo foco (Espacio), cronómetro y récords.
- **Sangría visual**: lectura por bloques con 2-3 fijaciones por línea y márgenes atenuados.
- **Bloqueo fonético**: puntero a ritmo constante + metrónomo "un-dos-tres" / "A-B-C".
- **Sobrevuelo (escoba)**: 2 min a 1 s/línea y luego 1 min a 2 s/línea.
- **Rutina diaria de 10 minutos** que encadena los cuatro ejercicios.
- Textos de práctica incluidos o tu propio texto pegado.

No usa base de datos ni servidor: los ajustes, récords y el texto propio se guardan solo en el
`localStorage` del navegador.

## Probar en local

Los módulos ES no funcionan abriendo `index.html` con `file://`; usa un servidor estático:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Desplegar en GitHub Pages

```bash
git init && git add . && git commit -m "Entrenador de lectura rápida"
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
rama `main`, carpeta `/ (root)`. La app quedará en `https://<usuario>.github.io/<repo>/`.
