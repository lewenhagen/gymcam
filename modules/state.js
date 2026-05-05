import { record, stopRecord, getFiles, clearFiles } from './managecameras.js'

let state = {
  mode: 'LIVE',       // LIVE | RECORDING | STOPPING | PLAYBACK | PAUSED
  activeCam: 0,
  files: [],
  recordingStart: null,
  error: null
}

const clients = new Set()

export function getState() {
  return { ...state }
}

export function addSSEClient(res) {
  clients.add(res)
  res.on('close', () => clients.delete(res))
  broadcast(state)
}

function broadcast(s) {
  const data = `data: ${JSON.stringify(s)}\n\n`
  for (const client of clients) {
    client.write(data)
  }
}

export async function transition(action, payload = {}) {
  const { mode } = state

  if (action === 'SET_CAM') {
    if (payload.cam < payload.total) {
      state = { ...state, activeCam: payload.cam }
      broadcast(state)
    }
    return
  }

  if (mode === 'LIVE' && action === 'START_REC') {
    const recordingStart = Date.now()
    record(payload.config, recordingStart)
    state = { ...state, mode: 'RECORDING', recordingStart, error: null }

  } else if (mode === 'RECORDING' && action === 'STOP_DISCARD') {
    // Await close so files are fully written before we delete them
    state = { ...state, mode: 'STOPPING', error: null }
    broadcast(state)
    await stopRecord()
    clearFiles()
    state = { ...state, mode: 'LIVE', files: [], recordingStart: null, error: null }

  } else if (mode === 'RECORDING' && action === 'STOP_PLAY') {
    // Broadcast STOPPING so the UI can show "Avslutar inspelning…"
    // while we wait for ffmpeg to flush and close the MP4 files.
    state = { ...state, mode: 'STOPPING', error: null }
    broadcast(state)

    try {
      const files = await stopRecord()
      state = { ...state, mode: 'PLAYBACK', files, recordingStart: null, error: null }
    } catch (err) {
      console.error('Fel vid stopRecord:', err)
      state = { ...state, mode: 'LIVE', files: [], recordingStart: null, error: 'Kunde inte avsluta inspelning: ' + err.message }
    }

  } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'PAUSE') {
    state = { ...state, mode: 'PAUSED' }

  } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'PLAY') {
    state = { ...state, mode: 'PLAYBACK' }

  } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'GO_LIVE') {
    state = { ...state, mode: 'LIVE', files: [], activeCam: 0 }

  } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'GO_LIVE_DISCARD') {
    clearFiles()
    state = { ...state, mode: 'LIVE', files: [], activeCam: 0 }

  } else {
    console.warn(`Ogiltig transition: action=${action} i mode=${mode}`)
    return
  }

  broadcast(state)
}

export function setError(msg) {
  state = { ...state, error: msg }
  broadcast(state)
}

// import { record, stopRecord, getFiles, clearFiles } from './managecameras.js'

// let state = {
//   mode: 'LIVE',       // LIVE | RECORDING | STOPPING | PLAYBACK | PAUSED
//   activeCam: 0,
//   files: [],
//   recordingStart: null,
//   error: null
// }

// const clients = new Set()

// export function getState() {
//   return { ...state }
// }

// export function addSSEClient(res) {
//   clients.add(res)
//   res.on('close', () => clients.delete(res))
//   broadcast(state)
// }

// function broadcast(s) {
//   const data = `data: ${JSON.stringify(s)}\n\n`
//   for (const client of clients) {
//     client.write(data)
//   }
// }

// export async function transition(action, payload = {}) {
//   const { mode } = state

//   if (action === 'SET_CAM') {
//     if (payload.cam < payload.total) {
//       state = { ...state, activeCam: payload.cam }
//       broadcast(state)
//     }
//     return
//   }

//   if (mode === 'LIVE' && action === 'START_REC') {
//     const recordingStart = Date.now()
//     record(payload.config, recordingStart)
//     state = { ...state, mode: 'RECORDING', recordingStart, error: null }

//   } else if (mode === 'RECORDING' && action === 'STOP_DISCARD') {
//     // Await close so files are fully written before we delete them
//     state = { ...state, mode: 'STOPPING', error: null }
//     broadcast(state)
//     await stopRecord()
//     clearFiles()
//     state = { ...state, mode: 'LIVE', files: [], recordingStart: null, error: null }

//   } else if (mode === 'RECORDING' && action === 'STOP_PLAY') {
//     // Broadcast STOPPING so the UI can show "Avslutar inspelning…"
//     // while we wait for ffmpeg to flush and close the MP4 files.
//     state = { ...state, mode: 'STOPPING', error: null }
//     broadcast(state)

//     try {
//       const files = await stopRecord()
//       state = { ...state, mode: 'PLAYBACK', files, recordingStart: null, error: null }
//     } catch (err) {
//       console.error('Fel vid stopRecord:', err)
//       state = { ...state, mode: 'LIVE', files: [], recordingStart: null, error: 'Kunde inte avsluta inspelning: ' + err.message }
//     }

//   } else if (mode === 'PLAYBACK' && action === 'PAUSE') {
//     state = { ...state, mode: 'PAUSED' }

//   } else if (mode === 'PAUSED' && action === 'PLAY') {
//     state = { ...state, mode: 'PLAYBACK' }

//   } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'GO_LIVE') {
//     state = { ...state, mode: 'LIVE', files: [], activeCam: 0 }

//   } else if ((mode === 'PLAYBACK' || mode === 'PAUSED') && action === 'GO_LIVE_DISCARD') {
//     clearFiles()
//     state = { ...state, mode: 'LIVE', files: [], activeCam: 0 }

//   } else {
//     console.warn(`Ogiltig transition: action=${action} i mode=${mode}`)
//     return
//   }

//   broadcast(state)
// }

// export function setError(msg) {
//   state = { ...state, error: msg }
//   broadcast(state)
// }