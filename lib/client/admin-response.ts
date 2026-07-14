export function requireAdminResponse(response: Response) {
  if (response.status !== 401) return;

  window.location.assign("/sign-in");
  throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
}
