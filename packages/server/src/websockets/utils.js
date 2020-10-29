const env = require("../environment")
const CouchDB = require("../db")
const { getWebhookParams } = require("../db/utils")

exports.MessageTypes = {
  STARTUP: "startup",
  NEW_HOOK: "new_hook",
  DESTROY_HOOK: "destroy_hook",
  ERROR: "error",
  SCHEMA: "schema",
  TRIGGER: "trigger",
}

// this gets all webhooks across all apps for this builder
exports.getAllWebhooks = async () => {
  if (env.CLOUD) {
    return
  }
  let allDbs = await CouchDB.allDbs()
  let webhooks = []
  for (let appId of allDbs) {
    let db = new CouchDB(appId)
    const someHooks = await db.allDocs(getWebhookParams())
    if (someHooks.rows.length !== 0) {
      webhooks = webhooks.concat(
        someHooks.rows.map(hook => {
          return { appId, ...hook }
        })
      )
    }
  }
  return webhooks
}
