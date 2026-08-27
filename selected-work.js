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

selectedWorkSlots.forEach((slot) => {
  slot.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") switchSelectedImage(slot);
  });
});
