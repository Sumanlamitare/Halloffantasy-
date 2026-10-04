export default function HallLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-10 w-64" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-40" />
      <div className="skeleton h-40" />
    </div>
  );
}
