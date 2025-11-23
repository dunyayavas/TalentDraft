import Link from "next/link";

export default function Page() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Link href="/admin" className="block rounded-lg border p-6 hover:shadow">
        <h2 className="font-semibold mb-1">Admin</h2>
        <p className="text-sm text-muted-foreground">Create a session, import CSV, set pick quota, export session config.</p>
      </Link>
      <Link href="/play" className="block rounded-lg border p-6 hover:shadow">
        <h2 className="font-semibold mb-1">Play</h2>
        <p className="text-sm text-muted-foreground">Import session config, drag talents to your picks, export submission.</p>
      </Link>
      <Link href="/results" className="block rounded-lg border p-6 hover:shadow sm:col-span-2">
        <h2 className="font-semibold mb-1">Results</h2>
        <p className="text-sm text-muted-foreground">Import player submissions and view the ranked talents table.</p>
      </Link>
    </div>
  );
}
