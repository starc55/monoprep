export default function AppErrorFallback({ resetError }) {
  return (
    <main className="app-error-fallback" role="alert">
      <img src="/monoprep-logo.png" alt="MonoPrep" />
      <h1>Something went wrong</h1>
      <p>The error was recorded. Reload this screen and continue when you are ready.</p>
      <button type="button" onClick={resetError}>Reload screen</button>
    </main>
  );
}

