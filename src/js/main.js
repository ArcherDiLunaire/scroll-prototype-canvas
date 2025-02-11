import "../scss/main.scss";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import data from "../data/timeline.json";
gsap.registerPlugin(ScrollTrigger);

const hScrollWrapper = document.querySelector(".h-scroll-wrapper")
const hScrollWrapperWidth = hScrollWrapper.getBoundingClientRect().width;

const loader = document.querySelector(".loading-overlay");
const lvalue = loader.querySelector(".loading-value");
const lbar = loader.querySelector(".loading-bar");

const closeIcon = '<svg width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon flat-color"><path id="primary" d="M13.41,12l6.3-6.29a1,1,0,1,0-1.42-1.42L12,10.59,5.71,4.29A1,1,0,0,0,4.29,5.71L10.59,12l-6.3,6.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l6.29,6.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>';

let device = window.matchMedia("(max-width: 1024px) and (orientation: portrait)").matches ? "mobile" : "desktop";
console.log("device", device);

// path needs to be hard coded literally for images to be imported by vite.
let frames;
if (device == "mobile") {
  frames = import.meta.glob("../assets/frames/mobile/*webp", { eager: true });
} else {
  frames = import.meta.glob("../assets/frames/desktop/*webp", { eager: true });
}

const reducer = device == "mobile" ? 1.5 : 1; //1, 1.5, 2 ? //reduces the amount of images loaded (ie the framerate)
let loadedImages = 0;
let duration = 8000;
let frameCount = Math.floor(1300 / reducer);
let frameRate = Math.floor(25 / reducer);
const vidLength = frameCount / frameRate / 100;
let width = device == "mobile" ? 1080 : 2400;
let height = device == "mobile" ? 1920 : 1350;

const urls = new Array(frameCount).fill().map((o, i) => frames[`../assets/frames/${device}/frames__${Math.ceil(i * reducer + 1).toString().padStart(4, '0')}.webp`].default);

const updateProgress = () => {
  let loading = Math.ceil(((loadedImages) / (frameCount / 2)) * 100);

  if (loading <= 100) {
    lvalue.querySelector("span").textContent = loading + "%";

    gsap.to(lbar, {
      width: `${loading}%`,
      duration: 0.3,
      ease: "power2.out",
    });
  }

  if (loading === 100) {
    document.body.style.overflow = "auto";
    gsap.timeline().to(".loading-container", {
      autoAlpha: 0,
      duration: 0.3,
      delay: 0.5,
    }).to(".loading-overlay", {
      yPercent: -100,
      duration: 0.8,
      ease: "power2.in",
    }).to(".loading-overlay", {
      autoAlpha: 0,
    })
  }
};

const preloadImages = () => {
  return Promise.all(
    urls.map((path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
          loadedImages++;
          updateProgress();
          resolve();
        };
        img.onerror = () => {
          console.error(`Failed to load: ${path}`);
          loadedImages++;
          updateProgress();
          resolve();
        };
      });
    })
  );
};

preloadImages();

function imageSequence(config) {
  let c = gsap.utils.toArray(config.canvas)[0];
  c.width = width;
  c.height = height;
  let playhead = { frame: 0 },
    ctx = c.getContext("2d"),
    onUpdate = config.onUpdate,
    images,
    updateImage = function () {
      ctx.drawImage(images[Math.round(playhead.frame)], 0, 0);
      onUpdate && onUpdate.call(this);
      // console.log("frame", playhead.frame);
    };
  images = config.urls.map((url, i) => {
    let img = new Image();
    img.src = url;
    i || (img.onload = updateImage);
    return img;
  });
  return gsap.to(playhead, {
    frame: images.length - 1,
    ease: "none",
    onUpdate: updateImage,
    scrollTrigger: config.scrollTrigger,
  });
}

imageSequence({
  urls, // Array of image URLs
  canvas: "#video-canvas", // <canvas> object to draw images to
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "0",   // start at the very top
    end: duration, // end at the very bottom
    scrub: true, // important!
  }
});

gsap.to(".progress-bar", {
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "0",
    end: duration + hScrollWrapperWidth,
    scrub: true
  },
  width: "100%",
  ease: "none"
});

//controlling the continuous camera position on the z-axis
const posTl = gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container",
    start: '0',
    end: duration,
    scrub: true,
    pin: true,
  },
}).set({}, {}, vidLength);

const hScrollTime = 0.485;

posTl.to(".timeline-content", {
  z: duration * (hScrollTime / vidLength), // Moves forward on the Z-axis
  ease: "none",
  duration: hScrollTime
}, 0).to(".timeline-content", {
  x: -300, // Moves right on the X-axis
  ease: "none",
  duration: vidLength - hScrollTime
}, hScrollTime);


//controlling the actual text animations
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container",
    scrub: true,
    start: "0",
    end: duration,
  },
}).set({}, {}, vidLength);

tl.to(".intro-overlay", { autoAlpha: 0, duration: 0.02 }, 0);

data.timelines.forEach((item) => {
  const container = document.createElement("div");
  container.classList.add("timeline-item");
  container.innerHTML = `
      <p class="timeline-item__title">${item.copy}</p>
  `;
  item.position = item.horizontal ? (item.time - 0.016) * 100 * frameRate * duration / frameCount : item.time * 100 * frameRate * duration / frameCount;
  document.querySelector(".timeline-content").appendChild(container);
  gsap.set(container, { x: item.x, y: item.y, z: -item.position });
  tl.from(container, { opacity: 0, duration: 0.02 }, item.time)
    .to(container, { opacity: 0, duration: 0.01 }, item.time + 0.02);
});

data.stickers.forEach((item) => {
  const container = document.createElement("span");
  container.classList.add("sticker-item");
  container.innerHTML = `
      <button class="close-button" style="background-color:${item.color}" >${closeIcon}</button>
      <p class="sticker-item__title">${item.copy}</p>
  `;
  document.querySelector(".sticker-content").appendChild(container);
  gsap.set(container, { x: item.x, y: item.y - 30 });
  tl.from(container, { y: item.y, autoAlpha: 0, duration: 0.01 }, item.time)
    .to(container, { y: item.y, autoAlpha: 0, duration: 0.01 }, item.time + 0.02)
});

const closeButtons = document.querySelectorAll(".close-button");
closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    gsap.to(button.parentElement, {
      autoAlpha: 0,
      duration: 0.1,
      onComplete: () => button.parentElement.classList.add("hidden")
    });
  });
});

gsap.to(
  hScrollWrapper, {
  x: 0,
  ease: "none",
  scrollTrigger: {
    pin: ".fixed",
    trigger: ".fixed",
    start: "left left",
    end: () => `+=${hScrollWrapperWidth} bottom`,
    scrub: true
  }
});

gsap.to(
  ".end-overlay", {
  opacity: 1,
  ease: "none",
  duration: 0.2,
  scrollTrigger: {
    trigger: ".end-overlay",
    start: "100% 70%",
    end: "100% 40%",
    scrub: true,
    markers: true
  }
})

