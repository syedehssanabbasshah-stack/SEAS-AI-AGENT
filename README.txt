SEAS-AI-AGENT - WINDOWS INSTALLER (like Claude/ChatGPT desktop apps)
==============================================================
What it is: a real installable app (Electron). It opens YOUR SEAS website (Cloudflare) in its own window, so the brain, search, voice and
tools run on the server and every update appears instantly, and it adds what a browser cannot do: PC control, a direct YouTube window,
microphone with cloud speech recognition (proper Urdu), calls/WhatsApp through your PC's apps. No bridge, no token, nothing to pair.

BUILD THE INSTALLER WITHOUT INSTALLING ANYTHING (GitHub builds it for you, free)
 1. Create a new GitHub repository and upload everything inside this folder (including the hidden .github folder).
 2. Repository > Actions > "Build Windows installer" > Run workflow > type your website address (https://....pages.dev) > Run.
 3. After about 5 minutes open the finished run and download the artifact "SEAS-AI-AGENT-Setup": it contains SEAS-AI-AGENT Setup.exe.
 4. Put that .exe where people can download it (a GitHub Release, or your own site) and copy its direct link.
 5. Cloudflare Pages > Settings > Variables > APP_DOWNLOAD_URL = that link > redeploy. The "PC App" button on your site now downloads the installer.
 Or build on your own PC:  npm install  then  npm run dist   (installer appears in the dist folder).
FIRST RUN: the app opens your website. If no address was baked in, it asks for it once.
IF THE WINDOW GOES BLANK: run "npm run safe" (or start the app with --safe). It also switches to safe mode by itself after a crash.
WINDOWS WARNING: the installer is not code-signed, so SmartScreen may say "unknown publisher": More info > Run anyway.
SECURITY: only your own website can use the PC-control functions (checked inside the app); other sites are refused; the microphone is only
allowed for your website; dangerous links (file:, javascript:) are refused; shutdown needs your explicit confirmation in the chat first.
