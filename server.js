// import express from 'express'
// import { readFile } from 'fs/promises'
// import fs from 'fs'
// import path from 'path'
// import { execFile } from 'node:child_process'
// import open from 'open'
// import { URL } from 'url'
// import { getDiskSpace } from './modules/managecameras.js'
// import { transition, getState, addSSEClient } from './modules/state.js'

// const config = JSON.parse(await readFile('./config/cameras.json', 'utf-8'))
// const __dirname = new URL('.', import.meta.url).pathname
// const VIDEO_DIR = path.join(__dirname, 'video')

// // Skapa video-mapp om den saknas
// fs.mkdirSync(VIDEO_DIR, { recursive: true })

// const app = express()
// app.use(express.static(__dirname + '/public'))
// app.use(express.json())
// app.set('view engine', 'ejs')
// app.set('views', __dirname + '/views')

// // ── Diskutrymme: intern varning var 30:e sekund ──────────────────────────────
// setInterval(() => {
//   const disk = getDiskSpace()
//   if (disk && disk.pct < 10) {
//     console.warn(`VARNING: Lågt diskutrymme — ${disk.freeGB.toFixed(1)} GB kvar (${disk.pct}%)`)
//   }
// }, 30_000)

// // ── Huvudvy ──────────────────────────────────────────────────────────────────
// app.get('/', (req, res) => {
//   res.render('index', { config })
// })

// // ── Diskutrymme för frontend ─────────────────────────────────────────────────
// app.get('/disk', (req, res) => {
//   const disk = getDiskSpace()
//   if (!disk) return res.status(503).json({ error: 'Inte tillgänglig' })
//   res.json(disk)
// })

// // ── SSE: realtids state-uppdateringar till klienten ──────────────────────────
// app.get('/state-stream', (req, res) => {
//   res.setHeader('Content-Type', 'text/event-stream')
//   res.setHeader('Cache-Control', 'no-cache')
//   res.setHeader('Connection', 'keep-alive')
//   res.flushHeaders()
//   addSSEClient(res)
// })

// // ── Knapptryckningar från klienten ───────────────────────────────────────────
// app.post('/action', (req, res) => {
//   const { action, payload } = req.body
//   transition(action, { ...payload, config })
//   res.json({ ok: true, state: getState() })
// })

// // ── Video-streaming (range requests för uppspelning) ─────────────────────────
// app.get('/video/:filename', (req, res) => {
//   const videoPath = path.resolve(VIDEO_DIR, req.params.filename)
//   if (!videoPath.startsWith(VIDEO_DIR)) {
//     return res.status(403).json({ error: 'Åtkomst nekad' })
//   }
//   if (!fs.existsSync(videoPath)) {
//     return res.status(404).json({ error: 'Filen hittades inte' })
//   }

//   const videoSize = fs.statSync(videoPath).size
//   const range = req.headers.range

//   if (!range) {
//     res.writeHead(200, {
//       'Content-Length': videoSize,
//       'Content-Type': 'video/mp4',
//       'Accept-Ranges': 'bytes',
//     })
//     return fs.createReadStream(videoPath).pipe(res)
//   }

//   const [rawStart, rawEnd] = range.replace('bytes=', '').split('-')
//   const start = parseInt(rawStart, 10)
//   const end   = rawEnd ? parseInt(rawEnd, 10) : Math.min(start + 10 ** 6 - 1, videoSize - 1)

//   if (start >= videoSize || start > end) {
//     res.writeHead(416, { 'Content-Range': `bytes */${videoSize}` })
//     return res.end()
//   }

//   res.writeHead(206, {
//     'Content-Range':  `bytes ${start}-${end}/${videoSize}`,
//     'Accept-Ranges':  'bytes',
//     'Content-Length': end - start + 1,
//     'Content-Type':   'video/mp4',
//   })
//   fs.createReadStream(videoPath, { start, end }).pipe(res)
// })

// // ── Live MJPEG-feed proxy (undviker CORS-problem) ────────────────────────────
// app.get('/livefeed/:camIndex', (req, res) => {
//   const idx = parseInt(req.params.camIndex)
//   if (isNaN(idx) || idx < 0 || idx >= config.length) {
//     return res.status(404).json({ error: 'Ogiltig kameraindex' })
//   }
//   const cam = config[idx]
//   res.json({ url: `http://${cam.ip}/axis-cgi/mjpg/video.cgi?resolution=1280x720&camera=1` })
// })

