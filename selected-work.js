const selectedWorkImages = [
  {
    src: "./assets/integration/gen-garden/images/gen_main.jpg",
    alt: "Gen Garden physical installation",
    href: "./integration/gen-garden/",
  },
  
  {
    src: "./assets/design/fermat/images/fermat_main.jpg",
    alt: "Fermat continuous filling paths",
    href: "./design/fermat/",
  },
  {
    src: "./assets/integration/cvae-truss-morphologies/images/truss_main.jpg",
    alt: "CVAE-generated truss morphologies",
    href: "./integration/cvae-truss-morphologies/",
  },
  {
    src: "./assets/integration/light-sculpture/images/light_main.jpg",
    alt: "Interactive light sculpture",
    href: "./integration/light-sculpture/",
  },
  {
    src: "./assets/integration/fabrication-studies/images/wave/wave_main.jpg",
    alt: "Robotic fabrication study",
    href: "./integration/fabrication-studies/",
  },
];

const selectedWorkSlots = [...document.querySelectorAll(".selected-image")];
const autoplayDelay = 5000;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const autoplayStates = new Map(
  selectedWorkSlots.map((slot) => [
    slot,
    {
      timer: null,
      isVisible: typeof IntersectionObserver === "undefined",
      isInteracting: false,
    },
  ]),
);

selectedWorkImages.forEach(({ src }) => {
  const preload = new Image();
  preload.src = src;
  if (preload.decode) preload.decode().catch(() => {});
});

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function waitForImage(image) {
  if (image.complete) {
    return image.naturalWidth ? Promise.resolve() : Promise.reject(new Error("Image failed to load"));
  }

  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

function waitForOpacityTransition(image) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      image.removeEventListener("transitionend", handleTransitionEnd);
      resolve();
    };
    const handleTransitionEnd = (event) => {
      if (event.propertyName === "opacity") finish();
    };

    image.addEventListener("transitionend", handleTransitionEnd);
    window.setTimeout(finish, 2200);
  });
}

async function switchSelectedImage(slot) {
  const visibleSources = new Set(
    selectedWorkSlots
      .filter((otherSlot) => otherSlot !== slot)
      .map((otherSlot) => otherSlot.querySelector("img:last-of-type").getAttribute("src")),
  );
  const currentImage = slot.querySelector("img:last-of-type");
  const currentSource = currentImage.getAttribute("src");
  const choices = selectedWorkImages.filter(
    ({ src }) => src !== currentSource && !visibleSources.has(src),
  );

  if (!choices.length || slot.classList.contains("is-switching")) return;

  const nextImage = choices[Math.floor(Math.random() * choices.length)];
  slot.classList.add("is-switching");

  const incomingImage = new Image();
  incomingImage.className = "selected-image-next";
  incomingImage.alt = nextImage.alt;
  incomingImage.src = nextImage.src;

  try {
    await waitForImage(incomingImage);
    if (incomingImage.decode) await incomingImage.decode();

    slot.href = nextImage.href;
    slot.setAttribute("aria-label", `Open ${nextImage.alt}`);
    slot.append(incomingImage);

    await nextFrame();
    await nextFrame();
    const transitionFinished = waitForOpacityTransition(incomingImage);
    currentImage.classList.add("is-leaving");
    incomingImage.classList.add("is-visible");

    await transitionFinished;
    await nextFrame();
    currentImage.remove();
    incomingImage.classList.remove("selected-image-next", "is-visible");
  } catch {
    incomingImage.remove();
  } finally {
    slot.classList.remove("is-switching");
  }
}

function stopAutoplay(slot) {
  const state = autoplayStates.get(slot);
  if (!state || state.timer === null) return;

  window.clearTimeout(state.timer);
  state.timer = null;
}

function canAutoplay(slot) {
  const state = autoplayStates.get(slot);
  return (
    state &&
    !reducedMotionQuery.matches &&
    !document.hidden &&
    state.isVisible &&
    !state.isInteracting
  );
}

function scheduleAutoplay(slot) {
  stopAutoplay(slot);
  if (!canAutoplay(slot)) return;

  const state = autoplayStates.get(slot);
  state.timer = window.setTimeout(async () => {
    state.timer = null;
    await switchSelectedImage(slot);
    scheduleAutoplay(slot);
  }, autoplayDelay);
}

async function switchAndRestartAutoplay(slot) {
  stopAutoplay(slot);
  await switchSelectedImage(slot);
  scheduleAutoplay(slot);
}

selectedWorkSlots.forEach((slot) => {
  slot.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "touch") return;
    switchAndRestartAutoplay(slot);
  });

  slot.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    autoplayStates.get(slot).isInteracting = true;
    stopAutoplay(slot);
  });

  const resumeAfterTouch = (event) => {
    if (event.pointerType !== "touch") return;
    autoplayStates.get(slot).isInteracting = false;
    scheduleAutoplay(slot);
  };

  slot.addEventListener("pointerup", resumeAfterTouch);
  slot.addEventListener("pointercancel", resumeAfterTouch);

  slot.addEventListener("focus", () => {
    autoplayStates.get(slot).isInteracting = true;
    stopAutoplay(slot);
  });

  slot.addEventListener("blur", () => {
    autoplayStates.get(slot).isInteracting = false;
    scheduleAutoplay(slot);
  });
});

if (typeof IntersectionObserver !== "undefined") {
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const state = autoplayStates.get(entry.target);
        state.isVisible = entry.isIntersecting;

        if (state.isVisible) scheduleAutoplay(entry.target);
        else stopAutoplay(entry.target);
      });
    },
    { threshold: 0.1 },
  );

  selectedWorkSlots.forEach((slot) => visibilityObserver.observe(slot));
} else {
  selectedWorkSlots.forEach(scheduleAutoplay);
}

document.addEventListener("visibilitychange", () => {
  selectedWorkSlots.forEach((slot) => {
    if (document.hidden) stopAutoplay(slot);
    else scheduleAutoplay(slot);
  });
});

reducedMotionQuery.addEventListener("change", () => {
  selectedWorkSlots.forEach((slot) => {
    if (reducedMotionQuery.matches) stopAutoplay(slot);
    else scheduleAutoplay(slot);
  });
});
