document.addEventListener("DOMContentLoaded", async () => {
  const cerrar = document.getElementById("cerrar-notificacion");
  cerrar?.addEventListener("click", () => document.getElementById("notificacion")?.setAttribute("hidden", ""));
  const botonMenu=document.getElementById("boton-menu"), nav=document.getElementById("navegacion");
  botonMenu?.addEventListener("click",()=>{const abierto=nav?.classList.toggle("abierta"); botonMenu.setAttribute("aria-expanded", String(Boolean(abierto)));});
  nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("abierta")));
  try {
    const config=await window.cargarConfiguracionPublica();
    window.configuracionNegocio=config||{};
    window.aplicarWhatsApp(config||{});
    await Promise.all([window.cargarServiciosPublicos(), window.cargarTrabajosPublicos()]);
  } catch(error){ console.error(error); window.mostrarNotificacion(error.message||"No fue posible cargar el sitio."); }
});
window.mostrarNotificacion=function(mensaje){const n=document.getElementById("notificacion"),t=document.getElementById("notificacion-mensaje"); if(!n||!t)return; t.textContent=mensaje; n.hidden=false;};