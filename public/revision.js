const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches;
let manualMotionChoice = false;
const motionToggle = document.querySelector('#motion-toggle');
const heroProcess = document.querySelector('#hero-process');
let flowVisible = true;
let flowPhase = 0;
const processMessages = [
  'Cada consulta entra a un proceso claro.',
  'El equipo sabe a quién seguir y qué hacer.',
  'La venta y el cobro comparten contexto.',
  'Los datos ayudan a decidir el próximo paso.'
];

function applyMotionState() {
  document.body.classList.toggle('motion-paused', motionPaused);
  document.documentElement.classList.toggle('motion-stopped', motionPaused);
  if (motionPaused) document.getAnimations().forEach(animation => animation.cancel());
  motionToggle.setAttribute('aria-pressed', String(!motionPaused));
  motionToggle.setAttribute('aria-label', motionPaused ? 'Activar animaciones' : 'Pausar animaciones');
  document.querySelector('#motion-label').textContent = motionPaused ? 'Activar movimiento' : 'Pausar movimiento';
  motionToggle.querySelector('.motion-icon').textContent = motionPaused ? '▶' : 'Ⅱ';
  if (motionPaused) document.querySelectorAll('.motion-reveal').forEach(item => item.classList.add('is-revealed'));
}
motionToggle.addEventListener('click', () => { manualMotionChoice = true; motionPaused = !motionPaused; applyMotionState(); });
motionPreference.addEventListener('change', event => {
  if (event.matches || !manualMotionChoice) { motionPaused = event.matches; applyMotionState(); }
});
applyMotionState();
document.body.classList.add('motion-ready');

