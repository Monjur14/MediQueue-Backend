/**
 * Migration 13 — Create audit_logs table
 *
 * Immutable, append-only log of all sensitive actions across the platform.
 * No UPDATE or DELETE is ever issued against this table.
 * RLS is NOT applied here — super_admin reads across all tenants.
 */
exports.up = (pgm) => {
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    action: {
      type: 'varchar(64)',
      notNull: true,
    },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    tenant_id: {
      type: 'uuid',
      references: 'tenants(id)',
      onDelete: 'SET NULL',
    },
    target_id: {
      type: 'uuid',
      comment: 'Generic reference — doctor id, appointment id, etc.',
    },
    metadata: {
      type: 'jsonb',
      comment: 'Extra context serialised as JSONB',
    },
    ip_address: {
      type: 'inet',
    },
    user_agent: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Fast lookups by tenant (admin audit view)
  pgm.createIndex('audit_logs', 'tenant_id');
  // Fast lookups by user (who did what)
  pgm.createIndex('audit_logs', 'user_id');
  // Fast lookups by action type (filter by event)
  pgm.createIndex('audit_logs', 'action');
  // Chronological scan
  pgm.createIndex('audit_logs', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('audit_logs');
};
