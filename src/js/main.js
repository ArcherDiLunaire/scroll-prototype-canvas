import "../scss/main.scss";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import data from "../data/timeline.json";
gsap.registerPlugin(ScrollTrigger);
const closeIcon = '<svg width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon flat-color"><path id="primary" d="M13.41,12l6.3-6.29a1,1,0,1,0-1.42-1.42L12,10.59,5.71,4.29A1,1,0,0,0,4.29,5.71L10.59,12l-6.3,6.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l6.29,6.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>';
let device = window.matchMedia("(max-width: 800px) and (orientation: portrait)").matches ? "mobile" : "desktop";
//overwrite for testing
device = "desktop";
console.log("device", device);

// path needs to be hard coded literally for images to be imported by vite.
let frames;
if (device == "mobile") {
  frames = import.meta.glob("../assets/mobile/frames/*webp", { eager: true });
} else {
  frames = import.meta.glob("../assets/desktop/frames/*webp", { eager: true });
}

let duration = 5000;
let frameCount = 953;
let frameRate = 25;
let width = device == "mobile" ? 800 : 1920;
let height = device == "mobile" ? 1422 : 1080;
const urls = new Array(frameCount).fill().map((o, i) => frames[`../assets/${device}/frames/frames__${(i + 1).toString().padStart(4, '0')}.webp`].default);

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
    scrollTrigger: config.scrollTrigger
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

console.log(data);

gsap.to(".timeline-content", {
  scrollTrigger: {
      trigger: ".scroll-container",
      start: '0',
      end: duration,
      scrub: true, // Smooth movement
      pin: true,
  },
  z: duration, // Moves forward on the Z-axis
  ease: "none",
});

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container",
    scrub: true,
    start: "0",
    end: duration,
  },
}).set({}, {}, frameCount/frameRate/100);

const delay = 0.02;

data.timelines.forEach((item) => {
  const container = document.createElement("div");
  container.classList.add("timeline-item");
  container.innerHTML = `
      <p class="timeline-item__title">${item.copy}</p>
  `;
  item.position = item.time*100*frameRate*duration/frameCount;
  document.querySelector(".timeline-content").appendChild(container);
  gsap.set(container, { x: item.x, y: item.y, z: -item.position });
  tl.from(container, { opacity: 0, duration: 0.02 }, item.time)
  .to(container, { opacity: 0, duration: 0.02 }, item.time + delay);
});

data.stickers.forEach((item) => {
  const container = document.createElement("span");
  container.classList.add("sticker-item");
  container.innerHTML = `
      <button class="close-button" style="background-color:${item.color}" >${closeIcon}</button>
      <p class="sticker-item__title">${item.copy}</p>
  `;
  document.querySelector(".sticker-content").appendChild(container);
  gsap.set(container, { x: item.x, y: item.y - 30});
  tl.from(container, { y: item.y, opacity: 0, duration: 0.005 }, item.time)
    .to(container, { y: item.y, opacity: 0, duration: 0.005 }, item.time + delay)
});

const closeButtons = document.querySelectorAll(".close-button");
closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    gsap.to(button.parentElement, {
      opacity: 0, 
      duration: 0.1,
      onComplete: () => button.parentElement.classList.add("hidden") 
    });
  });
});