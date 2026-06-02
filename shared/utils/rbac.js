export const Roles = {
  BUSINESS_ADMIN: 'BUSINESS_ADMIN',
  UNDERWRITER: 'UNDERWRITER',
  VIEWER: 'VIEWER',
}

export function can(action, role) {
  const map = {
    'policy:update': [Roles.BUSINESS_ADMIN, Roles.UNDERWRITER],
    'policy:view': [Roles.BUSINESS_ADMIN, Roles.UNDERWRITER, Roles.VIEWER],
    'governance:queue': [Roles.BUSINESS_ADMIN],
    'governance:execute': [Roles.BUSINESS_ADMIN],
    'export:data': [Roles.BUSINESS_ADMIN, Roles.UNDERWRITER],
  }
  return (map[action] || []).includes(role)
}






