// // ── USB-export: kopiera valda filer till USB-minne ───────────────────────────
// // Hittar första monterade USB-enhet under /media eller /mnt
// function findUsbMount() {
//   const bases = ['/media', '/mnt']
//   for (const base of bases) {
//     if (!fs.existsSync(base)) continue
//     // /media/<user>/<device> eller /mnt/<device>
//     const entries = fs.readdirSync(base, { withFileTypes: true })
//     for (const e of entries) {
//       if (!e.isDirectory()) continue
//       const sub = path.join(base, e.name)
//       // /media/<user>/<device>
//       try {
//         const subEntries = fs.readdirSync(sub, { withFileTypes: true })
//         for (const se of subEntries) {
//           if (se.isDirectory()) return path.join(sub, se.name)
//         }
//       } catch {}
//       // /mnt/<device> — check if it looks mounted (has files)
//       try {
//         const contents = fs.readdirSync(sub)
//         if (contents.length > 0 || sub !== base) return sub
//       } catch {}
//     }
//   }
//   return null
// }

// app.post('/usb-export', async (req, res) => {
//   const { files } = req.body
//   if (!Array.isArray(files) || files.length === 0) {
//     return res.status(400).json({ error: 'Inga filer angivna' })
//   }

//   const usbPath = findUsbMount()
//   if (!usbPath) {
//     return res.status(503).json({ error: 'Inget USB-minne hittades. Kontrollera att det är anslutet.' })
//   }

//   // Destination: skapa en mapp på USB:n med tidsstämpel
//   const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
//   const destDir = path.join(usbPath, `gymcam-${stamp}`)
//   try { fs.mkdirSync(destDir, { recursive: true }) }
//   catch (e) { return res.status(500).json({ error: 'Kunde inte skapa mapp på USB: ' + e.message }) }

//   let copied = 0
//   const errors = []

//   for (const filePath of files) {
//     // Säkerhetskontroll: filen måste ligga i VIDEO_DIR
//     const src = path.resolve(VIDEO_DIR, path.basename(filePath))
//     if (!src.startsWith(VIDEO_DIR)) { errors.push(filePath + ': nekad'); continue }
//     if (!fs.existsSync(src)) { errors.push(filePath + ': finns ej'); continue }

//     const dest = path.join(destDir, path.basename(src))
//     try {
//       fs.copyFileSync(src, dest)
//       copied++
//     } catch (e) {
//       errors.push(path.basename(src) + ': ' + e.message)
//     }
//   }

//   if (copied === 0) {
//     return res.status(500).json({ error: 'Inga filer kopierades. ' + errors.join(', ') })
//   }

//   // Synka filsystemet så att det är säkert att dra ut USB:n
//   execFile('sync', [], () => {})

//   res.json({
//     ok: true,
//     copied,
//     destination: destDir,
//     errors: errors.length ? errors : undefined,
//   })
// })

// // ── Graceful shutdown ────────────────────────────────────────────────────────
// const shutdown = () => { console.log('Stänger ner…'); process.exit(0) }
// process.on('SIGTERM', shutdown)
// process.on('SIGINT',  shutdown)

// // ── Starta servern ───────────────────────────────────────────────────────────
// app.listen(3000, () => console.log('Gymcam körs på http://localhost:3000'))

// if (process.env.OPEN_BROWSER !== 'false') {
//   await open('http://localhost:3000')
// }
import express from 'express'
import { readFile } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { execFile, execSync } from 'node:child_process'
import open from 'open'
import { URL } from 'url'
import { getDiskSpace } from './modules/managecameras.js'
import { transition, getState, addSSEClient } from './modules/state.js'

const config = JSON.parse(await readFile('./config/cameras.json', 'utf-8'))
const __dirname = new URL('.', import.meta.url).pathname
const VIDEO_DIR = path.join(__dirname, 'video')

// Skapa video-mapp om den saknas
fs.mkdirSync(VIDEO_DIR, { recursive: true })

const app = express()
app.use(express.static(__dirname + '/public'))
app.use(express.json())
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

// ── Diskutrymme: intern varning var 30:e sekund ──────────────────────────────
setInterval(() => {
  const disk = getDiskSpace()
  if (disk && disk.pct < 10) {
    console.warn(`VARNING: Lågt diskutrymme — ${disk.freeGB.toFixed(1)} GB kvar (${disk.pct}%)`)
  }
}, 30_000)

