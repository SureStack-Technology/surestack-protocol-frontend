/**
 * Modern parallax background animation for SureStack cosmic theme.
 * Creates sleek floating nodes with modern glow effects.
 */
export function initParallax() {
  const body = document.body;
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;

  // Create modern network nodes (reduced count for cleaner look)
  const nodeCount = 15;
  for (let i = 0; i < nodeCount; i++) {
    const node = document.createElement("div");
    node.className = "floating-node-modern";
    node.style.top = `${Math.random() * 100}%`;
    node.style.left = `${Math.random() * 100}%`;
    node.style.animationDelay = `${Math.random() * 15}s`;
    node.style.animationDuration = `${8 + Math.random() * 4}s`;
    body.appendChild(node);
  }

  // Track mouse for parallax movement
  document.addEventListener("mousemove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 8;
    targetY = (e.clientY / window.innerHeight - 0.5) * 8;
  });

  // Animate stars gently based on cursor position
  const loop = () => {
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    body.style.backgroundPosition = `${50 + mouseX}% ${50 + mouseY}%`;
    requestAnimationFrame(loop);
  };

  loop();
}

