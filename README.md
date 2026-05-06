# 🎵 Musik

Écoute synchronisée de YouTube : tu colles un lien, tout le monde sur la page écoute la même chose, en même temps.

## Lancer en local

```bash
npm install
npm start
```

Puis ouvre `http://localhost:3000` dans plusieurs onglets/navigateurs pour tester.

## Comment ça marche

- Backend Node.js + Socket.IO (état global en mémoire)
- Frontend vanilla JS + YouTube IFrame API
- Une seule "room" : tous les visiteurs sont synchronisés
- Tout le monde peut charger une vidéo, play/pause, seek

## Déployer pour partager avec tes amis

### Option 1 — Render (gratuit, recommandé)

1. Push le repo sur GitHub
2. Va sur [render.com](https://render.com) → "New Web Service"
3. Connecte ton repo
4. Build command : `npm install`
5. Start command : `npm start`
6. Tu obtiens une URL `https://ton-app.onrender.com`

### Option 2 — Railway

1. [railway.app](https://railway.app) → "Deploy from GitHub"
2. Auto-détecte Node, ça démarre tout seul

### Option 3 — Fly.io / VPS

`PORT` est lu depuis l'env. N'importe quel host Node qui supporte WebSocket marche.

## Limitations

- **Vidéos restreintes** : certaines vidéos YouTube interdisent l'embed (clips musicaux protégés). Pas de solution côté code, c'est YouTube qui décide.
- **État en RAM** : si le serveur redémarre, l'état (vidéo en cours, position) est perdu. Pour un usage perso c'est OK.
- **Latence** : la sync est à ~500ms près. Pas un problème pour de la musique.
