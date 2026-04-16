import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,
});

const ADMIN_ROLES = ['admin', 'administrador', 'administrator'];

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(userId, role) {
  return `${userId}:${role}`;
}

async function getUserPermissions(userId, role) {
  const key = getCacheKey(userId, role);
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.perms;
  }

  const perms = new Set();

  if (ADMIN_ROLES.includes((role || '').toLowerCase())) {
    perms.add('*');
    permissionCache.set(key, { perms, ts: Date.now() });
    return perms;
  }

  try {
    const roleResult = await pool.query(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [role]
    );

    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      const rpResult = await pool.query(
        `SELECT p.resource, p.action
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [roleId]
      );
      rpResult.rows.forEach(r => perms.add(`${r.resource}.${r.action}`));
    }

    const upResult = await pool.query(
      `SELECT p.resource, p.action, up.granted
       FROM user_permissions up
       JOIN permissions p ON p.id = up.permission_id
       WHERE up.user_id = $1`,
      [userId]
    );
    upResult.rows.forEach(r => {
      const key = `${r.resource}.${r.action}`;
      if (r.granted === false) perms.delete(key);
      else perms.add(key);
    });
  } catch (err) {
    console.error('[permissionMiddleware] Erro ao carregar permissões:', err.message);
  }

  permissionCache.set(key, { perms, ts: Date.now() });
  return perms;
}

/**
 * Middleware factory para exigir uma ou mais permissões.
 * Uso: requirePermission('vendas.create')
 *      requirePermission(['vendas.view', 'os.view'], { requireAll: false })
 */
export function requirePermission(permission, options = {}) {
  const { requireAll = false } = options;
  const permList = Array.isArray(permission) ? permission : [permission];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const role = (user.role || 'member').toLowerCase();

      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      const perms = await getUserPermissions(user.id || user.sub, role);

      if (perms.has('*')) {
        return next();
      }

      const hasAccess = requireAll
        ? permList.every(p => perms.has(p))
        : permList.some(p => perms.has(p));

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Sem permissão',
          required: permList,
          message: 'Você não tem permissão para realizar esta ação.',
        });
      }

      next();
    } catch (err) {
      console.error('[requirePermission] Erro:', err.message);
      return res.status(500).json({ error: 'Erro ao verificar permissão' });
    }
  };
}

/**
 * Invalida o cache de permissões de um usuário (chamar ao alterar permissões/cargo).
 */
export function invalidatePermissionCache(userId) {
  for (const [key] of permissionCache) {
    if (key.startsWith(`${userId}:`)) {
      permissionCache.delete(key);
    }
  }
}

/**
 * Invalida todo o cache (chamar ao alterar role_permissions em massa).
 */
export function invalidateAllPermissionCache() {
  permissionCache.clear();
}
