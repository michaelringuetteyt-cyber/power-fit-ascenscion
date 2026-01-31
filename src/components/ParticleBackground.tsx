import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
  color: string;
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 15000);
      
      const colors = [
        "hsla(0, 85%, 55%, 0.6)",    // Primary red
        "hsla(210, 100%, 55%, 0.5)", // Secondary blue
        "hsla(0, 85%, 65%, 0.4)",    // Light red
        "hsla(210, 100%, 65%, 0.4)", // Light blue
        "hsla(0, 0%, 100%, 0.3)",    // White
      ];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      return particles;
    };

    const drawParticle = (particle: Particle) => {
      const perspective = 1000;
      const scale = perspective / (perspective + particle.z);
      const x2d = (particle.x - canvas.width / 2) * scale + canvas.width / 2;
      const y2d = (particle.y - canvas.height / 2) * scale + canvas.height / 2;
      const size2d = particle.size * scale;

      // 3D glow effect
      const gradient = ctx.createRadialGradient(x2d, y2d, 0, x2d, y2d, size2d * 3);
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(0.5, particle.color.replace(/[\d.]+\)$/, `${particle.opacity * 0.5})`));
      gradient.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.arc(x2d, y2d, size2d * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core particle
      ctx.beginPath();
      ctx.arc(x2d, y2d, size2d, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    };

    const drawConnections = (particles: Particle[]) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dz = particles[i].z - particles[j].z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < 150) {
            const perspective = 1000;
            const scale1 = perspective / (perspective + particles[i].z);
            const scale2 = perspective / (perspective + particles[j].z);
            
            const x1 = (particles[i].x - canvas.width / 2) * scale1 + canvas.width / 2;
            const y1 = (particles[i].y - canvas.height / 2) * scale1 + canvas.height / 2;
            const x2 = (particles[j].x - canvas.width / 2) * scale2 + canvas.width / 2;
            const y2 = (particles[j].y - canvas.height / 2) * scale2 + canvas.height / 2;

            const opacity = (1 - distance / 150) * 0.15;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(0, 85%, 55%, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    const updateParticle = (particle: Particle) => {
      // Mouse interaction
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200) {
        const force = (200 - distance) / 200;
        particle.vx -= (dx / distance) * force * 0.02;
        particle.vy -= (dy / distance) * force * 0.02;
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;

      // Apply friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Boundaries with 3D wrap
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;
      if (particle.z < 0) particle.z = 1000;
      if (particle.z > 1000) particle.z = 0;

      // Pulsing opacity
      particle.opacity = 0.2 + Math.sin(Date.now() * 0.001 + particle.x * 0.01) * 0.3;
    };

    const animate = () => {
      ctx.fillStyle = "rgba(10, 12, 16, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sort by z-index for proper 3D rendering
      particlesRef.current.sort((a, b) => b.z - a.z);

      drawConnections(particlesRef.current);

      particlesRef.current.forEach((particle) => {
        updateParticle(particle);
        drawParticle(particle);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    resizeCanvas();
    particlesRef.current = createParticles();
    animate();

    window.addEventListener("resize", () => {
      resizeCanvas();
      particlesRef.current = createParticles();
    });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "transparent" }}
    />
  );
};

export default ParticleBackground;
