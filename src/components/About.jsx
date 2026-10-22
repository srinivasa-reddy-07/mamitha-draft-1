import Section from "./Section";
import "./styles/About.css";

export default function About({ sectionRef }) {
  return (
    <Section className="about" sectionRef={sectionRef}>
      <h3>A presence beyond words.</h3>
      <h3>A beauty beyond the frame.</h3>
    </Section>
  );
}