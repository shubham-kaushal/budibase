const Router = require("@koa/router")
const controller = require("../controllers/webhook")
const authorized = require("../../middleware/authorized")
const joiValidator = require("../../middleware/joi-validator")
const { BUILDER, EXECUTE_WEBHOOK } = require("../../utilities/accessLevels")
const Joi = require("joi")

const router = Router()

function generateSaveValidator() {
  // prettier-ignore
  return joiValidator.body(Joi.object({
    live: Joi.bool(),
    _id: Joi.string().optional(),
    _rev: Joi.string().optional(),
    name: Joi.string().required(),
    bodySchema: Joi.object().optional(),
    action: Joi.object({
      type: Joi.string().required().valid(controller.WebhookType.AUTOMATION),
      target: Joi.string().required(),
    }).required(),
  }).unknown(true))
}

router
  .get("/api/webhooks", authorized(BUILDER), controller.fetch)
  // checks if has has WS external connection
  .get(
    "/api/webhook/connected",
    authorized(BUILDER),
    controller.externalConnection
  )
  .put(
    "/api/webhooks",
    authorized(BUILDER),
    generateSaveValidator(),
    controller.save
  )
  .delete("/api/webhooks/:id/:rev", authorized(BUILDER), controller.destroy)
  .post(
    "/api/webhooks/schema/:appId/:id",
    authorized(BUILDER),
    controller.buildSchema
  )
  .post(
    "/api/webhooks/trigger/:appId/:id",
    authorized(EXECUTE_WEBHOOK),
    controller.trigger
  )

module.exports = router
