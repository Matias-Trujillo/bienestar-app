'use client';

import React, { useEffect, useRef } from 'react';

type ShapeType = 'circle' | 'diamond';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  shape: ShapeType;
  rotation: number;
  vRot: number;
}

/**
 * [ESTUDIANTE INFORMÁTICA]
 * Red dinámica tipo constelación/plexus en movimiento continuo y fluido.
 * Puntos micro-estelares diminutos (0.8px a 1.4px) con enlaces vectoriales luminosos
 * que poseen un suave brillo celeste (glow) y respuesta táctil interactiva al cursor.
 */
export const NetworkMeshBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
      'rgba(56, 189, 248, 0.95)', // Cian institucional
      'rgba(52, 211, 153, 0.95)', // Verde esmeralda
      'rgba(251, 191, 36, 0.9)',  // Dorado espiga
      'rgba(255, 255, 255, 0.98)', // Blanco puro
    ];

    const shapes: ShapeType[] = ['circle', 'diamond', 'circle', 'circle'];

    // Cantidad equilibrada y rica (~115 a 130 figuras en resoluciones estándar)
    const particleCount = Math.min(Math.floor((width * height) / 10000), 125);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32, // Movimiento continuo, lento y relajante
        vy: (Math.random() - 0.5) * 0.32,
        radius: Math.random() * 0.6 + 0.8, // Puntos micro-estelares diminutos (0.8px a 1.4px)
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.02,
      });
    }

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const maxDist = 112;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Trazar líneas de conexión con brillo suave (micro-glow)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            // Factor de opacidad elevado a 0.38 para aportar ese toque extra de brillo solicitado
            const alpha = (1 - dist / maxDist) * 0.38;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
            ctx.lineWidth = 0.85;

            // Micro-resplandor luminoso suave para las líneas
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
            ctx.stroke();
            ctx.shadowBlur = 0; // Restaurar para mantener eficiencia y nitidez

            // Relleno poligonal tenue para tríadas cerradas
            for (let k = j + 1; k < particles.length; k++) {
              const dx2 = particles[i].x - particles[k].x;
              const dy2 = particles[i].y - particles[k].y;
              const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              if (dist2 < maxDist * 0.72) {
                const dx3 = particles[j].x - particles[k].x;
                const dy3 = particles[j].y - particles[k].y;
                const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
                if (dist3 < maxDist * 0.72) {
                  ctx.beginPath();
                  ctx.moveTo(particles[i].x, particles[i].y);
                  ctx.lineTo(particles[j].x, particles[j].y);
                  ctx.lineTo(particles[k].x, particles[k].y);
                  ctx.closePath();
                  ctx.fillStyle = `rgba(56, 189, 248, 0.025)`;
                  ctx.fill();
                }
              }
            }
          }
        }
      }

      // 2. Conexiones interactivas sutiles hacia el cursor del usuario
      if (mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < particles.length; i++) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.42;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
            ctx.lineWidth = 0.95;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(52, 211, 153, 0.5)';
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // 3. Dibujar puntos micro-estelares diminutos
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'diamond') {
          // Micro-diamante geométrico sutil
          const size = p.radius * 1.05;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size, 0);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 3;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Micro-círculo estelar
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 4;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Núcleo blanco resplandeciente diminuto
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-85" />;
};
