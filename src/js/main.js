import "../scss/main.scss";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import data from "../data/timeline.json";
import { Howl, Howler } from 'howler';
import Audio from '../assets/audio/audio.mp3';
gsap.registerPlugin(ScrollTrigger);

const config = {
  mobile: {
    width: 720,
    height: 1280,
    totalFrames: 787,
  },
  desktop: {
    width: 1920,
    height: 1080,
    totalFrames: 1573,
  },
  duration: 8000,
  baseFrameRate: 25,
  batchSize: 50, // Number of images to load simultaneously
  muted: false,
  isPlaying: [],
  unlocked: false,
  storeId: null
};

const audioBtn = document.querySelector(".audio-btn");
audioBtn.addEventListener("click", toggleMute);
const device = window.matchMedia("(max-width: 1024px) and (orientation: portrait)").matches ? "mobile" : "desktop";
const frameCount = Math.floor(config[device].totalFrames);
const frameRate = config.baseFrameRate;
const vidLength = frameCount / frameRate / 100;
const hScrollWrapper = document.querySelector(".h-scroll-wrapper");
const closeIcon = '<svg width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon flat-color"><path id="primary" d="M13.41,12l6.3-6.29a1,1,0,1,0-1.42-1.42L12,10.59,5.71,4.29A1,1,0,0,0,4.29,5.71L10.59,12l-6.3,6.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l6.29,6.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>';

class ImageLoader {
  constructor() {
    this.loadedImages = 0;
    this.targetImages = frameCount / 2; // Only need half the images
    this.elements = {
      loader: document.querySelector(".loading-overlay"),
      lvalue: document.querySelector(".loading-value"),
      lbar: document.querySelector(".loading-bar")
    };

    // Create URL array using dynamic imports
    this.frames = device === "mobile"
      ? import.meta.glob("../assets/frames/mobile/*webp", { eager: true, query: '?url', import: 'default' })
      : import.meta.glob("../assets/frames/desktop/*webp", { eager: true, query: '?url', import: 'default' });

    this.urls = this.generateUrls();
    this.imageCache = new Map(); // Cache for loaded images

    this.animateProgressBar();
  }

  generateUrls() {
    return new Array(frameCount).fill().map((_, i) => {
      const frameNumber = Math.floor(i + 1).toString().padStart(4, '0');
      return this.frames[`../assets/frames/${device}/frames__${frameNumber}.webp`];
    });
  }

  animateProgressBar() {
    // Start a continuous animation that will be synced with actual loading
    const startTime = Date.now();
    const animationDuration = 10000; // 10 seconds base animation time

    const updateAnimation = () => {

      const elapsed = Date.now() - startTime;
      const timeProgress = Math.min((elapsed / animationDuration) * 100, 95); // Cap at 95% for time-based
      const imageProgress = Math.ceil((this.loadedImages / this.targetImages) * 100);

      // Use the maximum of time-based progress and actual loading progress
      // This ensures the bar never gets behind of actual loading
      const currentProgress = Math.min(Math.max(timeProgress, imageProgress), 100);

      // Update display
      this.elements.lvalue.querySelector("span").textContent = `${Math.floor(currentProgress)}%`;

      gsap.to(this.elements.lbar, {
        width: `${currentProgress}%`,
        duration: 0.3,
        ease: "power2.out",
      });

      if (currentProgress === 100) {
        this.completeLoading();
      } else {
        requestAnimationFrame(updateAnimation);
      }
    };
    requestAnimationFrame(updateAnimation);
  }


  completeLoading() {
    document.body.style.overflow = "auto";
    gsap.timeline()
      .to(".loading-container", {
        autoAlpha: 0,
        duration: 0.3,
        delay: 0.5
      })
      .to(".loading-overlay", {
        yPercent: -100,
        duration: 0.8,
        ease: "power2.in"
      })
      .to(".loading-overlay", {
        autoAlpha: 0
      });
  }

  async loadImageBatch(urls) {
    return Promise.all(
      urls.map(url =>
        new Promise((resolve) => {
          if (this.imageCache.has(url)) {
            this.loadedImages++;
            resolve(this.imageCache.get(url));
            return;
          }

          const img = new Image();
          img.src = url;

          const handleComplete = () => {
            this.loadedImages++;
            this.imageCache.set(url, img);
            resolve(img);
          };

          img.onload = handleComplete;
          img.onerror = () => {
            handleComplete();
          };
        })
      )
    );
  }

  async preloadImages() {
    const batches = [];
    for (let i = 0; i < this.urls.length; i += config.batchSize) {
      batches.push(this.urls.slice(i, i + config.batchSize));
    }

    for (const batch of batches) {
      await this.loadImageBatch(batch);
    }
  }
}

// Initialize and start loading
const loader = new ImageLoader();
loader.preloadImages();

