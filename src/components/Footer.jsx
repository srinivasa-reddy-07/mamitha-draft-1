import { useEffect, useRef, useState } from "react";
import "./styles/Footer.css";

const DEFAULT_LOGO = "/logo.png";

const DEFAULT_PORTRAITS = ["mono_reenu2.png", "/mono_maddy.png", "/mono_ashley.png"];

const CELL_SIZE = 8;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const CHAR_SIZE = 12;
const ASCII_COLOR = "#dadada";
const ASCII_CHARS = "MAMITHABAIJU";
const BRIGHTNESS_THRESHOLD = 0.5;
const ASCII_MIN_WIDTH = 1200;
const HOVER_RADIUS = 7;
const HOVER_PUSH = 7;
const HOVER_EASE = 0.1;
const SCATTER_RANGE = 20;
const SCATTER_EASE = 0.075;
const GRAVITY = 0.05;
const BOUNCE = 0.25;
const RESET_EASE = 0.05;
const STAGGER_FRAMES = 18;

// Text shown under the footer
const HINTS = {
  logo: "click to change",
  next: "keep clicking, there's more",
  lastImage: "click again and watch it fall",
  fallen: "one more click to put it back",
};

export default function Footer({
  logoSrc = DEFAULT_LOGO,
  portraitSrcs = DEFAULT_PORTRAITS,
}) {
  const footerRef = useRef(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const portraitRefs = useRef([]);
  const [hint, setHint] = useState(HINTS.logo);

  useEffect(() => {
    const footer = footerRef.current;
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!footer || !canvas || !logo) return;

    const context = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;

    let phase = "logo";
    const cursor = { col: -999, row: -999 };
    let gridCols = 0;
    let gridRows = 0;
    let asciiCells = [];
    let baseLogoCells = [];
    let rafId = null;
    let visible = true;
    let imageIndex = 0; // which portrait is currently showing

    const imageCount = portraitSrcs.length;

    const hintFor = (p) => {
      if (p === "scattered")
        return imageIndex < imageCount - 1 ? HINTS.next : HINTS.lastImage;
      if (p === "fallen") return HINTS.fallen;
      return HINTS.logo;
    };

    const setPhase = (next) => {
      phase = next;
      setHint(hintFor(next));
    };

    const randomAsciiChar = () =>
      ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];

    // 1. Build the ASCII cells from the logo
    function buildAsciiFromLogo() {
      phase = "logo";
      setHint(HINTS.logo);

      if (window.innerWidth < ASCII_MIN_WIDTH || !logo.naturalWidth) {
        asciiCells = [];
        baseLogoCells = [];
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const width = footerRect.width;
      const height = footerRect.height;

      gridCols = Math.floor(width / CELL_STEP);
      gridRows = Math.floor(height / CELL_STEP);
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      // Logo position relative to the footer (not the viewport)
      const logoRect = logo.getBoundingClientRect();
      const logoLeft = logoRect.left - footerRect.left;
      const logoTop = logoRect.top - footerRect.top;

      const sampler = document.createElement("canvas");
      sampler.width = gridCols;
      sampler.height = gridRows;
      const samplerContext = sampler.getContext("2d", {
        willReadFrequently: true,
      });
      samplerContext.drawImage(
        logo,
        logoLeft / CELL_STEP,
        logoTop / CELL_STEP,
        logoRect.width / CELL_STEP,
        logoRect.height / CELL_STEP,
      );
      const { data } = samplerContext.getImageData(0, 0, gridCols, gridRows);

      const litCells = new Set();
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const pixel = (row * gridCols + col) * 4;
          const alpha = data[pixel + 3] / 255;
          const brightness =
            ((data[pixel] * 0.299 +
              data[pixel + 1] * 0.587 +
              data[pixel + 2] * 0.114) /
              255) *
            alpha;

          if (brightness > BRIGHTNESS_THRESHOLD) {
            litCells.add(`${col},${row}`);
          }
        }
      }

      asciiCells = [];
      baseLogoCells = [];
      for (const key of litCells) {
        const [col, row] = key.split(",").map(Number);
        baseLogoCells.push({ col, row });
        asciiCells.push({
          col,
          row,
          char: randomAsciiChar(),
          charTimer: Math.floor(Math.random() * 60),
          offsetX: 0,
          offsetY: 0,
          fallSpeed: 0,
          wait: 0,
          scatterX: (Math.random() - 0.5) * SCATTER_RANGE,
          scatterY: (Math.random() - 0.5) * SCATTER_RANGE,
          opacity: 1,
          colorBlend: 0,
          isExtra: false,
        });
      }
    }

    function easeToward(cell, targetX, targetY, ease) {
      cell.offsetX += (targetX - cell.offsetX) * ease;
      cell.offsetY += (targetY - cell.offsetY) * ease;
    }

    function staggerCells() {
      for (const cell of asciiCells) {
        cell.wait = Math.floor(Math.random() * STAGGER_FRAMES);
      }
    }

    // 2. Analyze the portrait only when triggered
    function analyzePicture(picture) {
      if (!picture || !picture.naturalWidth) return [];
      const imgWidth = picture.naturalWidth;
      const imgHeight = picture.naturalHeight;
      const sampler = document.createElement("canvas");
      sampler.width = gridCols;
      sampler.height = gridRows;
      const sctx = sampler.getContext("2d", { willReadFrequently: true });

      const scale =
        Math.min(gridCols / imgWidth, gridRows / imgHeight) * 0.8;
      const drawW = imgWidth * scale;
      const drawH = imgHeight * scale;
      const drawX = (gridCols - drawW) / 2;
      const drawY = (gridRows - drawH) / 2;

      sctx.drawImage(picture, drawX, drawY, drawW, drawH);
      const { data } = sctx.getImageData(0, 0, gridCols, gridRows);

      const picCells = [];
      // const CHARS_SHADE = "` .'`,:-\~=+\*^\!iIl|?/()\[\]ctfjuvxyznmwqpdbkhao#MW&8%B@$\`";
      // const CHARS_SHADE = "  ..''``::,,--~~!!||//\\\\(([[ttffjjrrxxnnuvvcczzXXYYUUJJCCLLQQ00OOZZmmwwqqppbbddkkhh**aa##MMWW&&88%%BB@@$$";

      const CHARS_SHADE = "MAMITHABAIJU ";
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const pixel = (row * gridCols + col) * 4;
          const alpha = data[pixel + 3] / 255;
          if (alpha < 0.1) continue;

          const brightness =
            ((data[pixel] * 0.299 +
              data[pixel + 1] * 0.587 +
              data[pixel + 2] * 0.114) /
              255) *
            alpha;
          if (brightness > 0.05) {
            const charIndex = Math.floor(
              brightness * (CHARS_SHADE.length - 1),
            );
            const char = CHARS_SHADE[charIndex];
            if (char !== " ") {
              picCells.push({
                col,
                row,
                char,
                opacity: Math.max(0.2, brightness),
              });
            }
          }
        }
      }
      return picCells;
    }

    function formImage(index) {
      const picData = analyzePicture(portraitRefs.current[index]);
      if (!picData.length || !baseLogoCells.length) return false;

      for (let i = 0; i < picData.length; i++) {
        const pCell = picData[i];

        if (i < asciiCells.length) {
          const cell = asciiCells[i];
          cell.scatterX = pCell.col - cell.col;
          cell.scatterY = pCell.row - cell.row;
          cell.imageChar = pCell.char;
          cell.targetOpacity = pCell.opacity;
        } else {
          const base =
            baseLogoCells[Math.floor(Math.random() * baseLogoCells.length)];
          asciiCells.push({
            col: base.col,
            row: base.row,
            char: randomAsciiChar(),
            charTimer: 0,
            offsetX: 0,
            offsetY: 0,
            scatterX: pCell.col - base.col,
            scatterY: pCell.row - base.row,
            fallSpeed: 0,
            wait: Math.floor(Math.random() * STAGGER_FRAMES),
            opacity: 0,
            targetOpacity: pCell.opacity,
            imageChar: pCell.char,
            colorBlend: 0,
            isExtra: true,
          });
        }
      }
      for (let i = picData.length; i < asciiCells.length; i++) {
        asciiCells[i].targetOpacity = 0;
      }
      return true;
    }

    // 3. Physics loop
    function updateAsciiCells() {
      let everyoneHome = phase === "returning" || phase === "scattered";

      for (const cell of asciiCells) {
        if (phase !== "scattered" || !cell.imageChar) {
          if (cell.charTimer-- <= 0) {
            cell.char = randomAsciiChar();
            cell.charTimer = Math.floor(Math.random() * 60) + 30;
          }
        }

        if (cell.wait > 0) {
          cell.wait--;
          everyoneHome = false;
          continue;
        }

        if (phase === "scattered") {
          if (cell.opacity !== undefined && cell.targetOpacity !== undefined)
            cell.opacity += (cell.targetOpacity - cell.opacity) * 0.1;
          if (cell.colorBlend !== undefined)
            cell.colorBlend += (1 - cell.colorBlend) * 0.1;
        } else if (phase === "returning") {
          if (cell.opacity !== undefined)
            cell.opacity += ((cell.isExtra ? 0 : 1) - cell.opacity) * 0.1;
          if (cell.colorBlend !== undefined)
            cell.colorBlend += (0 - cell.colorBlend) * 0.1;
        }

        if (phase === "scattered") {
          easeToward(cell, cell.scatterX, cell.scatterY, SCATTER_EASE);
          if (
            Math.abs(cell.offsetX - cell.scatterX) > 0.1 ||
            Math.abs(cell.offsetY - cell.scatterY) > 0.1
          ) {
            everyoneHome = false;
          }
        } else if (phase === "fallen") {
          const floorOffset = gridRows - 1 - cell.row;
          cell.fallSpeed += GRAVITY;
          cell.offsetY += cell.fallSpeed;

          if (cell.offsetY > floorOffset) {
            cell.offsetY = floorOffset;
            cell.fallSpeed *= -BOUNCE;
          }
        } else if (phase === "returning") {
          easeToward(cell, 0, 0, RESET_EASE);
          if (Math.abs(cell.offsetX) > 0.05 || Math.abs(cell.offsetY) > 0.05) {
            everyoneHome = false;
          }
        } else {
          let targetX = 0;
          let targetY = 0;
          const distX = cell.col - cursor.col;
          const distY = cell.row - cursor.row;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < HOVER_RADIUS && distance > 0) {
            const push = (1 - distance / HOVER_RADIUS) * HOVER_PUSH;
            targetX = (distX / distance) * push;
            targetY = (distY / distance) * push;
          }
          easeToward(cell, targetX, targetY, HOVER_EASE);
        }
      }

      // Once the text is back, remove the extra spawned particles
      if (everyoneHome && phase === "returning") {
        asciiCells = asciiCells.filter((c) => !c.isExtra);
        setPhase("logo");
      }
    }

    function drawAscii() {
      const w = canvas.width / pixelRatio;
      const h = canvas.height / pixelRatio;
      context.clearRect(0, 0, w, h);
      context.font = `bold ${CHAR_SIZE}px monospace`;
      context.textBaseline = "middle";
      context.textAlign = "center";

      for (const cell of asciiCells) {
        if (cell.opacity < 0.01) continue;

        const x = (cell.col + cell.offsetX) * CELL_STEP + CELL_STEP / 2;
        const y = (cell.row + cell.offsetY) * CELL_STEP + CELL_STEP / 2;

        let charToDraw = cell.char;
        if (phase === "scattered" && cell.imageChar) charToDraw = cell.imageChar;

        if (cell.colorBlend !== undefined && cell.colorBlend > 0) {
          // Grey (#dadada) -> Orange (#ff591f)
          const r = Math.round(218 + (255 - 218) * cell.colorBlend);
          const g = Math.round(218 + (89 - 218) * cell.colorBlend);
          const b = Math.round(218 + (31 - 218) * cell.colorBlend);
          context.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          context.fillStyle = ASCII_COLOR;
        }

        context.globalAlpha = cell.opacity !== undefined ? cell.opacity : 1;
        context.fillText(charToDraw, x, y);
      }
      context.globalAlpha = 1;
    }

    function renderLoop() {
      if (visible && asciiCells.length > 0) {
        updateAsciiCells();
        drawAscii();
      }
      rafId = requestAnimationFrame(renderLoop);
    }

    // 4. Events (scoped to the footer, not the whole window)
    const onMouseMove = (event) => {
      const rect = footer.getBoundingClientRect();
      cursor.col = (event.clientX - rect.left) / CELL_STEP;
      cursor.row = (event.clientY - rect.top) / CELL_STEP;
    };

    const onMouseLeave = () => {
      cursor.col = -999;
      cursor.row = -999;
    };

    const onClick = () => {
      if (asciiCells.length === 0) return;

      if (phase === "logo") {
        imageIndex = 0;
        if (!formImage(0)) return;
        setPhase("scattered");
        staggerCells();
      } else if (phase === "scattered") {
        if (imageIndex < imageCount - 1) {
          // Morph into the next image
          if (!formImage(imageIndex + 1)) return;
          imageIndex++;
          setHint(hintFor("scattered"));
          staggerCells();
        } else {
          setPhase("fallen");
          for (const cell of asciiCells) cell.fallSpeed = 0;
        }
      } else if (phase === "fallen") {
        imageIndex = 0;
        setPhase("returning");
        staggerCells();
      }
    };

    // Only animate while the footer is on screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(footer);

    footer.addEventListener("mousemove", onMouseMove);
    footer.addEventListener("mouseleave", onMouseLeave);
    footer.addEventListener("click", onClick);
    window.addEventListener("resize", buildAsciiFromLogo);
    logo.addEventListener("load", buildAsciiFromLogo);
    if (logo.complete) buildAsciiFromLogo();

    renderLoop();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      footer.removeEventListener("mousemove", onMouseMove);
      footer.removeEventListener("mouseleave", onMouseLeave);
      footer.removeEventListener("click", onClick);
      window.removeEventListener("resize", buildAsciiFromLogo);
      logo.removeEventListener("load", buildAsciiFromLogo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoSrc, portraitSrcs.join("|")]);

  return (
    <footer className="ascii-footer" ref={footerRef}>
      <img
        ref={logoRef}
        src={logoSrc}
        className="ascii-footer__logo"
        alt="Logo Text"
      />
      <canvas ref={canvasRef} className="ascii-footer__canvas" />

      {/* Hidden: only used as pixel data for the canvas */}
      {portraitSrcs.map((src, i) => (
        <img
          key={src}
          ref={(el) => (portraitRefs.current[i] = el)}
          src={src}
          className="ascii-footer__portrait"
          alt=""
          aria-hidden="true"
        />
      ))}

      <p className="ascii-footer__hint" aria-hidden="true">
        {hint}
      </p>
    </footer>
  );
}