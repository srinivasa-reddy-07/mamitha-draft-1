import { Fragment } from "react";
import "./styles/Hero.css";

export default function Hero({
  textRef,
  brand = "Mamitha",
  label = "Image Gallery",
  hint = "Scroll to explore ↓",
  lead = "In a world of beautiful chaos, she is my",
  accent = "favorite form of art.",
}) {
  const leadWords = lead.split(" ");
  const accentWords = accent.split(" ");

  return (
    <section className="hero">
      {/* <header className="hero__bar">
        <span>{brand}</span>
        <span>{hint}</span>
      </header> */}

      <h1 ref={textRef} className="hero__title">
        {leadWords.map((word, i) => (
          <Fragment key={i}>
            <span className="hero__word" style={{ "--i": i }}>
              {word}
            </span>{" "}
          </Fragment>
        ))}
        <span className="hero__accent">
          {accentWords.map((word, i) => (
            <Fragment key={i}>
              <span
                className="hero__word"
                style={{ "--i": leadWords.length + i }}
              >
                {word}
              </span>
              {i < accentWords.length - 1 && " "}
            </Fragment>
          ))}
        </span>
      </h1>
    </section>
  );
}