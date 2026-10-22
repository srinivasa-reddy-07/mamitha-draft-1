import "./styles/Section.css";

export default function Section({ className = "", sectionRef, children }) {
  return (
    <section ref={sectionRef} className={`section ${className}`}>
      {children}
    </section>
  );
}