function imageSequence(scrollConfig) {
  let c = gsap.utils.toArray(scrollConfig.canvas)[0];
  c.width = config[device].width;
  c.height = config[device].height;
  let playhead = { frame: 0 },
    ctx = c.getContext("2d"),
    onUpdate = scrollConfig.onUpdate,
    images,
    updateImage = function () {
      ctx.drawImage(images[Math.round(playhead.frame)], 0, 0);
      onUpdate && onUpdate.call(this);
    };
  images = scrollConfig.urls.map((url, i) => {
    let img = new Image();
    img.src = url;
    i || (img.onload = updateImage);
    return img;
  });
  return gsap.to(playhead, {
    frame: images.length - 1,
    ease: "none",
    onUpdate: updateImage,
    scrollTrigger: scrollConfig.scrollTrigger,
  });
}

imageSequence({
  urls: loader.urls, // Array of image URLs
  canvas: "#video-canvas", // <canvas> object to draw images to
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "0",   // start at the very top
    end: config.duration, // end at the very bottom
    scrub: true, // important!
  }
});

gsap.to(".progress-bar", {
  scrollTrigger: {
    trigger: ".scroll-container",
    start: "0",
    end: config.duration + hScrollWrapper.getBoundingClientRect().width,
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
    end: config.duration,
    scrub: true,
    pin: true,
  },
}).set({}, {}, vidLength);

const straight = 0.442; //when to change to horizontal
const hScrollTime = 0.449; //when to change to horizontal
const bScrollTime = 0.545; //when to change to backwards

posTl.to(".timeline-content", {
  z: config.duration * (hScrollTime / vidLength), // Moves forward on the Z-axis
  ease: "none",
  duration: straight
}, 0).to(".timeline-content", {
  x: 0, // stays straight
  ease: "none",
  duration: hScrollTime - straight
}, straight).to(".timeline-content", {
  x: -380, // Moves horizontal right on the X-axis
  ease: "none",
  duration: bScrollTime - hScrollTime
}, hScrollTime).to(".timeline-content", {
  z: (config.duration * (hScrollTime / vidLength)) - 1200, // Moves backwards on the Z-axis
  ease: "none",
  duration: vidLength - bScrollTime
}, bScrollTime);


//controlling the actual text animations
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container",
    scrub: true,
    start: "0",
    end: config.duration,
    onUpdate: (self) => {
      // console.log('progress:',(self.progress * vidLength).toFixed(3))
    }
  },
}).set({}, {}, vidLength);

tl.to(".intro-overlay", { autoAlpha: 0, duration: 0.02 }, 0);

data.timelines.forEach((item) => {
  const container = document.createElement("div");
  container.classList.add("timeline-item");
  container.innerHTML = `
      <p class="timeline-item__title">${item.copy}</p>
  `;
  item.position = -item.time * 100 * frameRate * config.duration / frameCount;
  document.querySelector(".timeline-content").appendChild(container);
  gsap.set(container, { x: item.backwards ? item.x + 350 : item.x, y: item.y, z: item.horizontal ? item.position + 180 : item.backwards ? item.position + 1550 : item.position });
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

const sound = new Howl({
  src: Audio,
  preload: true,
  loop: true,
  autoplay: true,
  muted: true,
  sprite: {
    brasserie_loop: [
      0,
      15072.65306122449
    ],
    car_loop: [
      17000,
      18102.857142857145
    ],
    city_loop: [
      37000,
      20114.285714285714
    ],
    low_brasserie_loop: [
      59000,
      15098.775510204077
    ]
  },
  onunlock: () => {
    config.unlocked = true;
    sound.play(config.storeId); //used to activate the sound on unlock...
    if (config.isPlaying.length > 0) {
      config.isPlaying.forEach(id => {
        setTimeout(() => {
          sound.play(id);
          sound.fade(0, 1, 1000, id);
        }, 100);

      });
    }
  },
  onload: () => {
    console.log("Audio loaded");
  },
  onplayerror: (id, err) => {
    console.log("Audio play error", id, err);
  }
});

toggleMute();

data.audio.forEach((item, i) => {
  let id = sound.play(item.name);
  sound.pause(id);
  item.start && tl.call(toggleAudio, [id], item.start)
  item.stop && tl.call(toggleAudio, [id], item.stop);
  if (i === 0) { toggleAudio(id); config.storeId = id; }
})

function toggleAudio(id) {
  // console.log(config.isPlaying.includes(id) ? "pause" : "play", id);
  if (config.isPlaying.includes(id)) {
    const el = config.isPlaying.indexOf(id);
    config.isPlaying.splice(el, 1);
    if (!config.unlocked) return;
    sound.fade(1, 0, 100, id);
    setTimeout(() => {
      sound.pause(id);
    }, 100)
  } else {
    config.isPlaying.push(id);
    if (!config.unlocked) return;
    sound.play(id);
    sound.fade(0, 1, 100, id);
  }
}

function toggleMute() {
  config.muted = !config.muted;
  Howler.mute(config.muted);
  audioBtn.innerHTML = config.muted ? "Activar Sonido" : "Desactivar Sonido";
  audioBtn.classList.toggle("muted");
}

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
    end: () => `+=${hScrollWrapper.getBoundingClientRect().width} bottom`,
    scrub: true
  }
});


