import { useRef } from "react";
import Hero from "./components/Hero";
import SpiralGallery from "./components/SpiralGallery";
import About from "./components/About";
import Footer from "./components/Footer";
import StackLayer from "./components/StackLayer";
import useCoverProgress from "./hooks/useCoverProgress";
// import Section from "./components/Section";

export default function App() {
  const heroTextRef = useRef(null); // the gallery dims this as "about" rises
  const aboutRef = useRef(null); // the first section that covers the gallery
  const footerRef = useRef(null); // the layer that covers "about"

  // writes --cover (0 -> 1) onto About while the footer slides over it
  useCoverProgress(aboutRef, footerRef);

  return (
    <>
      <Hero textRef={heroTextRef} />
      <SpiralGallery heroTextRef={heroTextRef} nextRef={aboutRef} />
      <About sectionRef={aboutRef} />
      <StackLayer layerRef={footerRef}>
        <Footer />
      </StackLayer>
    </>
  );
}