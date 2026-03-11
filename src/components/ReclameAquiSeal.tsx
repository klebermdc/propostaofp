import { useEffect, useRef } from "react";

export function ReclameAquiSeal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.id = "ra-embed-verified-seal";
    script.src = "https://s3.amazonaws.com/raichu-beta/ra-verified/bundle.js";
    script.setAttribute("data-id", "X19LeEstZU5PSllra2J5XzpvcmxhbmRvLWZhc3QtcGFzcw==");
    script.setAttribute("data-target", "ra-verified-seal");
    script.setAttribute("data-model", "horizontal_3");

    containerRef.current.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="ra-verified-seal"
      className="flex items-center justify-center mt-4"
    />
  );
}
