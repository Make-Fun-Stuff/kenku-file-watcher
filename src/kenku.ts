import fetch from 'node-fetch'

const url = (host: string, port: string) => `http://${host}:${port}/v1`

type Method = 'get' | 'put' | 'post'

export interface KenkuRemoteConfig {
  host: string
  port: string
}

export const callKenku = async (
  config: KenkuRemoteConfig,
  req: {
    path: string
    method: Method
    body?: any
  },
  verbose?: boolean
) => {
  console.log(JSON.stringify(req.body, null, 2))
  const response = await fetch(`${url(config.host, config.port)}/${req.path}`, {
    method: req.method,
    headers: {
      'Access-Control-Allow-Origin': '*',
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
    body: req.body && JSON.stringify(req.body),
  })
  const data = await response.json()
  if (response.status >= 400) {
    throw Error(JSON.stringify(data))
  }
  if (verbose) {
    console.log(JSON.stringify(data, null, 2))
  }
  return data
}

export const addPlaylist = async (
  config: KenkuRemoteConfig,
  body: {
    title: string
    url: string
  }
) => {
  return callKenku(config, {
    path: 'playlist/add',
    method: 'put',
    body,
  })
}

export const addTrack = async (
  config: KenkuRemoteConfig,
  body: {
    title: string
    url: string
    playlistUrl: string
  }
) => {
  return callKenku(config, {
    path: 'playlist/addTrack',
    method: 'put',
    body,
  })
}

export const removeTrack = async (
  config: KenkuRemoteConfig,
  body: {
    trackUrl: string
    playlistUrl: string
  }
) => {
  return callKenku(config, {
    path: 'playlist/removeTrack',
    method: 'put',
    body,
  })
}

export const removePlaylist = async (
  config: KenkuRemoteConfig,
  body: {
    url: string
  }
) => {
  return callKenku(config, {
    path: 'playlist/remove',
    method: 'put',
    body,
  })
}

export const addSoundboard = async (
  config: KenkuRemoteConfig,
  body: {
    title: string
    url: string
  }
) => {
  return callKenku(config, {
    path: 'soundboard/add',
    method: 'put',
    body,
  })
}

export const addSound = async (
  config: KenkuRemoteConfig,
  body: {
    soundboardUrl: string
    title: string
    url: string
    loop: boolean
    volume: number
    fadeIn: number
    fadeOut: number
  }
) => {
  return callKenku(config, {
    path: 'soundboard/addSound',
    method: 'put',
    body,
  })
}

export const removeSound = async (
  config: KenkuRemoteConfig,
  body: {
    soundUrl: string
    soundboardUrl: string
  }
) => {
  return callKenku(config, {
    path: 'soundboard/removeSound',
    method: 'put',
    body,
  })
}

export const removeSoundboard = async (
  config: KenkuRemoteConfig,
  body: {
    url: string
  }
) => {
  return callKenku(config, {
    path: 'soundboard/remove',
    method: 'put',
    body,
  })
}
