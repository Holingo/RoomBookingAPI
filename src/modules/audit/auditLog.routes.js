const { Router } = require("express");
const { z } = require("zod");
const requireAdmin = require("../../middleware/requireAdmin");
const validate = require("../../middleware/validate");

const auditLogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  eventType: z.string().trim().min(1).max(255).optional(),
});

function createAuditLogRouter(auditLogRepository) {
  const router = Router();

  router.get("/", requireAdmin, validate({ query: auditLogQuery }), async (req, res) => {
    const { page, limit, eventType } = req.validated.query;
    const { data, total } = await auditLogRepository.list({ page, limit, eventType });

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  });

  return router;
}

module.exports = { createAuditLogRouter };
