"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section container">
      <h1>Let’s try that again.</h1>
      <p className="section-body">We couldn’t load this page. Please retry.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
