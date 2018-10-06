const timestamp = '__timestamp__'
const ASSETS = `assets_${timestamp}`
const WEBPACK_ASSETS = `webpack_assets_${timestamp}`

// `assets` is an array of everything in the `assets` directory
const assets = __assets__
  .map(file => file.startsWith('/') ? file : `/${file}`)
  .filter(filename => !filename.startsWith('/apple-icon'))
  .concat(['/index.html'])

// `shell` is an array of all the files generated by webpack
// also contains '/index.html' for some reason
const webpackAssets = __shell__
  .filter(filename => !filename.endsWith('.map'))
  .filter(filename => filename !== '/index.html')

// `routes` is an array of `{ pattern: RegExp }` objects that
// match the pages in your app
const routes = __routes__

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await Promise.all([
      caches.open(WEBPACK_ASSETS).then(cache => cache.addAll(webpackAssets)),
      caches.open(ASSETS).then(cache => cache.addAll(assets))
    ])
    self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    let keys = await caches.keys()

    // delete old asset/ondemand caches
    for (let key of keys) {
      if (key !== ASSETS &&
          !key.startsWith('webpack_assets_')) {
        await caches.delete(key)
      }
    }

    // for webpack assets, keep the two latest builds because we may need
    // them when the service worker has installed but the page has not
    // yet reloaded (e.g. when it gives the toast saying "please reload"
    // but then you don't refresh and instead load an async chunk)
    let webpackKeysToDelete = keys
      .filter(key => key.startsWith('webpack_assets_'))
      .sort((a, b) => {
        let aTimestamp = parseInt(a.substring(15), 10)
        let bTimestamp = parseInt(b.substring(15), 10)
        return bTimestamp < aTimestamp ? -1 : 1
      })
      .slice(2)

    for (let key of webpackKeysToDelete) {
      await caches.delete(key)
    }

    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)

  // don't try to handle e.g. data: URIs
  if (!url.protocol.startsWith('http')) {
    return
  }

  event.respondWith((async () => {
    let sameOrigin = url.origin === self.origin

    if (sameOrigin) {
      // always serve webpack-generated resources and
      // assets from the cache if possible
      let response = await caches.match(req)
      if (response) {
        return response
      }
      // for routes, serve the /index.html file from the most recent
      // assets cache
      if (routes.find(route => route.pattern.test(url.pathname))) {
        let response = await caches.match('/index.html')
        if (response) {
          return response
        }
      }
    }

    // for everything else, go network-only
    return fetch(req)
  })())
})

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    const data = event.data.json()
    const { origin } = new URL(data.icon)

    try {
      const notification = await get(`${origin}/api/v1/notifications/${data.notification_id}`, {
        'Authorization': `Bearer ${data.access_token}`
      }, { timeout: 2000 })

      await showRichNotification(data, notification)
    } catch (e) {
      await showSimpleNotification(data)
    }
  })())
})

async function showSimpleNotification (data) {
  await self.registration.showNotification(data.title, {
    icon: data.icon,
    body: data.body
  })
}

async function showRichNotification (data, notification) {
  const { origin } = new URL(data.icon)

  switch (notification.type) {
    case 'follow': {
      await self.registration.showNotification(data.title, {
        icon: data.icon,
        body: data.body,
        tag: notification.id,
        data: {
          url: `${self.location.origin}/accounts/${notification.account.id}`
        }
      })
      break
    }
    case 'mention': {
      const actions = [{
        action: 'favourite',
        title: 'Favourite'
      }, {
        action: 'reblog',
        title: 'Boost'
      }]

      if ('reply' in NotificationEvent.prototype) {
        actions.splice(0, 0, {
          action: 'reply',
          type: 'text',
          title: 'Reply'
        })
      }

      await self.registration.showNotification(data.title, {
        icon: data.icon,
        body: data.body,
        tag: notification.id,
        data: {
          instance: origin,
          status_id: notification.status.id,
          access_token: data.access_token,
          url: `${self.location.origin}/statuses/${notification.status.id}`
        },
        actions
      })
      break
    }
    case 'reblog': {
      await self.registration.showNotification(data.title, {
        icon: data.icon,
        body: data.body,
        tag: notification.id,
        data: {
          url: `${self.location.origin}/statuses/${notification.status.id}`
        }
      })
      break
    }
    case 'favourite': {
      await self.registration.showNotification(data.title, {
        icon: data.icon,
        body: data.body,
        tag: notification.id,
        data: {
          url: `${self.location.origin}/statuses/${notification.status.id}`
        }
      })
      break
    }
  }
}

