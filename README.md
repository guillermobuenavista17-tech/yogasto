# YoGasto

PWA de registro de pequeños gastos en español. Incluye presupuesto mensual, cuatro gastos habituales editables, teclado propio, historial, CSV y copias JSON. Los datos se guardan en el navegador. Después de la primera carga, se puede abrir sin conexión. Al cambiar la moneda, cambia el símbolo o código mostrado para todos los importes.

## Probar en Fedora

Desde la carpeta YoGasto:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre [YoGasto en el navegador](http://127.0.0.1:8000/).

## Publicar en GitHub Pages desde Fedora

1. Instala Git y la CLI de GitHub. Inicia sesión con tu cuenta de GitHub y elige HTTPS si te pregunta.

   ```bash
   sudo dnf install git gh
   gh auth login
   gh auth setup-git
   ```

   [Paquete oficial de Fedora](https://packages.fedoraproject.org/pkgs/gh/gh/)

2. Crea una carpeta independiente, copia allí la aplicación e inicializa Git. Si Git te pide nombre y correo, configura tu identidad y vuelve a ejecutar el commit.

   ```bash
   mkdir -p "$HOME/yogasto"
   cp -a "$HOME/Documentos/ChatGPT/CHATGPT APPSWEB/YoGasto/." "$HOME/yogasto/"
   cd "$HOME/yogasto"
   git init -b main
   git add .nojekyll README.md INSTALACION-MOVIL.md index.html style.css app.js manifest.json sw.js icon.svg apple-touch-icon.png icon-192.png icon-512.png
   git commit -m "Publicar YoGasto"
   gh repo create yogasto --public --source=. --remote=origin --push
   ```

   Con GitHub Free, este paso crea un repositorio público. Conserva las copias JSON y los CSV de tus gastos fuera del repositorio. [Documentación de GitHub CLI](https://cli.github.com/manual/gh_repo_create)

3. Activa GitHub Pages en la rama `main` y comprueba el enlace.

   ```bash
   yogasto_repo=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
   gh api --method POST "repos/$yogasto_repo/pages" -f 'source[branch]=main' -f 'source[path]=/' --jq '.html_url'
   gh api "repos/$yogasto_repo/pages" --jq '{estado: .status, enlace: .html_url}'
   ```

   Cuando el estado sea `built`, abre el enlace HTTPS. También puedes activar Pages desde **Settings → Pages → Deploy from a branch → main → /(root) → Save**. [Configuración de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Instalar en iPhone

Sigue la [guía de instalación para iPhone y Android](INSTALACION-MOVIL.md).

Para publicar cambios, incrementa la versión de caché de `sw.js` y sube los archivos modificados a `main`. La versión nueva se activa al cerrar las pestañas o ventanas anteriores de YoGasto.