// ── Huvudvy ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('index', { config })
})

// ── Diskutrymme för frontend ─────────────────────────────────────────────────
app.get('/disk', (req, res) => {
  const disk = getDiskSpace()
  if (!disk) return res.status(503).json({ error: 'Inte tillgänglig' })
  res.json(disk)
})

// ── SSE: realtids state-uppdateringar till klienten ──────────────────────────
app.get('/state-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  addSSEClient(res)
})

// ── Knapptryckningar från klienten ───────────────────────────────────────────
app.post('/action', (req, res) => {
  const { action, payload } = req.body
  transition(action, { ...payload, config })
  res.json({ ok: true, state: getState() })
})

// ── Video-streaming (range requests för uppspelning) ─────────────────────────
app.get('/video/:filename', (req, res) => {
  const videoPath = path.resolve(VIDEO_DIR, req.params.filename)
  if (!videoPath.startsWith(VIDEO_DIR)) {
    return res.status(403).json({ error: 'Åtkomst nekad' })
  }
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Filen hittades inte' })
  }

  const videoSize = fs.statSync(videoPath).size
  const range = req.headers.range

  if (!range) {
    res.writeHead(200, {
      'Content-Length': videoSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    })
    return fs.createReadStream(videoPath).pipe(res)
  }

  const [rawStart, rawEnd] = range.replace('bytes=', '').split('-')
  const start = parseInt(rawStart, 10)
  const end   = rawEnd ? parseInt(rawEnd, 10) : Math.min(start + 10 ** 6 - 1, videoSize - 1)

  if (start >= videoSize || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${videoSize}` })
    return res.end()
  }

  res.writeHead(206, {
    'Content-Range':  `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges':  'bytes',
    'Content-Length': end - start + 1,
    'Content-Type':   'video/mp4',
  })
  fs.createReadStream(videoPath, { start, end }).pipe(res)
})

// ── Live MJPEG-feed proxy (undviker CORS-problem) ────────────────────────────
app.get('/livefeed/:camIndex', (req, res) => {
  const idx = parseInt(req.params.camIndex)
  if (isNaN(idx) || idx < 0 || idx >= config.length) {
    return res.status(404).json({ error: 'Ogiltig kameraindex' })
  }
  const cam = config[idx]
  res.json({ url: `http://${cam.ip}/axis-cgi/mjpg/video.cgi?resolution=1280x720&camera=1` })
})

// ── USB-export: kopiera valda filer till USB-minne ───────────────────────────

function looksLikeUsb(dirPath) {
  const name = path.basename(dirPath)
  // Hoppa över WSL Windows-drives: /mnt/c, /mnt/d ...
  if (/^[a-z]$/i.test(name)) return false
  // Hoppa över dolda/systemkataloger
  if (name.startsWith('.') || name.startsWith('$')) return false
  // Kontrollera skrivbarhet
  try { fs.accessSync(dirPath, fs.constants.W_OK); return true } catch { return false }
}

// function findUsbMount() {
//   // Sätt USB_MOUNT-miljövariabeln för fast monteringspunkt (rekommenderat på Debian)
//   if (process.env.USB_MOUNT && fs.existsSync(process.env.USB_MOUNT)) {
//     if (looksLikeUsb(process.env.USB_MOUNT)) return process.env.USB_MOUNT
//   }

//   // /media/<user>/<enhet> — standard för udisks2 på Debian/Ubuntu
//   const media = '/media'
//   if (fs.existsSync(media)) {
//     for (const user of fs.readdirSync(media, { withFileTypes: true })) {
//       if (!user.isDirectory()) continue
//       try {
//         for (const dev of fs.readdirSync(path.join(media, user.name), { withFileTypes: true })) {
//           if (!dev.isDirectory()) continue
//           const p = path.join(media, user.name, dev.name)
//           if (looksLikeUsb(p)) return p
//         }
//       } catch {}
//     }
//   }

//   // /mnt/<enhet> — manuell montering, hoppa över WSL Windows-drives
//   const mnt = '/mnt'
//   if (fs.existsSync(mnt)) {
//     for (const e of fs.readdirSync(mnt, { withFileTypes: true })) {
//       if (!e.isDirectory()) continue
//       const p = path.join(mnt, e.name)
//       if (looksLikeUsb(p)) return p
//     }
//   }