const cloneNotification = notification => {
  const clone = { }

  // Object.assign() does not work with notifications
  for (let k in notification) {
    clone[k] = notification[k]
  }

  return clone
}

const updateNotificationWithoutAction = (notification, action) => {
  const newNotification = cloneNotification(notification)

  newNotification.actions = newNotification.actions.filter(item => item.action !== action)

  return self.registration.showNotification(newNotification.title, newNotification)
}

self.addEventListener('notificationclick', event => {
  event.waitUntil((async () => {
    switch (event.action) {
      case 'reply': {
        await post(`${event.notification.data.instance}/api/v1/statuses/`, {
          status: event.reply,
          in_reply_to_id: event.notification.data.status_id
        }, { 'Authorization': `Bearer ${event.notification.data.access_token}` })
        await updateNotificationWithoutAction(event.notification, 'reply')
        break
      }
      case 'reblog': {
        await post(`${event.notification.data.instance}/api/v1/statuses/${event.notification.data.status_id}/reblog`, null, { 'Authorization': `Bearer ${event.notification.data.access_token}` })
        await updateNotificationWithoutAction(event.notification, 'reblog')
        break
      }
      case 'favourite': {
        await post(`${event.notification.data.instance}/api/v1/statuses/${event.notification.data.status_id}/favourite`, null, { 'Authorization': `Bearer ${event.notification.data.access_token}` })
        await updateNotificationWithoutAction(event.notification, 'favourite')
        break
      }
      default: {
        await self.clients.openWindow(event.notification.data.url)
        await event.notification.close()
        break
      }
    }
  })())
})

// Copy-paste from ajax.js
async function get (url, headers, options) {
  return _fetch(url, makeFetchOptions('GET', headers), options)
}

async function post (url, body, headers, options) {
  return _putOrPostOrPatch('POST', url, body, headers, options)
}

async function _putOrPostOrPatch (method, url, body, headers, options) {
  let fetchOptions = makeFetchOptions(method, headers)
  if (body) {
    if (body instanceof FormData) {
      fetchOptions.body = body
    } else {
      fetchOptions.body = JSON.stringify(body)
      fetchOptions.headers['Content-Type'] = 'application/json'
    }
  }
  return _fetch(url, fetchOptions, options)
}

async function _fetch (url, fetchOptions, options) {
  let response
  if (options && options.timeout) {
    response = await fetchWithTimeout(url, fetchOptions, options.timeout)
  } else {
    response = await fetch(url, fetchOptions)
  }
  return throwErrorIfInvalidResponse(response)
}

async function throwErrorIfInvalidResponse (response) {
  let json = await response.json()
  if (response.status >= 200 && response.status < 300) {
    return json
  }
  if (json && json.error) {
    throw new Error(response.status + ': ' + json.error)
  }
  throw new Error('Request failed: ' + response.status)
}

function fetchWithTimeout (url, fetchOptions, timeout) {
  return new Promise((resolve, reject) => {
    fetch(url, fetchOptions).then(resolve, reject)
    setTimeout(() => reject(new Error(`Timed out after ${timeout / 1000} seconds`)), timeout)
  })
}

function makeFetchOptions (method, headers) {
  return {
    method,
    headers: Object.assign(headers || {}, {
      'Accept': 'application/json'
    })
  }
}
