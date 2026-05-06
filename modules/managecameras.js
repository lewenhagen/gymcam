// import { spawn } from 'node:child_process'
// import fs from 'fs'
// import path from 'path'

// const PASS = process.env.PASS
// let cameras = []
// let lastFiles = []

// export function record(config, startTime) {
//   const timestamp = new Date(startTime).toISOString().replace(/[:.]/g, '-')
//   lastFiles = []
//   cameras = []

//   for (const cam of config) {
//     const filename = `video/${timestamp}-${cam.name}.mp4`
//     lastFiles.push({ name: cam.name, file: filename })

//     console.log('Started recording: ' + cam.name)
//     const proc = spawn('ffmpeg', [
//       '-rtsp_transport', 'tcp',
//       '-i', `rtsp://root:${PASS}@${cam.ip}/axis-media/media.amp`,
//       '-vcodec', 'copy',
//       '-acodec', 'copy',
//       '-vsync', 'passthrough',
//       filename,
//       '-loglevel', 'quiet'
//     ])

//     proc.on('close', (code) => {
//       if (code !== 0 && code !== null) {
//         console.error(`ffmpeg for ${cam.name} exited with code ${code}`)
//       }
//     })

//     cameras.push({ proc, name: cam.name, file: filename })
//   }
// }

// export function stopRecord() {
//   for (const cam of cameras) {
//     cam.proc.kill('SIGTERM')
//     console.log('Stopped recording: ' + cam.name)
//   }
//   cameras = []
//   return [...lastFiles]
// }

// export function getFiles() {
//   return [...lastFiles]
// }

// export function clearFiles() {
//   for (const f of lastFiles) {
//     try {
//       if (fs.existsSync(f.file)) fs.unlinkSync(f.file)
//     } catch (e) {
//       console.error('Could not delete file:', f.file)
//     }
//   }
//   lastFiles = []
// }

// export function getDiskSpace() {
//   try {
//     const stat = fs.statfsSync('video')
//     const freeGB = (stat.bfree * stat.bsize) / 1e9
//     const totalGB = (stat.blocks * stat.bsize) / 1e9
//     return { freeGB, totalGB, pct: Math.round((freeGB / totalGB) * 100) }
//   } catch {
//     return null
//   }
// }


// import { spawn } from 'node:child_process'
// import fs from 'fs'
// import path from 'path'

// const PASS = process.env.PASS

// let cameras  = []
// let lastFiles = []

// export function record(config, startTime) {
//   const timestamp = new Date(startTime).toISOString().replace(/[:.]/g, '-')
//   lastFiles = []
//   cameras   = []

//   for (const cam of config) {
//     const filename = `video/${timestamp}-${cam.name}.mp4`
//     lastFiles.push({ name: cam.name, file: filename })

//     console.log('Startar inspelning: ' + cam.name)
//     const proc = spawn('ffmpeg', [
//       '-rtsp_transport', 'tcp',
//       '-i', `rtsp://root:${PASS}@${cam.ip}/axis-media/media.amp`,
//       '-vcodec', 'copy',
//       '-acodec', 'copy',
//       '-vsync', 'passthrough',
//       filename,
//       '-loglevel', 'quiet'
//     ])

//     proc.on('close', (code) => {
//       if (code !== 0 && code !== null) {
//         console.error(`ffmpeg för ${cam.name} avslutades med kod ${code}`)
//       }
//     })

//     cameras.push({ proc, name: cam.name, file: filename })
//   }
// }

// /**
//  * Skickar SIGTERM till alla ffmpeg-processer och returnerar ett Promise
//  * som resolvar med fillistan när ALLA processer faktiskt har stängt.
//  * Detta säkerställer att MP4-filernas moov-atom hunnit skrivas till disk
//  * innan vi försöker spela upp dem.
//  */
// export function stopRecord() {
//   const snapshot = [...cameras]
//   const files    = [...lastFiles]
//   cameras = []

//   if (snapshot.length === 0) return Promise.resolve(files)

//   return new Promise((resolve) => {
//     let remaining = snapshot.length

//     for (const cam of snapshot) {
//       cam.proc.once('close', () => {
//         console.log(`ffmpeg stängd: ${cam.name}`)
//         remaining--
//         if (remaining === 0) resolve(files)
//       })
//       cam.proc.kill('SIGTERM')
//       console.log('Stoppar inspelning: ' + cam.name)
//     }
//   })
// }

// export function getFiles() {
//   return [...lastFiles]
// }

// export function clearFiles() {
//   for (const f of lastFiles) {
//     try {
//       if (fs.existsSync(f.file)) fs.unlinkSync(f.file)
//     } catch (e) {
//       console.error('Kunde inte radera fil:', f.file)
//     }
//   }
//   lastFiles = []
// }

// export function getDiskSpace() {
//   try {
//     const stat = fs.statfsSync('video')
//     const freeGB  = (stat.bfree  * stat.bsize) / 1e9
//     const totalGB = (stat.blocks * stat.bsize) / 1e9
//     return { freeGB, totalGB, pct: Math.round((freeGB / totalGB) * 100) }
//   } catch {
//     return null
//   }
// }

import { spawn } from 'node:child_process'
import fs from 'fs'
import path from 'path'
import { URL } from 'url'

const PASS = process.env.PASS
const __dirname = new URL('.', import.meta.url).pathname
const VIDEO_DIR = path.resolve(__dirname, '../video')

let cameras  = []
let lastFiles = []

export function record(config, startTime) {
  const timestamp = new Date(startTime).toISOString().replace(/[:.]/g, '-')
  lastFiles = []
  cameras   = []

  for (const cam of config) {
    const filename = path.join(VIDEO_DIR, `${timestamp}-${cam.name}.mp4`)
    lastFiles.push({ name: cam.name, file: filename })

    console.log('Startar inspelning: ' + cam.name)
    const proc = spawn('ffmpeg', [
      '-rtsp_transport', 'tcp',
      '-i', `rtsp://root:${PASS}@${cam.ip}/axis-media/media.amp`,
      '-vcodec', 'copy',
      '-acodec', 'copy',
      '-vsync', 'passthrough',
      filename,
      '-loglevel', 'quiet'
    ])

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`ffmpeg för ${cam.name} avslutades med kod ${code}`)
      }
    })

    cameras.push({ proc, name: cam.name, file: filename })
  }
}

export function stopRecord() {
  const snapshot = [...cameras]
  const files    = [...lastFiles]
  cameras = []

  if (snapshot.length === 0) return Promise.resolve(files)

  return new Promise((resolve) => {
    let remaining = snapshot.length

    for (const cam of snapshot) {
      cam.proc.once('close', () => {
        console.log(`ffmpeg stängd: ${cam.name}`)
        remaining--
        if (remaining === 0) resolve(files)
      })
      cam.proc.kill('SIGTERM')
      console.log('Stoppar inspelning: ' + cam.name)
    }
  })
}

export function getFiles() {
  return [...lastFiles]
}

export function clearFiles() {
  for (const f of lastFiles) {
    try {
      if (fs.existsSync(f.file)) fs.unlinkSync(f.file)
    } catch (e) {
      console.error('Kunde inte radera fil:', f.file)
    }
  }
  lastFiles = []
}

export function getDiskSpace() {
  try {
    const stat = fs.statfsSync(VIDEO_DIR)
    const freeGB  = (stat.bfree  * stat.bsize) / 1e9
    const totalGB = (stat.blocks * stat.bsize) / 1e9
    return { freeGB, totalGB, pct: Math.round((freeGB / totalGB) * 100) }
  } catch {
    return null
  }
}