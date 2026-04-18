import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { registarCompra } from "../controllers/compras.controller";
import { requireApiKey } from "../middleware/apiKey.middleware";
import {
  comprasSchemaRequest,
  comprasSchemaResponse,
} from "../schemas/compras.schema";

const comprasRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post("/", {
    onRequest: [requireApiKey],
    schema: {
      tags: ["Compras"],
      summary: "Registar compra via N8N",
      security: [{ apiKey: [] }],
      body: comprasSchemaRequest,
      response: {
        201: comprasSchemaResponse,
      },
    },
    handler: registarCompra,
  });
};

export default comprasRoutes;
