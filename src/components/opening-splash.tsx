/**
 * Kick-off opening screen: the pin pops up, a ball rolls in, is chipped up and lands on the centre spot
 * inside the pin, the name slides out and a green circle bursts out of the pin into the app.
 *
 * Plays once per visit (sessionStorage), on top of the page that is already loading underneath.
 * Skipped when opened as an installed app: the phone already shows its own launch screen there.
 * The inline script runs before the overlay is painted, so a repeat visit never flashes it. Tap to skip.
 */
const script = `(function(){var d=document.documentElement;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__ppInstall=e;window.dispatchEvent(new Event("pp-installable"))});
var app=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
if(app){d.dataset.splash="off";d.dataset.app="1";return}
try{if(sessionStorage.getItem("pp-splash")){d.dataset.splash="off";return}sessionStorage.setItem("pp-splash","1")}catch(e){}
function done(){d.dataset.splash="off"}
document.addEventListener("pointerdown",function f(e){if(e.target.closest&&e.target.closest(".ks")){done();document.removeEventListener("pointerdown",f)}});
setTimeout(done,3100)})()`;

export function OpeningSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <div className="ks" aria-hidden="true">
        <div className="ks-line" />
        <div className="ks-lockup">
          <div className="ks-pinbox">
            <div className="ks-tile">
              <svg viewBox="0 0 48 48">
                <ellipse cx="24" cy="43" rx="7" ry="1.8" fill="#000" opacity=".3" />
                <path d="M24 5a14 14 0 0 1 14 14c0 10-14 23-14 23S10 29 10 19A14 14 0 0 1 24 5z" fill="#fbf6ea" />
                <g fill="none" stroke="#1e5a35">
                  <rect x="16.5" y="13" width="15" height="12" rx="1.6" strokeWidth="1.8" />
                  <path d="M24 13v12" strokeWidth="1.6" />
                  <circle className="ks-spot" cx="24" cy="19" r="2.5" strokeWidth="1.6" />
                </g>
              </svg>
            </div>
            <div className="ks-ball">
              <svg viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="15" fill="#fff" stroke="#13261a" strokeWidth="1.5" />
                <path d="M16 10.5l5.2 3.8-2 6.1h-6.4l-2-6.1z" fill="#13261a" />
                <path
                  d="M16 1.5v4l-4.6 3.4M16 5.5l4.6 3.4M28.5 10.5l-4 1.4-1.8 5M2.5 11l4 1.3 1.8 5M7.5 27l2.4-3.4 4.4.2M24.5 27l-2.4-3.4-4.4.2"
                  fill="none"
                  stroke="#13261a"
                  strokeWidth="1.3"
                />
              </svg>
            </div>
            <span className="ks-ripple" />
            <span className="ks-burst" />
          </div>
          <div className="ks-clip">
            <div className="ks-word">
              Pitch<span>Pin</span>
            </div>
          </div>
        </div>
        <div className="ks-tag">Book a turf in a minute</div>
      </div>
    </>
  );
}
