import { useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

export default function CanvasBackground() {
  try {
    const initParticles = useCallback(async (engine) => {
      await loadSlim(engine);
    }, []);

    const options = useMemo(
      () => ({
        fullScreen: { enable: false },
        background: { color: "transparent" },
        detectRetina: true,
        fpsLimit: 60,
        interactivity: {
          detectsOn: "canvas",
          events: {
            onHover: { enable: true, mode: "repulse" },
            resize: true,
          },
          modes: {
            repulse: { distance: 80, duration: 0.4 },
          },
        },
        particles: {
          color: { value: ["#00f5ff", "#b026ff", "#00ff88"] },
          links: {
            color: "#00f5ff",
            distance: 140,
            enable: true,
            opacity: 0.12,
            width: 1,
          },
          collisions: { enable: false },
          move: {
            direction: "none",
            enable: true,
            outModes: { default: "out" },
            random: false,
            speed: 0.8,
            straight: false,
          },
          number: { density: { enable: true, area: 900 }, value: 120 },
          opacity: {
            value: { min: 0.2, max: 0.6 },
            animation: { enable: true, speed: 0.4, minimumValue: 0.1 },
          },
          shape: { type: "circle" },
          size: {
            value: { min: 1, max: 3.5 },
            animation: { enable: true, speed: 3, minimumValue: 0.5 },
          },
        },
      }),
      []
    );

    return (
      <Particles
        id="surestack-particles"
        className="pointer-events-none absolute inset-0 -z-10"
        init={initParticles}
        options={options}
      />
    );
  } catch (err) {
    console.warn("[VisualLayer] Failed to render CanvasBackground", err);
    return null;
  }
}
