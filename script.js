(() => {
  const $ = (s) => document.querySelector(s);

  // ---------- Respostas (não diferenciam maiúsculas, acentos, espaços ou pontos) ----------
  const ANSWERS = {
    initials: ["pkcl"],
    riddle: ["ruff", "ruffs", "ruffbar", "ruffsbar", "barruff", "nachos"],
    clue2: ["lendh"],
  };

  const normalize = (v) =>
    v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // ---------- Navegação entre telas ----------
  let current = $(".screen.active");

  function go(id) {
    const next = document.getElementById(id);
    if (!next || next === current) return;
    document.activeElement && document.activeElement.blur();
    current.classList.remove("active");
    current.classList.add("leaving");
    const prev = current;
    setTimeout(() => prev.classList.remove("leaving"), 900);
    next.classList.add("active");
    current = next;
  }

  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.go))
  );

  function wrong(input, feedbackEl, msg) {
    input.classList.remove("shake");
    void input.offsetWidth; // reinicia a animação
    input.classList.add("shake");
    feedbackEl.textContent = msg;
    if (navigator.vibrate) navigator.vibrate(60);
  }

  // ---------- Música de fundo ----------
  // O Safari do iPhone só permite tocar áudio após um toque, então ela começa em "Aceitar o caso".
  const music = $("#music");
  const soundBtn = $("#sound");

  function playMusic() {
    music.volume = 0.6; // ignorado no iOS (o volume é controlado pelos botões do celular)
    const p = music.play();
    if (p && p.then) p.then(() => soundBtn.classList.add("playing")).catch(() => {});
    else soundBtn.classList.add("playing");
  }

  $("#s-intro [data-go]").addEventListener("click", () => {
    playMusic();
    soundBtn.classList.add("ready");
  });

  soundBtn.addEventListener("click", () => {
    if (music.paused) playMusic();
    else { music.pause(); soundBtn.classList.remove("playing"); }
  });

  // ---------- Tela 2: revelar o quadro ----------
  const frame = $("#frame");
  const identify = $("#identify");

  frame.addEventListener("click", () => {
    if (frame.classList.contains("revealed")) return;
    frame.classList.add("revealed");
    $("#tap-hint").classList.add("gone");
    setTimeout(() => {
      identify.classList.add("show");
      requestAnimationFrame(() => identify.classList.add("visible"));
    }, 2000);
  });

  document.querySelectorAll("[data-hint]").forEach((b) =>
    b.addEventListener("click", () => document.getElementById(b.dataset.hint).classList.add("show"))
  );

  identify.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#initials");
    const fb = $("#id-feedback");
    if (ANSWERS.initials.includes(normalize(input.value))) {
      fb.textContent = "";
      go("s-riddle");
    } else {
      wrong(input, fb, "Hmm… os detalhes dizem outra coisa.");
    }
  });

  // ---------- Tela 3: charada ----------
  $("#riddle-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#riddle-input");
    const fb = $("#riddle-feedback");
    if (ANSWERS.riddle.includes(normalize(input.value))) {
      fb.textContent = "";
      go("s-clue2");
    } else {
      wrong(input, fb, "Quase. Pense no latido…");
    }
  });

  // ---------- Tela 4: objeto branco ----------
  $("#clue2-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#clue2-input");
    const fb = $("#clue2-feedback");
    if (ANSWERS.clue2.includes(normalize(input.value))) {
      fb.textContent = "";
      go("s-solved");
    } else {
      wrong(input, fb, "Não é isso. Procure com mais atenção…");
    }
  });

  // ---------- Tela 6: múltipla escolha (filme) ----------
  function setupChoice(optionsSel, feedbackSel, wrongMsg, onCorrect) {
    const box = $(optionsSel);
    const fb = $(feedbackSel);
    box.querySelectorAll(".option").forEach((opt) =>
      opt.addEventListener("click", () => {
        if (opt.hasAttribute("data-correct")) {
          opt.classList.add("right");
          box.classList.add("done");
          fb.textContent = "";
          onCorrect();
        } else {
          opt.classList.add("wrong");
          fb.textContent = wrongMsg;
          if (navigator.vibrate) navigator.vibrate(60);
        }
      })
    );
  }

  setupChoice("#movie-options", "#movie-feedback", "Hmm… sua memória pode fazer melhor.", () =>
    setTimeout(() => go("s-after-movie"), 1300)
  );

  // ---------- Tela 7: a frase + quadro escuro ----------
  const frame2 = $("#frame2");
  const quiz = $("#quote-quiz");
  const unlock = $("#quote-unlock");

  setupChoice("#quote-options", "#quote-feedback", "Filosofia demais, detetive. Pense mais perto de você…", () => {
    setTimeout(() => quiz.classList.add("collapsed"), 1100);
    setTimeout(() => {
      quiz.classList.add("gone");
      unlock.classList.add("show");
      frame2.classList.remove("locked"); // libera o toque e o brilho pulsante
    }, 1600);
  });

  frame2.addEventListener("click", () => {
    if (frame2.classList.contains("locked") || frame2.classList.contains("revealed")) return;
    frame2.classList.add("revealed");
    unlock.classList.add("done");
    setTimeout(() => $("#quote-continue").classList.add("show"), 2000);
  });

  ["#initials", "#riddle-input", "#clue2-input"].forEach((sel) =>
    $(sel).addEventListener("input", (e) => {
      e.target.classList.remove("shake");
      e.target.closest("form").querySelector(".feedback").textContent = "";
    })
  );

  // ---------- Fundo: pinceladas em redemoinho (estilo Van Gogh) ----------
  const canvas = $("#brush");
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#2d5596", "#3f6fb5", "#7fa3d4", "#1d3b73", "#f2c14e", "#e9d8a6", "#5b86c4"];
  let w, h, dpr, particles = [], t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(170, Math.floor((w * h) / 2600));
    particles = Array.from({ length: count }, spawn);
  }

  function spawn() {
    const gold = Math.random() < 0.14;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      life: 60 + Math.random() * 160,
      color: gold ? COLORS[4 + Math.floor(Math.random() * 2)] : COLORS[Math.floor(Math.random() * 4)],
      width: 1 + Math.random() * 2.2,
      speed: 0.35 + Math.random() * 0.55,
    };
  }

  // Campo de fluxo com redemoinhos suaves
  function angle(x, y) {
    const s = 0.0038;
    return (
      Math.sin(x * s + t * 0.25) * 1.6 +
      Math.cos(y * s * 1.3 - t * 0.2) * 1.6 +
      Math.sin((x + y) * s * 0.6 + t * 0.1)
    );
  }

  function frameLoop() {
    // apaga lentamente os rastros, mantendo o gradiente do body visível
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.045)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const a = angle(p.x, p.y);
      const nx = p.x + Math.cos(a) * p.speed * 2;
      const ny = p.y + Math.sin(a) * p.speed * 2;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx; p.y = ny; p.life--;
      if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) particles[i] = spawn();
    }
    ctx.globalAlpha = 1;
    t += 0.01;
    requestAnimationFrame(frameLoop);
  }

  resize();
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
  if (!reduced) requestAnimationFrame(frameLoop);
})();
