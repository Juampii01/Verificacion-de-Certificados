// lib/auth.js
// Chequeo simple de la contraseña del panel admin.
export function checkAdmin(request) {
  const token = request.headers.get("x-admin-token");
  const expected = process.env.ADMIN_TOKEN;
  return expected && token === expected;
}
