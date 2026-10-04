/** Remounts on navigation between Hall sections, replaying the fade-through. */
export default function HallTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