//   return null
// }
// function findUsbMount() {
//   try {
//     const output = execSync('lsblk -J -o NAME,MOUNTPOINT,LABEL', { encoding: 'utf8' })
//     const data = JSON.parse(output)

//     function find(devices) {
//       for (const d of devices) {
//         if (d.label === 'GYMCAM' && d.mountpoint) return d.mountpoint
//         if (d.children) {
//           const res = find(d.children)
//           if (res) return res
//         }
//       }
//       return null
//     }

//     return find(data.blockdevices)
//   } catch {
//     return null
//   }
// }
function findUsbMount() {
  if (process.env.USB_MOUNT && fs.existsSync(process.env.USB_MOUNT)) {
    return process.env.USB_MOUNT
  }
  try {
    const output = execSync('lsblk -J -o NAME,MOUNTPOINT,LABEL,RM', { encoding: 'utf8' })
    const data = JSON.parse(output)

    function find(devices) {
      for (const d of devices) {
        // DEBUG (remove later)
        console.log('CHECK:', d.name, d.label, d.mountpoint, d.rm)

        // 1. Prefer label match (case-insensitive + trimmed)
        if (
          d.label &&
          d.mountpoint &&
          d.label.trim().toLowerCase() === 'gymcam'
        ) {
          return d.mountpoint
        }

        // 2. Fallback: any removable mounted device
        if (d.rm && d.mountpoint) {
          return d.mountpoint
        }

        // 3. Recurse into children
        if (d.children) {
          const res = find(d.children)
          if (res) return res
        }
      }
      return null
    }

    return find(data.blockdevices)
  } catch (e) {
    console.error('USB detect error:', e)
    return null
  }
}

app.post('/usb-export', async (req, res) => {
  const { files } = req.body
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Inga filer angivna' })
  }

  const usbPath = findUsbMount()
  if (!usbPath) {
    return res.status(503).json({ error: 'Inget USB-minne hittades. Kontrollera att det är anslutet.' })
  }

  // Destination: skapa en mapp på USB:n med tidsstämpel
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destDir = path.join(usbPath, `gymcam-${stamp}`)
  try { fs.mkdirSync(destDir, { recursive: true }) }
  catch (e) { return res.status(500).json({ error: 'Kunde inte skapa mapp på USB: ' + e.message }) }

  let copied = 0
  const errors = []

  // for (const filePath of files) {
  //   // Säkerhetskontroll: filen måste ligga i VIDEO_DIR
  //   const src = path.resolve(VIDEO_DIR, path.basename(filePath))
  //   if (!src.startsWith(VIDEO_DIR)) { errors.push(filePath + ': nekad'); continue }
  //   if (!fs.existsSync(src)) { errors.push(filePath + ': finns ej'); continue }

  //   const dest = path.join(destDir, path.basename(src))
  //   try {
  //     fs.copyFileSync(src, dest)
  //     copied++
  //   } catch (e) {
  //     errors.push(path.basename(src) + ': ' + e.message)
  //   }
  // }
  for (const filePath of files) {
    const cleanName = path.basename(filePath)   // ALWAYS normalize

    const src = path.join(VIDEO_DIR, cleanName)

    console.log('COPYING:', src)

    if (!fs.existsSync(src)) {
      errors.push(cleanName + ': finns ej')
      continue
    }

    const dest = path.join(destDir, cleanName)

    try {
      fs.copyFileSync(src, dest)
      copied++
    } catch (e) {
      errors.push(cleanName + ': ' + e.message)
    }
  }

  if (copied === 0) {
    return res.status(500).json({ error: 'Inga filer kopierades. ' + errors.join(', ') })
  }

  // Synka filsystemet så att det är säkert att dra ut USB:n
  execFile('sync', [], () => {})

  res.json({
    ok: true,
    copied,
    destination: destDir,
    errors: errors.length ? errors : undefined,
  })
})

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = () => { console.log('Stänger ner…'); process.exit(0) }
process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)

// ── Starta servern ───────────────────────────────────────────────────────────
app.listen(3000, () => console.log('Gymcam körs på http://localhost:3000'))

if (process.env.OPEN_BROWSER !== 'false') {
  await open('http://localhost:3000')
}