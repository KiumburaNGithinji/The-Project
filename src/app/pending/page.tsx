const REASONS: Record<string, { title: string; body: string }> = {
  not_in_guild: {
    title: "You're not in the Discord server yet",
    body: "Access is limited to members of the mentor's Discord. Join the server with this same Discord account, then sign in again.",
  },
  no_course: {
    title: "No course is set up yet",
    body: "The course hasn't been created in the database. If you're the mentor, seed a course row first.",
  },
};

export default async function PendingPage({
  searchParams,
}: PageProps<"/pending">) {
  const { reason } = await searchParams;
  const key = typeof reason === "string" ? reason : "";
  const copy = REASONS[key] ?? {
    title: "Access pending",
    body: "Your account isn't enrolled yet. Check with the mentor.",
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted">{copy.body}</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-md border border-border-strong px-4 py-2 text-sm transition hover:bg-surface-2"
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
