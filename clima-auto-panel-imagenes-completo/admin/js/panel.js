let usuarioActual = null;

const $ = (id) => document.getElementById(id);

/* =========================================================
   MENSAJES DEL PANEL
========================================================= */

window.mostrarMensajePanel = function (mensaje, tipo = "error") {
  const elemento = $("mensaje-panel");

  if (!elemento) return;

  elemento.textContent = mensaje;
  elemento.className = `mensaje-panel mensaje-${tipo}`;
  elemento.hidden = false;

  setTimeout(() => {
    elemento.hidden = true;
  }, 5000);
};

/* =========================================================
   RESUMEN DEL DASHBOARD
========================================================= */

window.cargarResumenPanel = async function () {
  const [respuestaServicios, respuestaTrabajos] = await Promise.all([
    window.supabaseClient
      .from("servicios")
      .select("id, visible, destacado"),

    window.supabaseClient
      .from("trabajos")
      .select("id, visible, destacado")
  ]);

  if (respuestaServicios.error) {
    throw respuestaServicios.error;
  }

  if (respuestaTrabajos.error) {
    throw respuestaTrabajos.error;
  }

  const servicios = respuestaServicios.data || [];
  const trabajos = respuestaTrabajos.data || [];

  $("total-servicios").textContent = servicios.length;
  $("total-trabajos").textContent = trabajos.length;

  $("total-servicios-visibles").textContent = servicios.filter(
    (servicio) => servicio.visible
  ).length;

  $("total-destacados").textContent = [
    ...servicios,
    ...trabajos
  ].filter((elemento) => elemento.destacado).length;
};

/* =========================================================
   NAVEGACIÓN DEL PANEL
========================================================= */

function mostrarSeccion(nombreSeccion) {
  document.querySelectorAll(".seccion-panel").forEach((seccion) => {
    const estaActiva = seccion.id === `seccion-${nombreSeccion}`;

    seccion.hidden = !estaActiva;
    seccion.classList.toggle("activa", estaActiva);
  });

  document.querySelectorAll(".enlace-panel").forEach((boton) => {
    boton.classList.toggle(
      "activo",
      boton.dataset.seccion === nombreSeccion
    );
  });

  const seccionActual = $(`seccion-${nombreSeccion}`);

  $("titulo-seccion").textContent =
    seccionActual?.dataset.titulo || "Panel";

  if (nombreSeccion === "configuracion") {
    window.cargarConfiguracionAdmin?.();
  }

  if (nombreSeccion === "servicios") {
    window.cargarServiciosAdmin?.(true);
  }

  if (nombreSeccion === "trabajos") {
    window.cargarTrabajosAdmin?.(true);
  }

  cerrarMenu();
}

/* =========================================================
   MENÚ RESPONSIVE
========================================================= */

function abrirMenu() {
  $("barra-lateral")?.classList.add("abierta");

  const fondoMenu = $("fondo-menu");

  if (fondoMenu) {
    fondoMenu.hidden = false;
  }
}

function cerrarMenu() {
  $("barra-lateral")?.classList.remove("abierta");

  const fondoMenu = $("fondo-menu");

  if (fondoMenu) {
    fondoMenu.hidden = true;
  }
}

/* =========================================================
   MOSTRAR Y OCULTAR PANTALLAS
========================================================= */

function mostrarPanel() {
  const pantallaVerificacion = $("pantalla-verificacion");
  const panelAplicacion = $("panel-aplicacion");

  if (pantallaVerificacion) {
    pantallaVerificacion.classList.add("ocultando");
  }

  setTimeout(() => {
    if (pantallaVerificacion) {
      pantallaVerificacion.hidden = true;
      pantallaVerificacion.classList.remove("ocultando");
    }

    if (panelAplicacion) {
      panelAplicacion.hidden = false;
    }
  }, 250);
}

/* =========================================================
   EVENTOS DEL PANEL
========================================================= */

function configurarEventosPanel() {
  document.querySelectorAll(".enlace-panel").forEach((boton) => {
    boton.addEventListener("click", () => {
      mostrarSeccion(boton.dataset.seccion);
    });
  });

  $("boton-cerrar-sesion").onclick = async () => {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      window.location.href = "login.html";
    }
  };

  $("boton-abrir-menu").onclick = abrirMenu;
  $("boton-cerrar-menu").onclick = cerrarMenu;
  $("fondo-menu").onclick = cerrarMenu;
}

/* =========================================================
   VERIFICACIÓN DEL ADMINISTRADOR
========================================================= */

async function verificarAdministrador() {
  const {
    data: { session },
    error: errorSesion
  } = await window.supabaseClient.auth.getSession();

  if (errorSesion) {
    throw errorSesion;
  }

  if (!session) {
    window.location.href = "login.html";
    return false;
  }

  usuarioActual = session.user;

  const {
    data: administrador,
    error: errorAdministrador
  } = await window.supabaseClient
    .from("administradores")
    .select("nombre")
    .eq("usuario_id", session.user.id)
    .maybeSingle();

  if (errorAdministrador) {
    throw errorAdministrador;
  }

  if (!administrador) {
    await window.supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  const correo = session.user.email || "";
  const nombrePredeterminado =
    correo.split("@")[0] || "Administrador";

  const nombre =
    administrador.nombre?.trim() || nombrePredeterminado;

  $("nombre-administrador").textContent = nombre;
  $("nombre-bienvenida").textContent = nombre;
  $("correo-administrador").textContent = correo;
  $("inicial-usuario").textContent =
    nombre.charAt(0).toUpperCase() || "A";

  return true;
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const accesoPermitido = await verificarAdministrador();

    if (!accesoPermitido) return;

    configurarEventosPanel();

    /*
      Primero cargamos la información.
      Después mostramos el panel completamente listo.
    */
    await window.cargarResumenPanel();

    mostrarPanel();
  } catch (error) {
    console.error("Error al cargar el panel:", error);

    try {
      await window.supabaseClient.auth.signOut();
    } catch (errorCerrarSesion) {
      console.error(
        "Error adicional al cerrar la sesión:",
        errorCerrarSesion
      );
    }

    window.location.href = "login.html";
  }
});
