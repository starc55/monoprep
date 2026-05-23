export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader-wrap">
      <div className="brand-loader" aria-hidden="true">
        <img src="/monoprep-logo.png" alt="" />
      </div>
      <p>{label}</p>
    </div>
  );
}
