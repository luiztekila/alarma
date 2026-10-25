# Lector PDF Voz para Android (GitHub Pages)

Aplicación web instalable (PWA) que muestra un catálogo de PDF alojados en la carpeta `pdfs/` del repositorio y lee el texto seleccionable con la función de voz del navegador.

## Archivos
- `index.html`: interfaz.
- `styles.css`: diseño adaptable a celulares.
- `app.js`: biblioteca, extracción de texto PDF y lectura en voz alta.
- `biblioteca.json`: catálogo de documentos.
- `pdfs/`: coloca aquí los PDF que quieres ofrecer.
- `manifest.json`, `sw.js`, `icon.svg`: instalación y caché básica de la aplicación.

## 1. Crear el repositorio
1. Entra a https://github.com/new e inicia sesión.
2. Crea un repositorio llamado `lector-pdf-voz`.
3. Para la configuración más sencilla, selecciona **Public**.
4. Sube todos los archivos de esta carpeta y la carpeta `pdfs`.

**Privacidad:** en un repositorio público, los PDF serán accesibles por cualquier persona. No subas documentos privados, personales o protegidos.

## 2. Agregar los PDF
1. Copia los PDF dentro de `pdfs/`. Usa nombres simples, sin tildes ni espacios, por ejemplo `manual-pnp.pdf`.
2. Abre `biblioteca.json` y reemplaza el ejemplo por una entrada por cada archivo.
3. Guarda el JSON con esta estructura:

```json
[
  {
    "title": "Manual de estudio",
    "description": "Material de preparación",
    "file": "pdfs/manual-pnp.pdf"
  },
  {
    "title": "Tema 2",
    "description": "Segundo documento",
    "file": "pdfs/tema-2.pdf"
  }
]
```

Cada `file` debe coincidir exactamente con el nombre del PDF, incluyendo mayúsculas/minúsculas. El último elemento no debe terminar con coma.

## 3. Activar GitHub Pages
1. En tu repositorio abre **Settings**.
2. En el menú lateral, entra a **Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. En Branch elige `main` y carpeta `/(root)`.
5. Pulsa **Save**.
6. Espera a que GitHub publique la página. La URL tendrá una forma similar a `https://TU-USUARIO.github.io/lector-pdf-voz/`.

## 4. Abrir en Android e instalar
1. Abre la URL de GitHub Pages en Chrome desde el celular.
2. Pulsa **Actualizar lista** si acabas de cambiar el catálogo.
3. Selecciona un PDF y pulsa **Abrir y preparar lectura**.
4. Pulsa **Leer**.
5. Para instalar, abre el menú de Chrome (⋮) y busca **Instalar aplicación** o **Añadir a pantalla de inicio**.

## 5. Actualizar la biblioteca
Cuando quieras agregar otro PDF, sube el archivo a `pdfs/`, añade una entrada en `biblioteca.json` y confirma los cambios. En la aplicación pulsa **Actualizar lista**. Puede que el navegador tarde un poco en reflejar los cambios por caché.

## Limitaciones
- Requiere internet para descargar el PDF y la biblioteca.
- Solo extrae texto seleccionable; no incluye OCR para páginas escaneadas.
- La voz depende de las voces instaladas/disponibles en Android. La app prioriza voces españolas que parecen femeninas por su nombre, pero no todos los dispositivos informan el género de la voz.
- La lectura con la pantalla apagada o en segundo plano no está garantizada por el navegador.
- PDF.js se carga desde cdnjs, así que requiere conexión a internet.
- Para repositorios privados o una biblioteca privada se necesita otro diseño de acceso/autenticación; GitHub Pages no convierte los archivos publicados en una biblioteca privada.
