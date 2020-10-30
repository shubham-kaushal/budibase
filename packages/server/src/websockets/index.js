const env = require("../environment")
const WebSocket = require("ws")
const webhookController = require("../api/controllers/webhook")
const { MessageTypes, getAllWebhooks } = require("./utils")

const WS_PROTOCOL = "ws://"

if (!env.CLOUD_JOB_SERVER) {
  env._set("CLOUD_JOB_SERVER", "http://localhost:4003")
} else if (env.CLOUD_JOB_SERVER.endsWith("/")) {
  env._set(
    "CLOUD_JOB_SERVER",
    env.CLOUD_JOB_SERVER.substring(0, env.CLOUD_JOB_SERVER.length - 2)
  )
}
const RETRY_PERIOD_MS = 30000

const internals = {
  client: null,
  connected: false,
  retry: null,
}

function sendWebsocketMessage(type, params) {
  internals.client.send(
    JSON.stringify({
      type,
      params,
    })
  )
}

async function sendToAPI(type, event) {
  const ctx = {
    params: {
      appId: event.appId,
      id: event.webhookId,
    },
    request: {
      body: event.body,
    },
  }
  switch (type) {
    case MessageTypes.TRIGGER:
      await webhookController.trigger(ctx)
      break
    case MessageTypes.SCHEMA:
      await webhookController.buildSchema(ctx)
      break
  }
}

exports.init = () => {
  if (env.CLOUD) {
    return
  }
  try {
    const urlParts = env.CLOUD_JOB_SERVER.split("//")
    const server = `${WS_PROTOCOL}${urlParts[1]}`
    internals.client = new WebSocket(server)
  } catch (err) {
    internals.connected = false
  }
  internals.client.on("open", async () => {
    if (internals.retry) {
      clearInterval(internals.retry)
    }
    internals.connected = true
    const webhooks = await getAllWebhooks()
    for (let webhook of webhooks) {
      exports.setupWebhook(webhook.appId, webhook.id)
    }
  })
  internals.client.on("message", async data => {
    let json = JSON.parse(data)
    switch (json.type) {
      case MessageTypes.SCHEMA:
        await sendToAPI(MessageTypes.SCHEMA, json.params)
        break
      case MessageTypes.TRIGGER:
        await sendToAPI(MessageTypes.TRIGGER, json.params)
        break
    }
  })
  const close = () => {
    internals.connected = false
    if (!internals.retry) {
      internals.retry = setInterval(() => {
        exports.init()
      }, RETRY_PERIOD_MS)
    }
  }
  internals.client.on("error", close)
  internals.client.on("close", close)
}

exports.setupWebhook = (appId, webhookId) => {
  if (env.CLOUD || !internals.connected) {
    return
  }
  sendWebsocketMessage(MessageTypes.NEW_HOOK, {
    appId,
    webhookId,
  })
}

exports.destroyWebhook = (appId, webhookId) => {
  if (env.CLOUD || !internals.connected) {
    return
  }
  sendWebsocketMessage(MessageTypes.DESTROY_HOOK, {
    appId,
    webhookId,
  })
}

exports.isConnected = () => {
  return internals.connected
}
