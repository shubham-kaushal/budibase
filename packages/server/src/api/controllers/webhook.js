const CouchDB = require("../../db")
const { generateWebhookID, getWebhookParams } = require("../../db/utils")
const toJsonSchema = require("to-json-schema")
const env = require("../../environment")
const validate = require("jsonschema").validate
const triggers = require("../../automations/triggers")
const websocket = require("../../websockets")
const { cloneDeep } = require("lodash/fp")

const AUTOMATION_DESCRIPTION = "Generated from Webhook Schema"

function Webhook(name, type, target) {
  this.live = true
  this.name = name
  this.action = {
    type,
    target,
  }
}

exports.Webhook = Webhook

exports.WebhookType = {
  AUTOMATION: "automation",
}

exports.fetch = async ctx => {
  const db = new CouchDB(ctx.user.appId)
  const response = await db.allDocs(
    getWebhookParams(null, {
      include_docs: true,
    })
  )
  ctx.body = response.rows.map(row => row.doc)
}

exports.externalConnection = async ctx => {
  ctx.body = {
    connected: websocket.isConnected(),
    url: env.CLOUD_JOB_SERVER,
  }
}

exports.save = async ctx => {
  const db = new CouchDB(ctx.user.appId)
  const webhook = ctx.request.body
  webhook.appId = ctx.user.appId

  // check that the webhook exists
  if (webhook._id) {
    await db.get(webhook._id)
  } else {
    webhook._id = generateWebhookID()
  }
  const response = await db.put(webhook)
  websocket.setupWebhook(ctx.user.appId, webhook._id)
  ctx.body = {
    message: "Webhook created successfully",
    webhook: {
      ...webhook,
      ...response,
    },
  }
}

exports.destroy = async ctx => {
  const db = new CouchDB(ctx.user.appId)
  websocket.destroyWebhook(ctx.user.appId, ctx.params.id)
  ctx.body = await db.remove(ctx.params.id, ctx.params.rev)
}

exports.buildSchema = async ctx => {
  const db = new CouchDB(ctx.params.appId)
  const webhook = await db.get(ctx.params.id)
  webhook.bodySchema = toJsonSchema(ctx.request.body)
  // update the automation outputs
  if (webhook.action.type === exports.WebhookType.AUTOMATION) {
    let automation = await db.get(webhook.action.target)
    const outputs = cloneDeep(triggers.DEFAULT_WEBHOOK_OUTPUTS)
    let properties = webhook.bodySchema.properties
    for (let prop of Object.keys(properties)) {
      outputs.properties[prop] = {
        type: properties[prop].type,
        description: AUTOMATION_DESCRIPTION,
      }
    }
    automation.definition.trigger.schema.outputs = outputs
    await db.put(automation)
  }
  ctx.body = await db.put(webhook)
}

exports.trigger = async ctx => {
  const db = new CouchDB(ctx.params.appId)
  const webhook = await db.get(ctx.params.id)
  // validate against the schema
  if (webhook.bodySchema) {
    validate(ctx.request.body, webhook.bodySchema)
  }
  const target = await db.get(webhook.action.target)
  if (webhook.action.type === exports.WebhookType.AUTOMATION) {
    // trigger with both the pure request and then expand it
    // incase the user has produced a schema to bind to
    await triggers.externalTrigger(target, {
      body: ctx.request.body,
      ...ctx.request.body,
      appId: ctx.params.appId,
    })
  }
  ctx.status = 200
  ctx.body = "Webhook trigger fired successfully"
}
