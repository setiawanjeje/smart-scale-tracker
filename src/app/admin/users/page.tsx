import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";

function isAdmin(session: Session | null) {
  const role = (session?.user as unknown as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-black dark:bg-black dark:text-zinc-50">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="text-lg font-semibold">Not authorized</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You must be an admin to manage users.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  async function createUser(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "USER") as "USER" | "ADMIN";

    if (!email || !password) return;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role },
      create: { email, passwordHash, role },
    });
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!id || !password) return;

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 font-sans text-black dark:bg-black dark:text-zinc-50">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Invite-only user management.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Back
          </Link>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">Create / invite user</div>
          <form action={createUser} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              name="email"
              type="email"
              placeholder="email@example.com"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-black"
              required
            />
            <input
              name="password"
              type="text"
              placeholder="temporary password"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-black"
              required
            />
            <select
              name="role"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-black"
              defaultValue="USER"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">
              Create
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="grid grid-cols-12 gap-2 border-b border-black/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <div className="col-span-5">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-2">Reset password</div>
          </div>
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                <div className="col-span-5 truncate font-medium">{u.email}</div>
                <div className="col-span-2 text-zinc-600 dark:text-zinc-400">{u.role}</div>
                <div className="col-span-3 text-zinc-600 dark:text-zinc-400">
                  {u.createdAt.toISOString().slice(0, 10)}
                </div>
                <div className="col-span-2">
                  <form action={resetPassword} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      name="password"
                      type="text"
                      placeholder="new pw"
                      className="w-full rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs outline-none dark:border-white/10 dark:bg-black"
                      required
                    />
                    <button className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                      Save
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

