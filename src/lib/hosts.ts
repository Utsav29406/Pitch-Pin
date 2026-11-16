// PitchPin runs on two addresses from one deployment:
//   players → NEXT_PUBLIC_APP_URL (pitchpins.vercel.app)
//   admins  → ADMIN_HOST (pitchpin-admin.vercel.app); locally, admin.localhost:3000
export const ADMIN_HOST = (process.env.ADMIN_HOST ?? "pitchpin-admin.vercel.app").toLowerCase();

export function isAdminHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  const name = h.split(":")[0];
  return h === ADMIN_HOST || name === ADMIN_HOST || name.startsWith("admin.");
}
