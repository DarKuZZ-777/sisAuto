(function(){
const $=id=>document.getElementById(id);
const text=(id,v,r="")=>{const e=$(id); if(e)e.textContent=(v||"").trim()||r;};
const img=(id,v,alt)=>{const e=$(id); if(!e)return; if(v)e.src=v; e.alt=alt||e.alt; e.onerror=()=>{e.src="https://placehold.co/1200x700/0f172a/38bdf8?text=Clima+Auto";};};
const link=(id,v)=>{const e=$(id); if(!e)return; if(v){e.href=v;e.hidden=false}else{e.hidden=true;e.removeAttribute("href")}};
window.cargarConfiguracionPublica=async function(){
 const {data,error}=await window.supabaseClient.from("configuracion_negocio").select("*").order("id").limit(1).maybeSingle();
 if(error)throw error; const c=data||{};
 const nombre=c.nombre_negocio||"Clima Auto", eslogan=c.eslogan||"Aire acondicionado automotriz";
 text("nombre-negocio-header",nombre); text("nombre-negocio-footer",nombre); text("copyright-negocio",nombre); text("eslogan-header",eslogan); text("titulo-portada",eslogan); text("descripcion-portada",c.descripcion,"Diagnóstico, mantenimiento y reparación profesional."); text("descripcion-negocio",c.descripcion,"Servicio profesional para tu vehículo."); text("direccion-negocio",c.direccion,"Managua, Nicaragua"); text("horario-negocio",c.horario,"Consultá disponibilidad");
 const tel=$("telefono-negocio"); if(tel){tel.textContent=c.telefono||"No disponible"; if(c.telefono)tel.href="tel:"+c.telefono.replace(/[^\d+]/g,"");}
 const cor=$("correo-negocio"); if(cor){cor.textContent=c.correo||"Correo pendiente"; if(c.correo)cor.href="mailto:"+c.correo;}
 img("logo-negocio",c.logo_url,nombre); img("imagen-portada",c.portada_url,eslogan); img("imagen-nosotros",c.portada_url,"Taller "+nombre);
 link("facebook-negocio",c.facebook_url); link("instagram-negocio",c.instagram_url); link("tiktok-negocio",c.tiktok_url); link("youtube-negocio",c.youtube_url);
 const mapa=$("mapa-negocio"), ph=$("mapa-placeholder"); if(mapa&&c.google_maps_url){mapa.src=c.google_maps_url;mapa.hidden=false;if(ph)ph.hidden=true;}
 document.title=`${nombre} | ${eslogan}`; return c;
};
})();