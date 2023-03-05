import chokidar from 'chokidar'
import {
  addPlaylist,
  addSound,
  addSoundboard,
  addTrack,
  KenkuRemoteConfig,
  removePlaylist,
  removeSound,
  removeSoundboard,
  removeTrack,
} from './kenku'

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

/**
 * Usage:
 *
 * ts-node src/index.ts --rootDir [path to root directory]
 *
 * Options:
 *      --backfill: will re-send all playlists/soundboards at start-up.
 *      --host [host]: the host for Kenku remote. Defaults to 127.0.0.1.
 *      --port [port]: the port for Kenku remote. Defaults to 3333.
 *      --playlistsDir [dir]: the directory (under the root directory) containing playlists. Defaults to "Playlists".
 *      --soundboardsDir [dir]: the directory (under the root directory) containing soundboards. Defaults to "Soundboards".
 */

interface DirectoriesConfig {
  root: string
  playlists?: string
  soundboards?: string
}

const DEFAULT_PLAYLIST_DIR = `Playlists`
const DEFAULT_SOUNDBOARDS_DIR = `Soundboards`
const DEFAULT_KENKU_CONFIG: KenkuRemoteConfig = {
  host: '127.0.0.1',
  port: '3333',
}

const folderRegex = '[a-zA-Z0-9 -]+'
const fileRegex = '[a-zA-Z0-9 -\\.]+'

let ACTIVATED = false
const JOB_FREQUENCY = 250

const validateDirectory = (directories: DirectoriesConfig, path: string) => {
  const match = path.match(
    `^${directories.root}/(${directories.playlists || DEFAULT_PLAYLIST_DIR}|${
      directories.soundboards || DEFAULT_SOUNDBOARDS_DIR
    })/(${folderRegex})$`
  )
  return match ? match[2] : undefined
}

const validateFile = (directories: DirectoriesConfig, path: string) => {
  const match = path.match(
    `^${directories.root}/(${directories.playlists || DEFAULT_PLAYLIST_DIR}|${
      directories.soundboards || DEFAULT_SOUNDBOARDS_DIR
    })/${folderRegex}/(${fileRegex})$`
  )
  return match ? match[2] : undefined
}

const removeFileType = (fileName: string) => {
  return fileName.slice(0, fileName.indexOf('.'))
}

const prepareFilePath = (path: string) => `file://${encodeURI(path)}`

const cleanUrl = (path: string) => {
  return path.charAt(path.length - 1) !== '/' ? path : path.slice(0, path.length - 1)
}

const queue: Array<{ action: 'add' | 'addDir' | 'unlink' | 'unlinkDir'; path: string }> = []

const handleQueue = (directories: DirectoriesConfig, kenkuConfig: KenkuRemoteConfig) => {
  if (queue.length) {
    const event = queue.shift()!
    const path = event.path
    switch (event.action) {
      case 'add':
        const fileToAdd = validateFile(directories, path)
        if (ACTIVATED && fileToAdd) {
          if (path.includes(directories.playlists || DEFAULT_PLAYLIST_DIR)) {
            console.log(`Adding track: ${path} (${removeFileType(fileToAdd)})`)
            addTrack(kenkuConfig, {
              title: removeFileType(fileToAdd),
              url: cleanUrl(prepareFilePath(path)),
              playlistUrl: cleanUrl(path.replace(fileToAdd, '')),
            }).catch(console.log)
          } else {
            console.log(`Adding sound: ${path} (${removeFileType(fileToAdd)})`)
            addSound(kenkuConfig, {
              title: removeFileType(fileToAdd),
              url: cleanUrl(prepareFilePath(path)),
              soundboardUrl: cleanUrl(path.replace(fileToAdd, '')),
              fadeIn: 500,
              fadeOut: 500,
              loop: true,
              volume: 100,
            }).catch(console.log)
          }
        }
        return
      case 'addDir':
        const dirToAdd = validateDirectory(directories, path)
        if (ACTIVATED && dirToAdd) {
          if (path.includes(directories.playlists || DEFAULT_PLAYLIST_DIR)) {
            console.log(`Adding playlist: ${path} (${dirToAdd})`)
            addPlaylist(kenkuConfig, {
              title: dirToAdd,
              url: cleanUrl(path),
            }).catch(console.log)
          } else {
            console.log(`Adding soundboard: ${path} (${dirToAdd})`)
            addSoundboard(kenkuConfig, {
              title: dirToAdd,
              url: cleanUrl(path),
            }).catch(console.log)
          }
        }
        return
      case 'unlink':
        const file = validateFile(directories, path)
        if (ACTIVATED && file) {
          if (path.includes(directories.playlists || DEFAULT_PLAYLIST_DIR)) {
            console.log(`Removing track: ${path} (${file})`)
            removeTrack(kenkuConfig, {
              trackUrl: cleanUrl(prepareFilePath(path)),
              playlistUrl: cleanUrl(path.replace(file, '')),
            }).catch(console.log)
          } else {
            console.log(`Removing sound: ${path} (${file})`)
            removeSound(kenkuConfig, {
              soundUrl: cleanUrl(prepareFilePath(path)),
              soundboardUrl: cleanUrl(path.replace(file, '')),
            }).catch(console.log)
          }
        }
        return
      case 'unlinkDir':
        const dir = validateDirectory(directories, path)
        if (ACTIVATED && dir) {
          if (path.includes(directories.playlists || DEFAULT_PLAYLIST_DIR)) {
            console.log(`Removing playlist: ${path} (${dir})`)
            removePlaylist(kenkuConfig, {
              url: cleanUrl(path),
            }).catch(console.log)
          } else {
            console.log(`Removing soundboard: ${path} (${dir})`)
            removeSoundboard(kenkuConfig, {
              url: cleanUrl(path),
            }).catch(console.log)
          }
        }
        return
    }
  }
}

const watch = (
  backfill: boolean,
  directories: DirectoriesConfig,
  kenkuConfig: KenkuRemoteConfig
) => {
  console.log(`Starting file watcher on ${directories.root}`)
  ACTIVATED = backfill

  setInterval(function () {
    handleQueue(directories, kenkuConfig)
  }, JOB_FREQUENCY)

  chokidar
    .watch(directories.root)
    .on('ready', () => {
      ACTIVATED = true
      console.log('Ready')
    })
    .on('add', (path) => {
      queue.push({ action: 'add', path })
    })
    .on('addDir', (path) => {
      queue.push({ action: 'addDir', path })
    })
    .on('unlink', (path) => {
      queue.push({ action: 'unlink', path })
    })
    .on('unlinkDir', (path) => {
      queue.push({ action: 'unlinkDir', path })
    })
}

watch(
  argv.backfill,
  {
    root: argv.rootDir,
    playlists: argv.playlistsDir,
    soundboards: argv.soundboardsDir,
  },
  {
    host: argv.host || DEFAULT_KENKU_CONFIG.host,
    port: argv.port || DEFAULT_KENKU_CONFIG.port,
  }
)
