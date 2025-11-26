export type UserRole = "super_admin" | "admin" | "player";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  company?: string;
}

// Simple in-memory demo users. Passwords are plain text for illustration only.
export const demoUsers: DemoUser[] = [
  {
    id: "u-super-1",
    email: "super@talentdraft.local",
    password: "super123",
    role: "super_admin",
  },
  {
    id: "u-admin-1",
    email: "admin@acme.local",
    password: "admin123",
    role: "admin",
    company: "Acme Corp",
  },
  {
    id: "u-player-1",
    email: "player@acme.local",
    password: "player123",
    role: "player",
    company: "Acme Corp",
  },
];

export async function demoLogin(email: string, password: string): Promise<DemoUser | null> {
  const user = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return user || null;
}
