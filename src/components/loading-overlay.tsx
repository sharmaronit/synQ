"use client";

interface LoadingOverlayProps {
  message: string;
  isVisible: boolean;
}

export function LoadingOverlay({ message, isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="flex flex-col items-center justify-center py-20"
      style={{ animation: "fade-in 0.3s ease-out" }}
    >
      <span className="spinner spinner-lg mb-4" />
      <p className="font-semibold" style={{ color: "var(--color-sage)" }}>
        {message}
      </p>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--color-sage)",
              animation: `pulse-dot 1.5s ease-in-out ${i * 200}ms infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
