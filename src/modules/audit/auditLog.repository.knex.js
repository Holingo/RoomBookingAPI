function createAuditLogRepository(db) {
  return {
    async insert(eventType, payload) {
      await db("audit_log").insert({ event_type: eventType, payload });
    },

    async list({ page, limit, eventType }) {
      const query = db("audit_log");
      if (eventType) query.where({ event_type: eventType });

      const count = await query.clone().count({ total: "*" }).first();
      const data = await query
        .select("id", "event_type as eventType", "payload", "created_at as createdAt")
        .orderBy([{ column: "created_at", order: "desc" }, { column: "id", order: "desc" }])
        .limit(limit)
        .offset((page - 1) * limit);

      return { data, total: Number(count.total) };
    },
  };
}

module.exports = { createAuditLogRepository };