setInterval(() => {
  if (motionPaused || !flowVisible || document.hidden) return;
  flowPhase = (flowPhase + 1) % processMessages.length;
  heroProcess.className = `hero-process phase-${flowPhase}`;
  heroProcess.querySelectorAll('.process-node').forEach((node, index) => node.classList.toggle('is-current', index === flowPhase));
  document.querySelector('#process-step').textContent = `0${flowPhase + 1} / 04`;
  const result = document.querySelector('#process-result');
  result.textContent = processMessages[flowPhase];
  result.animate([{ opacity: .2, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'ease-out' });
}, 3300);

const skillContent = {
  systems: {
    label: 'CRM Y ERP CON ODOO', title: 'De consultas dispersas\na un equipo conectado.',
    description: 'Conecto la gestión de clientes con ventas, productos, cobros y tareas. Mi trabajo abarca todo el recorrido:',
    stages: [
      ['Diseñar', 'Entender la operación y ordenar procesos, responsabilidades y datos.'],
      ['Construir', 'Configurar Odoo, desarrollar funciones e integrar las herramientas.'],
      ['Gestionar', 'Acompañar al equipo, ajustar reglas y mejorar el sistema con el uso.']
    ], link: '#caso-crm', linkText: 'Ver un ejemplo en Mundos E'
  },
  automation: {
    label: 'AUTOMATIZACIÓN, CAMPAÑAS Y DATOS', title: 'Menos tareas repetidas.\nMás información para decidir.',
    description: 'Conecto las herramientas para que los mensajes, los cobros y la información comercial formen parte del mismo proceso.',
    stages: [
      ['Conectar', 'Integrar Odoo con WhatsApp, Mercado Pago y el campus educativo.'],
      ['Automatizar', 'Crear recordatorios, seguimientos y reglas con control del equipo.'],
      ['Entender', 'Construir tableros y proyecciones que permitan revisar qué está pasando.']
    ], link: '#caso-analytics', linkText: 'Ver los tableros y sus usos'
  },
  web: {
    label: 'DISEÑO Y DESARROLLO WEB', title: 'Tu idea, bien contada.\nTu web, lista para usarse.',
    description: 'Trabajo la experiencia completa: qué necesita comunicar un negocio, cómo se ve y qué tiene que poder hacer el sitio.',
    stages: [
      ['Definir', 'Ordenar el objetivo, las secciones, la identidad y los textos.'],
      ['Desarrollar', 'Construir una web adaptable a cada pantalla y conectar sus funciones.'],
      ['Evolucionar', 'Publicar, revisar y mejorar el sitio a medida que el proyecto crece.']
    ], link: '#webs', linkText: 'Explorar las webs de Pax Media'
  },
  teaching: {
    label: 'DOCENCIA EN DESARROLLO WEB CON IA', title: 'De “tengo una idea”\na “sé cómo construirla”.',
    description: 'Enseño a crear proyectos web con IA, combinando estrategia, diseño y práctica. La herramienta ayuda; el criterio se entrena.',
    stages: [
      ['Pensar', 'Elegir un objetivo y convertirlo en un proyecto con alcance claro.'],
      ['Crear', 'Trabajar identidad, contenido y construcción con Claude Code.'],
      ['Revisar', 'Iterar, adaptar a móvil y aprender a publicar el sitio.']
    ], link: '#docencia', linkText: 'Conocer mi trabajo docente'
  }
};
const skillTabs = [...document.querySelectorAll('[data-skill]')];
const skillPanel = document.querySelector('#skill-panel');
function selectSkill(tab, focus = false) {
  const item = skillContent[tab.dataset.skill];
  skillTabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  skillPanel.setAttribute('aria-labelledby', tab.id);
  skillPanel.dataset.skill = tab.dataset.skill;
  document.querySelector('#skill-panel-tag').textContent = item.label;
  document.querySelector('#skill-panel-title').textContent = item.title;
  document.querySelector('#skill-panel-description').textContent = item.description;
  const journey = document.querySelector('#skill-journey');
  journey.replaceChildren(...item.stages.map(([title, description], index) => {
    const article = document.createElement('article');
    const number = document.createElement('span'); number.textContent = `0${index + 1}`;
    const heading = document.createElement('h4'); heading.textContent = title;
    const text = document.createElement('p'); text.textContent = description;
    article.append(number, heading, text); return article;
  }));
  const link = document.querySelector('#skill-example');
  link.href = item.link;
  const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
  link.replaceChildren(document.createTextNode(item.linkText + ' '), arrow);
  skillPanel.classList.remove('is-switching');
  if (!motionPaused) { void skillPanel.offsetWidth; skillPanel.classList.add('is-switching'); }
  if (focus) tab.focus({ preventScroll: true });
}
skillTabs.forEach(tab => {
  tab.addEventListener('click', () => selectSkill(tab));
  tab.addEventListener('keydown', event => {
    const index = skillTabs.indexOf(tab); let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % skillTabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + skillTabs.length - 1) % skillTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = skillTabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectSkill(skillTabs[next], true); }
  });
});
document.querySelector('#skill-example').addEventListener('click', event => {
  const target = document.querySelector(event.currentTarget.getAttribute('href'));
  const details = target?.closest('details');
  if (details) details.open = true;
});

if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    flowVisible = entries[0].isIntersecting;
    heroProcess.classList.toggle('is-offscreen', !flowVisible);
  }, { threshold: .08 }).observe(heroProcess);
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); revealObserver.unobserve(entry.target); }
  }), { threshold: .06, rootMargin: '0px 0px -22px 0px' });
  document.querySelectorAll('.section-heading, .skills-layout, .solution-card, .pax-card, .teaching-board, .evidence-item, .about-copy, .contact-grid').forEach((element, index) => {
    element.classList.add('motion-reveal');
    element.style.setProperty('--reveal-delay', `${index % 3 * 70}ms`);
    if (motionPaused) element.classList.add('is-revealed'); else revealObserver.observe(element);
  });
}
document.querySelectorAll('[data-pax-filter]').forEach(button => button.addEventListener('click', () => {
  if (motionPaused) return;
  document.querySelectorAll('.pax-project:not([hidden])').forEach((card, index) => card.animate([
    { opacity: .15, transform: 'translateY(22px) scale(.985)' }, { opacity: 1, transform: 'none' }
  ], { duration: 500, delay: Math.min(index, 6) * 45, easing: 'cubic-bezier(.2,.7,.2,1)' }));
}));
document.querySelector('#more-projects').addEventListener('toggle', event => {
  if (event.currentTarget.open) event.currentTarget.querySelectorAll('.motion-reveal').forEach(item => item.classList.add('is-revealed'));
});
