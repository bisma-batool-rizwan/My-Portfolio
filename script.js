// =========================================================
// 1. Attract-ball background (fixed canvas behind the page)
// =========================================================
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
let width, height;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let pointer = { x: null, y: null, active: false };

const PARTICLE_COUNT = 160;
const particles = [];

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = 0;
    this.vy = 0;
    this.radius = 1.2 + Math.pow(Math.random(), 2) * 8;
  }

  update() {
    const friction = 0.94;

    if (pointer.active) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const maxDist = 240;

      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 1.1;
        const mass = this.radius / 3;
        const nx = dx / dist;
        const ny = dy / dist;
        this.vx += (nx * force) / mass;   // always attract
        this.vy += (ny * force) / mass;
      }
    }

    this.vx *= friction;
    this.vy *= friction;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -10) this.x = width + 10;
    if (this.x > width + 10) this.x = -10;
    if (this.y < -10) this.y = height + 10;
    if (this.y > height + 10) this.y = -10;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(201, 164, 92, 0.55)"; // brass, semi-transparent
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

// resolve overlaps between every pair of particles so they bump and
// separate instead of stacking on top of each other
function resolveCollisions() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = p1.radius + p2.radius;

      if (dist > 0 && dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;

        // push the two circles apart so they no longer overlap
        // (heavier / bigger particle moves less than the smaller one)
        const overlap = minDist - dist;
        const m1 = p1.radius;
        const m2 = p2.radius;
        const totalMass = m1 + m2;
        p1.x -= nx * overlap * (m2 / totalMass);
        p1.y -= ny * overlap * (m2 / totalMass);
        p2.x += nx * overlap * (m1 / totalMass);
        p2.y += ny * overlap * (m1 / totalMass);

        // exchange velocity along the collision normal so they visibly
        // "bump" — low restitution means they mostly stop rather than bounce
        const relVx = p2.vx - p1.vx;
        const relVy = p2.vy - p1.vy;
        const velAlongNormal = relVx * nx + relVy * ny;

        if (velAlongNormal < 0) {
          const restitution = 0.25;
          const impulse = (-(1 + restitution) * velAlongNormal) / (1 / m1 + 1 / m2);
          p1.vx -= (impulse * nx) / m1;
          p1.vy -= (impulse * ny) / m1;
          p2.vx += (impulse * nx) / m2;
          p2.vy += (impulse * ny) / m2;
        }
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    p.update();
  }
  resolveCollisions();
  for (const p of particles) {
    p.draw();
  }
  requestAnimationFrame(animate);
}
animate();

function setPointer(x, y, active) {
  pointer.x = x;
  pointer.y = y;
  pointer.active = active;
}
window.addEventListener("mousemove", (e) => setPointer(e.clientX, e.clientY, true));
window.addEventListener("mouseleave", () => (pointer.active = false));
window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  setPointer(t.clientX, t.clientY, true);
}, { passive: true });
window.addEventListener("touchend", () => (pointer.active = false));

// =========================================================
// 2. Skill bars fill in when scrolled into view
// =========================================================
const skillBars = document.querySelectorAll(".skill-bar");
const skillObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const fill = entry.target.querySelector(".bar-fill");
        const level = entry.target.dataset.level;
        fill.style.width = level + "%";
        skillObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);
skillBars.forEach((bar) => skillObserver.observe(bar));

// =========================================================
// 3. Contact form → Formspree (AJAX, no page reload)
// =========================================================
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  statusEl.textContent = "";
  statusEl.classList.remove("error");

  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      statusEl.textContent = "Message sent — I'll get back to you soon.";
      form.reset();
    } else {
      const result = await res.json().catch(() => null);
      throw new Error(result?.errors?.[0]?.message || "Something went wrong.");
    }
  } catch (err) {
    statusEl.textContent = "Couldn't send that. Try email or WhatsApp instead.";
    statusEl.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";
  }
});
