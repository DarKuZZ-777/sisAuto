(function(){
window.crearEnlaceWhatsApp=function(mensaje){const c=window.configuracionNegocio||{}, numero=String(c.whatsapp||c.telefono||"").replace(/\D/g,""); return numero?`https://wa.me/${numero}?text=${encodeURIComponent(mensaje||c.mensaje_whatsapp||"Hola, deseo información sobre sus servicios.")}`:"#contacto";};
window.aplicarWhatsApp=function(c){window.configuracionNegocio=c||{}; ["whatsapp-header","whatsapp-hero","whatsapp-contacto","whatsapp-flotante"].forEach(id=>{const e=document.getElementById(id);if(e)e.href=window.crearEnlaceWhatsApp(c.mensaje_whatsapp);});};
})();