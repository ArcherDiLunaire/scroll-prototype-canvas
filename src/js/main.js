import "../scss/main.scss";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import data from "../data/timeline.json";
gsap.registerPlugin(ScrollTrigger);

const config = {
  mobile: {
    width: 1080,
    height: 1920,
    reducer: 1.5
  },
  desktop: {
    width: 2400,
    height: 1350,
    reducer: 1.5
  },
  duration: 8000,
  totalFrames: 1625,
  baseFrameRate: 25,
  batchSize: 10 // Number of images to load simultaneously
};

const device = window.matchMedia("(max-width: 1024px) and (orientation: portrait)").matches ? "mobile" : "desktop";
const frameCount = Math.floor(config.totalFrames / config[device].reducer);
const frameRate = config.baseFrameRate / config[device].reducer;
const vidLength = frameCount / frameRate / 100;
const hScrollWrapper = document.querySelector(".h-scroll-wrapper");
const closeIcon = '<svg width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="icon flat-color"><path id="primary" d="M13.41,12l6.3-6.29a1,1,0,1,0-1.42-1.42L12,10.59,5.71,4.29A1,1,0,0,0,4.29,5.71L10.59,12l-6.3,6.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L12,13.41l6.29,6.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42Z"></path></svg>';

class ImageLoader {
  constructor() {
    this.startTime = performance.now();
    this.loadedImages = 0;
    this.elements = {
      loader: document.querySelector(".loading-overlay"),
      lvalue: document.querySelector(".loading-value"),
      lbar: document.querySelector(".loading-bar")
    };

    // Create URL array using dynamic imports
    this.frames = device === "mobile" 
      ? import.meta.glob("../assets/frames/mobile/*webp", { eager: true })
      : import.meta.glob("../assets/frames/desktop/*webp", { eager: true });

    this.urls = this.generateUrls();
    this.imageCache = new Map(); // Cache for loaded images
  }

  generateUrls() {
    return new Array(frameCount).fill().map((_, i) => {
      const frameNumber = Math.floor(i * config[device].reducer + 1).toString().padStart(4, '0');
      return this.frames[`../assets/frames/${device}/frames__${frameNumber}.webp`].default;
    });
  }

  updateProgress() {
    const loading = Math.ceil((this.loadedImages / (frameCount / 2)) * 100);
    
    if (loading <= 100) {
      this.elements.lvalue.querySelector("span").textContent = `${loading}%`;
      
      gsap.to(this.elements.lbar, {
        width: `${loading}%`,
        duration: 0.3,
        ease: "power2.out"
      });
    }

    if (loading === 100) {
      this.completeLoading();
    }
  }

  completeLoading() {
    const endTime = performance.now();
    console.log(`Total loading time: ${(endTime - this.startTime) / 1000} seconds`);
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
            this.updateProgress();
            resolve(this.imageCache.get(url));
            return;
          }

          const img = new Image();
          img.src = url;
          
          const handleComplete = () => {
            this.loadedImages++;
            this.updateProgress();
            this.imageCache.set(url, img);
            resolve(img);
          };

          img.onload = handleComplete;
          img.onerror = () => {
            console.error(`Failed to load: ${url}`);
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
      // console.log("frame", playhead.frame);
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

const hScrollTime = 0.455; //change to horizontal
const bScrollTime = 0.545; //change to backwards

posTl.to(".timeline-content", {
  z: config.duration * (hScrollTime / vidLength), // Moves forward on the Z-axis
  ease: "none",
  duration: hScrollTime
}, 0).to(".timeline-content", {
  x: -400, // Moves right on the X-axis
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
  gsap.set(container, { x: item.backwards ? item.x + 350 : item.x , y: item.y, z: item.horizontal ? item.position + 200 : item.backwards ? item.position + 1450 : item.position});
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
    end: () => `+=${hScrollWrapper.getBoundingClientRect().width} bottom`,
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
    start: "100% 80%",
    end: "100% 50%",
    scrub: true,
  }
})

