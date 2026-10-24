import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section container">
      <div className="eyebrow">BIZGENIX AI CRM / 404</div>
      <h1>This page has moved on.</h1>
      <p className="section-body">Let’s get you back to the next right step.</p>
      <Link href="/" className="button">
        Back to home
      </Link>
    </main>
  );
}
