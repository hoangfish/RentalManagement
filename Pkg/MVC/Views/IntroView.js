import { BaseView } from './BaseView.js';
import { ROUTES, ROLES, APP_NAME } from '../../Common/constant.js';
import { icons } from './components/icons.js';

const feature = (icon, title, text) => `
  <article class="feature">
    <span class="feature-icon">${icon}</span>
    <h3>${title}</h3>
    <p>${text}</p>
  </article>`;

const steps = (items) => `<ol class="steps">${items.map((s) => `<li>${s}</li>`).join('')}</ol>`;

// Isometric room used in the hero preview
const roomSvg = `
<svg viewBox="0 0 200 165" class="room-svg" role="img" aria-label="Illustration of a 3D room model">
  <polygon points="20,110 100,70 100,10 20,50" fill="#fde8e8"/>
  <polygon points="100,70 180,110 180,50 100,10" fill="#f8cfcf"/>
  <polygon points="100,70 180,110 100,150 20,110" fill="#ececec"/>
  <polygon points="118,36 150,52 150,76 118,60" fill="#ffffff" stroke="#d32f2f" stroke-width="1.5"/>
  <polygon points="104,104 132,90 160,104 132,118" fill="#ffffff"/>
  <polygon points="104,104 132,118 132,130 104,116" fill="#d9d9d9"/>
  <polygon points="132,118 160,104 160,116 132,130" fill="#bdbdbd"/>
  <polygon points="104,104 118,97 146,111 132,118" fill="#b71c1c"/>
  <polygon points="40,106 62,95 78,103 56,114" fill="#d32f2f" opacity=".85"/>
  <polygon points="56,114 78,103 78,110 56,121" fill="#9f1c1c" opacity=".85"/>
</svg>`;

export class IntroView extends BaseView {
  title = `${APP_NAME} – Find a room, tour it in 3D`;

  render() {
    const loggedIn = this.ctx.userController.isLoggedIn();
    const actions = loggedIn
      ? `<a class="btn btn-primary" href="#${ROUTES.HOME}">Open app</a>`
      : `<a class="btn btn-ghost" href="#${ROUTES.LOGIN}">Log in</a>
         <a class="btn btn-primary" href="#${ROUTES.REGISTER}">Sign up</a>`;

    return `
      <header class="nav">
        <div class="nav-inner">
          <a class="brand" href="#${ROUTES.INTRO}"><span class="brand-mark">${icons.home(18)}</span>${APP_NAME}</a>
          <nav class="nav-links" aria-label="Sections">
            <button type="button" data-scroll="features">Features</button>
            <button type="button" data-scroll="how">How it works</button>
            <button type="button" data-scroll="landlords">For landlords</button>
          </nav>
          <div class="nav-actions">${actions}</div>
        </div>
      </header>

      <main class="intro">
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">Rooms for rent, made simple</span>
            <h1>Find a room you can <em>walk through</em> before you visit</h1>
            <p class="lead">Search around any address, filter by budget and size, then explore a 3D model built by AI from the landlord’s photos. Like it? Message the owner and agree on the details directly.</p>
            <div class="hero-cta">
              <a class="btn btn-primary btn-lg" href="#${ROUTES.REGISTER}?role=${ROLES.TENANT}">Find a room</a>
              <a class="btn btn-outline btn-lg" href="#${ROUTES.REGISTER}?role=${ROLES.LANDLORD}">List your room</a>
            </div>
            <ul class="hero-points">
              <li>${icons.pin(16)} Search by address &amp; radius</li>
              <li>${icons.cube(16)} 3D preview from photos</li>
              <li>${icons.chat(16)} Talk to owners directly</li>
            </ul>
          </div>

          <div class="hero-visual" aria-hidden="true">
            <div class="preview">
              <div class="preview-bar">${APP_NAME} – Find a room</div>
              <div class="preview-body">
                <div class="preview-card">
                  <div class="thumb">Room photo</div>
                  <div class="info">
                    <strong>Studio near Ben Thanh Market</strong>
                    <span class="muted">Studio • Long-term rental</span>
                    <span>District 1 • 0.8 km away • 28 m²</span>
                    <b class="price">4,500,000 đ/month</b>
                  </div>
                  <span class="chip">View 3D</span>
                </div>
                <div class="preview-card faded">
                  <div class="thumb">Room photo</div>
                  <div class="info">
                    <strong>Balcony room, District 4</strong>
                    <span class="muted">1 bedroom • Mezzanine</span>
                    <span>District 4 • 1.2 km away • 22 m²</span>
                    <b class="price">3,800,000 đ/month</b>
                  </div>
                  <span class="chip">View 3D</span>
                </div>
              </div>
            </div>
            <div class="float-3d">
              ${roomSvg}
              <span class="badge-3d">3D</span>
            </div>
          </div>
        </section>

        <section id="features" class="section">
          <div class="section-head">
            <h2>Everything you need to choose with confidence</h2>
            <p class="muted">One place for tenants to search and landlords to list.</p>
          </div>
          <div class="features">
            ${feature(icons.pin(24), 'Search around you', 'Enter an address or area, set a radius, your budget and the minimum size. See matching rooms on a list and on the map.')}
            ${feature(icons.cube(24), '3D room preview', 'Photos uploaded by the landlord are stitched together by AI into a 3D model, so you can look around before you go.')}
            ${feature(icons.home(24), 'Post a room in minutes', 'Landlords add their name, the room’s address, size, price and photos. That is all it takes to appear in search.')}
            ${feature(icons.chat(24), 'Talk directly', 'Happy with a room? Contact the owner and negotiate the details yourselves — no middleman.')}
          </div>
        </section>

        <section id="how" class="section alt">
          <div class="section-head">
            <h2>How it works</h2>
          </div>
          <div class="how">
            <div class="how-col">
              <h3>For tenants</h3>
              ${steps([
                'Create an account and choose <b>Rent a room</b>.',
                'Enter an address, radius and budget to see nearby rooms.',
                'Open the 3D preview, then message the owner.',
              ])}
            </div>
            <div class="how-col" id="landlords">
              <h3>For landlords</h3>
              ${steps([
                'Create an account and choose <b>Rent out a room</b>.',
                'Add your name, the room’s details and its address.',
                'Upload photos — we build the 3D model for you.',
              ])}
            </div>
          </div>
        </section>

        <section class="cta">
          <h2>Ready to find — or fill — a room?</h2>
          <div class="hero-cta center">
            <a class="btn btn-light btn-lg" href="#${ROUTES.REGISTER}?role=${ROLES.TENANT}">I’m looking for a room</a>
            <a class="btn btn-outline-light btn-lg" href="#${ROUTES.REGISTER}?role=${ROLES.LANDLORD}">I have a room to rent out</a>
          </div>
        </section>
      </main>

      <footer class="footer">
        <span>© ${APP_NAME}</span>
        <span class="footer-links">
          <a href="#${ROUTES.LOGIN}">Log in</a>
          <a href="#${ROUTES.REGISTER}">Sign up</a>
        </span>
      </footer>`;
  }

  onMount() {
    // Hash is used for routing, so section links scroll with JS instead of #anchors.
    this.$$('[data-scroll]').forEach((btn) =>
      btn.addEventListener('click', () =>
        this.$(`#${btn.dataset.scroll}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  }
}
