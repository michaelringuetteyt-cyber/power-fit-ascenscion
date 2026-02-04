import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  baseSize: number;
  opacity: number;
  baseOpacity: number;
  color: string;
  life: number;
  maxLife: number;
  turbulenceOffset: number;
  turbulenceSpeed: number;
  rotationSpeed: number;
  rotation: number;
}

// Simplex noise approximation for organic movement
const noise2D = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
};

const turbulence = (x: number, y: number, time: number, octaves: number = 4): number => {
  let value = 0;
  let amplitude = 1;
  let frequency = 0.005;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency + time * 0.0005, i);
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value;
};

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = (x?: number, y?: number): Particle => {
      const colors = [
        "hsla(0, 60%, 45%, ",      // Darker red smoke
        "hsla(210, 80%, 45%, ",    // Blue smoke
        "hsla(0, 50%, 35%, ",      // Deep red
        "hsla(210, 60%, 35%, ",    // Deep blue
        "hsla(220, 20%, 25%, ",    // Dark grey smoke
        "hsla(0, 0%, 20%, ",       // Dark smoke
      ];

      const maxLife = 300 + Math.random() * 400;
      const baseSize = Math.random() * 60 + 30;
      
      return {
        x: x ?? Math.random() * canvas.width,
        y: y ?? canvas.height + Math.random() * 100,
        z: Math.random() * 500,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.8 + 0.3), // Rising motion
        vz: (Math.random() - 0.5) * 0.5,
        size: baseSize * 0.3,
        baseSize: baseSize,
        opacity: 0,
        baseOpacity: Math.random() * 0.15 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: maxLife,
        turbulenceOffset: Math.random() * 1000,
        turbulenceSpeed: Math.random() * 0.5 + 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotation: Math.random() * Math.PI * 2,
      };
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 25000);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle();
        particle.life = Math.random() * particle.maxLife; // Stagger initial states
        particle.y = Math.random() * canvas.height;
        particles.push(particle);
      }
      return particles;
    };

    const drawSmokeParticle = (particle: Particle) => {
      const perspective = 800;
      const scale = perspective / (perspective + particle.z);
      const x2d = (particle.x - canvas.width / 2) * scale + canvas.width / 2;
      const y2d = (particle.y - canvas.height / 2) * scale + canvas.height / 2;
      
      // Life-based calculations
      const lifeRatio = particle.life / particle.maxLife;
      
      // Fade in at start, fade out at end
      let fadeMultiplier = 1;
      if (lifeRatio < 0.1) {
        fadeMultiplier = lifeRatio / 0.1;
      } else if (lifeRatio > 0.7) {
        fadeMultiplier = 1 - ((lifeRatio - 0.7) / 0.3);
      }
      
      // Size grows as smoke rises
      const sizeMultiplier = 0.3 + lifeRatio * 0.7;
      const size2d = particle.baseSize * sizeMultiplier * scale;
      
      const currentOpacity = particle.baseOpacity * fadeMultiplier * scale;
      
      if (currentOpacity <= 0.001 || size2d < 1) return;

      ctx.save();
      ctx.translate(x2d, y2d);
      ctx.rotate(particle.rotation);
      
      // Multi-layer smoke effect for realism
      const layers = 3;
      for (let layer = 0; layer < layers; layer++) {
        const layerSize = size2d * (1 - layer * 0.2);
        const layerOpacity = currentOpacity * (1 - layer * 0.3);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, layerSize);
        gradient.addColorStop(0, `${particle.color}${layerOpacity * 0.8})`);
        gradient.addColorStop(0.3, `${particle.color}${layerOpacity * 0.4})`);
        gradient.addColorStop(0.6, `${particle.color}${layerOpacity * 0.15})`);
        gradient.addColorStop(1, `${particle.color}0)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, layerSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      
      ctx.restore();
    };

    const updateParticle = (particle: Particle, deltaTime: number) => {
      const time = timeRef.current;
      
      // Turbulence for organic movement
      const turbX = turbulence(
        particle.x + particle.turbulenceOffset, 
        particle.y, 
        time * particle.turbulenceSpeed
      );
      const turbY = turbulence(
        particle.x, 
        particle.y + particle.turbulenceOffset + 500, 
        time * particle.turbulenceSpeed
      );
      
      // Apply turbulence to velocity
      particle.vx += turbX * 0.02;
      particle.vy += turbY * 0.015;
      
      // Rising motion with slight deceleration
      particle.vy -= 0.002;
      
      // Mouse repulsion
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200 && distance > 0) {
        const force = (200 - distance) / 200;
        particle.vx -= (dx / distance) * force * 0.15;
        particle.vy -= (dy / distance) * force * 0.15;
      }
      
      // Apply velocity with damping
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.z += particle.vz * deltaTime;
      
      // Damping for natural deceleration
      particle.vx *= 0.995;
      particle.vy *= 0.998;
      particle.vz *= 0.99;
      
      // Rotation
      particle.rotation += particle.rotationSpeed;
      
      // Update life
      particle.life += deltaTime * 0.5;
      
      // Z-axis boundaries
      if (particle.z < 0) particle.z = 500;
      if (particle.z > 500) particle.z = 0;
      
      // Reset particle when it dies or goes off screen
      if (particle.life >= particle.maxLife || particle.y < -100) {
        Object.assign(particle, createParticle(
          Math.random() * canvas.width,
          canvas.height + 50
        ));
      }
      
      // Wrap horizontal
      if (particle.x < -100) particle.x = canvas.width + 100;
      if (particle.x > canvas.width + 100) particle.x = -100;
    };

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 3); // Normalize to ~60fps
      lastTime = currentTime;
      timeRef.current = currentTime;
      
      // Clear with slight fade for trails
      ctx.fillStyle = "rgba(10, 12, 16, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Sort by z-index for proper layering
      particlesRef.current.sort((a, b) => b.z - a.z);
      
      particlesRef.current.forEach((particle) => {
        updateParticle(particle, deltaTime);
        drawSmokeParticle(particle);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    resizeCanvas();
    particlesRef.current = createParticles();
    animationRef.current = requestAnimationFrame(animate);

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
