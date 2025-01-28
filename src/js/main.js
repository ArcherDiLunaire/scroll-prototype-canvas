import '../scss/main.scss'
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

let device = window.matchMedia("(max-width: 800px) and (orientation: portrait)").matches ? "mobile" : "desktop";
console.log("device", device);

// path needs to be hard coded literally for images to be imported by vite.
let frames;
if(device == "mobile"){
  frames = import.meta.glob("../assets/mobile/frames/*webp", { eager: true });
} else {
  frames = import.meta.glob("../assets/desktop/frames/*webp", { eager: true });
}

let frameCount = 501;
let width = device == "mobile" ? 800 : 1920;
let height = device == "mobile" ? 1422 : 1080;
// const urls = new Array(frameCount).fill().map((o, i) => `https://www.apple.com/105/media/us/airpods-pro/2019/1299e2f5_9206_4470_b28e_08307a42f19b/anim/sequence/large/01-hero-lightpass/${(i + 1).toString().padStart(4, '0')}.jpg`);
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
    // end: "max", // entire page
    scrub: true, // important!
  }
});

var targets = document.querySelectorAll(".animate");

targets.forEach(target => {
  gsap.timeline({
    defaults: {duration: 1},
    scrollTrigger: {
      trigger: target,
      // markers: true,
      scrub: true,
      pin: true
    }
  })
  .fromTo(target,{ 
      y: target.classList.contains("top") ? 30 : 0,
      x: target.classList.contains("left") ? -30 : 
      target.classList.contains("right") ? 30  : 0,
    }, {
      y: target.classList.contains("top") ? -30 : 0,
      x: target.classList.contains("left") ? 30 :
      target.classList.contains("right") ? -30 : 0,
    })
  .from(target, {opacity: 0, duration: 0.2}, 0)
  .add( (target.classList.contains("w-line")) ? animateLine(target) : "", "<")
  .to(target, {opacity: 0, duration: 0.2}, 0.8)
});

function animateLine(target) {
  const line = target.querySelector('.line');
  gsap.set(line, {scaleY: 0.2});
  gsap.to(line, {scaleY: 1, duration: 2, ease: "power3.out", scrollTrigger: {
    trigger: target,
    toggleActions: "restart pause restart pause",
    // markers: true,
    pin: true
  }});
}