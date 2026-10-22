import { useEffect } from "react";

// Sets a --cover CSS variable (0 -> 1) on `targetRef` while `coverRef`
// slides up over it. Style anything inside the target with var(--cover).
export default function useCoverProgress(targetRef, coverRef) {
  useEffect(() => {
    const target = targetRef.current;
    const cover = coverRef.current;
    if (!target || !cover) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const top = cover.getBoundingClientRect().top;
      const p = Math.min(Math.max(1 - top / window.innerHeight, 0), 1);
      target.style.setProperty("--cover", p.toFixed(4));
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetRef, coverRef]);
}