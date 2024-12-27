const { existsSync } = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { JSDOM } = require("jsdom");
const YTDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YTDlpWrap();

async function downloadChapter(chapter, dest, cb) {
    if (existsSync(dest)) return; 
    const html = await fetch(chapter).then(r => r.text());
    const { document } = new JSDOM(html).window;
    document.querySelectorAll("[free=\"\"]").forEach(el => el.setAttribute("free", true))

    const videoPlayer = document.querySelector("video-player");
    if (!videoPlayer) {
        return;
    }
    videoPlayer.setAttribute("free", true);

    // oldmethod_vimeo = atob(document.querySelector("global-data").getAttribute("vimeo")
    function decodeAndProcess(encodedString) {
        try {
            const decoded = atob(encodedString);
            if (decoded.includes('=')) {
              // debugger
              const parts = decoded.split('=').map(part => part.trim());
               for (let part of parts) {
                  let decodedPart = atob(part);
                  if (decodedPart.includes("courses")) {
                      return {
                          Decoded: Number(decodedPart.split('/').at(-1))
                      };
                  }
              }}
            let vid = atob(decoded).split('\u0088')[0].split('/').at(-1);
            return {
                Decoded: Number(vid)
            };
            } catch (error) {
                return {
                    error: "Invalid encoded input",
                    details: error.message
                };
            }
        }
    const vimeoId = decodeAndProcess(document.querySelector("global-data").getAttribute("vimeo")).Decoded;
    const youtubeId = atob(document.querySelector("global-data").getAttribute("youtube"));
    if (!vimeoId && !youtubeId) return;

    // Youtube video
    if (youtubeId) {
        return new Promise((resolve, reject) => {
            ytDlpWrap
                .exec([
                    `https://youtube.com/watch?v=${youtubeId}`,
                    "-o",
                    dest,
                    "-f",
                    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                ])
                .on("progress", cb)
                .on("error", (err)=>reject(err))
                .on("close", ()=>resolve())
        });
    };

    // Vimeo video
    const src = (await fetch(`https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F${vimeoId}&id=${vimeoId}`).then(r => r.json())).html.split("src=\"")[1].split("\"")[0];

    return new Promise((resolve, reject) => {
        ytDlpWrap
            .exec([
                "--referer",
                "https://fireship.io",
                src,
                "-o",
                dest
            ])
            .on("progress", cb)
            .on("error", (err)=>reject(err))
            .on("close", ()=>resolve())
    });
};

module.exports = downloadChapter;
