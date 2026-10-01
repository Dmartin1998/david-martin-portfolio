const cases = {
  analytics: {
    number: '03', category: 'Analítica · Producto', title: 'Una interfaz para entender la operación.',
    status: 'Implementación documentada',
    intro: 'Tableros nativos en Odoo que conectan marketing, ventas y educación, con criterios de lectura compartidos y controles por rol.',
    tags: ['Odoo', 'OWL', 'Chart.js', 'Python'],
    problem: 'Comparar objetivos, resultados y actividad requería reunir información de distintas partes de la operación. Los equipos necesitaban una lectura común y vistas adecuadas a su trabajo.',
    intervention: ['Interfaz con nueve áreas de análisis: General, Comercial, Proyección, Asesores, Marketing, Orgánico, Educación, Web y Asesor IA.', 'Filtros compartidos, comparación de ediciones, embudos y seguimiento comercial.', 'Integración de fuentes educativas, web y de marketing, con alcance según el rol.'],
    role: 'Diseño de producto, desarrollo e iteración funcional. El historial registra contribuciones de David desde la primera versión y cambios posteriores guiados por necesidades del equipo.',
    result: 'Nueve áreas de análisis implementadas en una interfaz integrada. El código y la documentación histórica respaldan la evolución del tablero y sus controles de acceso.',
    limit: 'Alcance verificado en código y documentación hasta el 29/09/2026. No se publica una medición de impacto en ventas ni una captura actual de producción.',
    sources: ['Código de Analytics: definición de pestañas y menús.', 'Historial de implementación de junio a septiembre de 2026.', 'Documentación funcional de Analytics y registro de validación del 15/09/2026.']
  },
  campaigns: {
    number: '02', category: 'ERP · Operaciones', title: 'De una edición a un catálogo consistente.',
    status: 'Evolución documentada · 18/09/2026',
    intro: 'Un flujo integrado para preparar los productos de cada edición en tres empresas, configurar su atribución analítica y publicar el producto del canal web.',
    tags: ['Odoo 17', 'Python', 'Multiempresa', 'XML'],
    problem: 'Campañas, ediciones y productos necesitaban una referencia operativa coherente. Preparar un nuevo programa partía de un formulario vacío y de pasos manuales.',
    intervention: ['Asistente para copiar una edición anterior o iniciar un programa nuevo, con imagen obligatoria y controles de consistencia.', 'Preparación de productos para tres empresas, reutilizando registros y configurando su cuenta y distribución analítica.', 'Publicación automática de productos nuevos del canal web. Conservación del estado de publicación de los existentes y de las demás empresas.'],
    role: 'Desarrollo y evolución funcional de Campaign Manager, con dirección de implementación y colaboración del equipo y herramientas de IA.',
    result: 'Flujo de catálogo multicompañía implementado y evolucionado el 18/09/2026. La evidencia posterior registra ejecución del asistente y ajustes de imagen, atribución analítica y publicación selectiva.',
    limit: 'La publicación automática aplica a productos nuevos del canal web; no fuerza la publicación de existentes ni de otras empresas. No se atribuye ahorro de tiempo sin una medición.',
    sources: ['Revisión e implementación del catálogo del 17/09/2026.', 'Evolución del 18/09/2026: imagen, plan analítico y publicación selectiva.', 'Código, historial y registro de ejecución del asistente contrastados con el trabajo en Claude.']
  },
  projections: {
    number: '06', category: 'Datos · Planificación', title: 'Proyectar también es saber revisar.',
    status: 'Motor base implementado · evolución documentada',
    intro: 'Proyecciones comerciales por escenarios, apoyadas en históricos por programa, curvas de venta y supuestos revisables, con comparación entre lo esperado y lo observado.',
    tags: ['Odoo', 'Python', 'Escenarios', 'Históricos comerciales'],
    problem: 'Planificar requería conectar el historial comercial y el comportamiento de ventas de cada programa con supuestos explícitos para distintos escenarios.',
    intervention: ['Motor base con escenarios apoyados en históricos por programa y curvas de ventas.', 'Recalibración y revisión de supuestos para acompañar la evolución de las ediciones.', 'Evaluación de una extensión adicional de proyección neta; retirada posterior para conservar el enfoque base.'],
    role: 'Dirección técnica y funcional de la evolución de las proyecciones, con contribuciones previas en su lógica y decisiones documentadas sobre la activación.',
    result: 'Motor base documentado con escenarios y supuestos revisables. El historial también registra la decisión de retirar una extensión neta el 18/09/2026 y archivar sus 12 versiones: esa extensión no es el motor vigente.',
    limit: 'La evidencia respalda implementación e iteración, no exactitud predictiva. Las pruebas de la extensión retirada no se atribuyen al motor base.',
    sources: ['Historial de contribuciones a la proyección comercial base.', 'Informe de evaluación de la extensión neta del 18/09/2026.', 'Registro posterior de retirada y archivo de versiones del 18/09/2026.']
  },
  crm: {
    number: '01', category: 'CRM · Automatización · IA', title: 'Del lead al seguimiento comercial.',
    status: 'Componentes operativos documentados',
    intro: 'Un espacio de trabajo para organizar consultas, cotizaciones y seguimiento, con reglas de atención y asistencia de IA.',
    tags: ['Odoo CRM', 'Python', 'OWL', 'WhatsApp', 'IA'],
    problem: 'Las consultas, la disponibilidad de los asesores y las señales de contacto necesitaban articularse en un proceso de atención y seguimiento.',
    intervention: ['Vista de oportunidades comerciales, alertas y acciones rápidas para cada asesor.', 'Reglas de atención y reasignación que consideran gestión, horarios y disponibilidad.', 'Asistencia de IA con consulta de programas, herramientas de cotización, envío de material y derivación a una persona.'],
    role: 'Diseño de reglas operativas y decisiones de activación; desarrollo del espacio de trabajo del asesor e integración de IA, con herramientas de IA y colaboración del equipo.',
    result: 'Documentación de activación de las reglas de atención, instalación del cockpit y operación del asesor IA con supervisión humana.',
    limit: 'Es un sistema que sigue requiriendo supervisión y ajustes. No se atribuye un incremento de ventas ni autonomía completa a la IA.',
    sources: ['Diseño y evolución de la distribución comercial por SLA.', 'Código del cockpit y registro de instalación.', 'Auditoría local del asesor IA del 29/09/2026 y documentación de sus herramientas.']
  },
  whatsapp: {
    number: '04', category: 'Comunicaciones · Automatización', title: 'Mensajes con estado y control operativo.',
    status: 'Mejoras de producción documentadas',
    intro: 'Campañas y recordatorios con segmentación, límites de frecuencia y distinción entre mensajes en cola, aceptados y entregados.',
    tags: ['Odoo', 'WhatsApp', 'Meta', 'Python'],
    problem: 'Campañas y recordatorios compartían recursos de envío. Las demoras y la diferencia entre estar en cola y estar entregado necesitaban hacerse visibles.',
    intervention: ['Segmentación, exclusiones y límites de frecuencia para los envíos.', 'Estados diferenciados y métricas agregadas para leer el avance real de una campaña.', 'Recordatorios con deduplicación y correcciones de cola e integración en Odoo.'],
    role: 'Desarrollo de módulos de envío y dirección de la operación, con mejoras posteriores realizadas de forma colaborativa.',
    result: 'Trazabilidad del envío y mejoras documentadas de la cola y el rendimiento. El registro del 23/09/2026 acredita la instalación de la corrección de recordatorios.',
    limit: 'La aceptación de un mensaje por el proveedor no demuestra su entrega. La evidencia corresponde a verificaciones puntuales; no garantiza la puntualidad de todos los eventos futuros.',
    sources: ['Código de estados, frecuencia, métricas y despacho.', 'Historial de cambios y correcciones de rendimiento.', 'Registro de implementación de recordatorios del 23/09/2026.']
  },
  payments: {
    number: '05', category: 'Integraciones · ERP', title: 'Visibilidad del costo de cobrar.',
    status: 'Despliegue documentado · 24/09/2026',
    intro: 'Una integración que lleva el neto informado por Mercado Pago y el costo de cada transacción a ventas, campañas y analítica comercial.',
    tags: ['Odoo', 'Mercado Pago API', 'Python', 'Sincronización'],
    problem: 'El importe de una venta, por sí solo, no muestra el costo del medio de pago ni el neto informado por el proveedor.',
    intervention: ['Consulta a la API de Mercado Pago y sincronización incremental por transacción.', 'Información de costo y neto en órdenes, con atribución por campaña.', 'Integración de esa lectura comercial en Analytics.'],
    role: 'Definición de la necesidad y dirección de la integración entre cobros, ventas, campañas y analítica, con desarrollo colaborativo.',
    result: 'El módulo mundose_mp_net tiene un despliegue documentado el 24/09/2026, con sincronización completa de la muestra revisada y vistas activas.',
    limit: 'El neto informado no equivale a un saldo liberado conciliado ni a una certificación contable. Un prototipo distinto de análisis sobre dinero liberado no fue desplegado y no forma parte de este resultado.',
    sources: ['Registro de implementación de mundose_mp_net del 24/09/2026.', 'Código de sincronización y distribución de costos en órdenes y campañas.', 'Revisión separada del prototipo de análisis de dinero liberado.']
  }
};

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  navigation.classList.toggle('open', !expanded);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    menuButton.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open'); menuButton.focus();
  }
});

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  let count = 0;
  document.querySelectorAll('.project[data-category]').forEach(project => {
    const visible = filter === 'all' || project.dataset.category.split(' ').includes(filter);
    project.hidden = !visible;
    if (visible) count++;
  });

  document.querySelectorAll('[data-filter]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  document.querySelector('#filter-status').textContent = `${count} proyectos visibles.`;
}));

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const caseDialog = document.querySelector('#case-dialog');
const imageDialog = document.querySelector('#image-dialog');
let currentOpener;
function showDialog(dialog, opener) {
  currentOpener = opener;
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  dialog.querySelector('.dialog-close').focus();
}
document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => {
  const item = cases[button.dataset.case];
  if (!item) return;
  document.querySelector('#case-content').innerHTML = `<div class="case-content-inner"><div class="case-topline"><span class="eyebrow">${escapeHtml(item.number)} / ${escapeHtml(item.category)}</span><span class="state-badge">${escapeHtml(item.status)}</span></div><h2 id="case-title">${escapeHtml(item.title)}</h2><p class="case-intro">${escapeHtml(item.intro)}</p><div class="case-details"><h3>Qué resolví</h3><p>${escapeHtml(item.problem)}</p></div><div class="case-details"><h3>Qué hice yo</h3><p>${escapeHtml(item.role)}</p></div><div class="case-details"><h3>La solución</h3><ul>${item.intervention.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul></div><div class="case-result"><strong>Resultado documentado</strong><p>${escapeHtml(item.result)}</p></div><p class="case-boundary">${escapeHtml(item.limit)}</p><details class="case-sources"><summary>Herramientas, fuentes y alcance</summary><ul class="tag-list">${item.tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul><ul>${item.sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}<li>Revisión documental al 29/09/2026. Los estados refieren a las fechas registradas; no se revalidó producción en vivo.</li></ul></details></div>`;
  showDialog(caseDialog, button);
}));
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const img = button.querySelector('img');
  const figure = button.closest('figure');
  document.querySelector('#image-title').textContent = figure.querySelector('h3').textContent;
  const expanded = document.querySelector('#expanded-image');
  expanded.src = button.dataset.image;
  expanded.alt = img.alt;
  document.querySelector('#image-caption').textContent = figure.querySelector('.evidence-source').textContent;
  showDialog(imageDialog, button);
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    currentOpener?.focus({ preventScroll: true });
  });
});

document.querySelector('#share-portfolio').addEventListener('click', async () => {
  const url = new URL(location.href); url.hash = ''; url.search = '';
  const status = document.querySelector('#share-status');
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, text: 'El portfolio de David Martín: sistemas, Odoo y formación con IA.', url: url.href });
      status.textContent = 'Portfolio compartido.';
    } else {
      await navigator.clipboard.writeText(url.href);
      status.textContent = 'Enlace copiado. Ya podés compartirlo.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = `Podés copiar este enlace: ${url.href}`;
  }
});

document.querySelectorAll('[data-pax-filter]').forEach(button => button.addEventListener('click', () => {
 const filter = button.dataset.paxFilter; let count = 0;
 document.querySelectorAll('.pax-project').forEach(project => { const visible = filter === 'all' || project.dataset.paxCategory.split(' ').includes(filter); project.hidden = !visible; if (visible) count++; });
 document.querySelectorAll('[data-pax-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
 document.querySelector('.pax-history').hidden = !document.querySelector('.pax-history .pax-project:not([hidden])');
 document.querySelector('#pax-gallery').hidden = !document.querySelector('#pax-gallery .pax-project:not([hidden])');
 document.querySelector('#pax-filter-status').textContent = `${count} proyectos web visibles.`;
}));

