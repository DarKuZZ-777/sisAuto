document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const formulario = document.getElementById("form-reset-password");
  const verificando = document.getElementById("verificando-enlace");
  const enlaceInvalido = document.getElementById("enlace-invalido");
  const mensajeEnlaceInvalido = document.getElementById("mensaje-enlace-invalido");
  const mensaje = document.getElementById("mensaje-reset");
  const boton = document.getElementById("boton-reset");
  let enlaceRecuperacionValido = false;

  document.querySelectorAll("[data-ver]").forEach((botonVer) => {
    botonVer.addEventListener("click", () => {
      const input = document.getElementById(botonVer.dataset.ver);
      if (!input) return;

      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      botonVer.textContent = mostrar ? "Ocultar" : "Mostrar";
      botonVer.setAttribute("aria-pressed", String(mostrar));
    });
  });

  const mostrarFormulario = () => {
    enlaceRecuperacionValido = true;
    verificando.hidden = true;
    enlaceInvalido.hidden = true;
    formulario.hidden = false;
    document.getElementById("nueva-contrasena")?.focus();
  };

  const mostrarEnlaceInvalido = (texto) => {
    enlaceRecuperacionValido = false;
    verificando.hidden = true;
    formulario.hidden = true;
    enlaceInvalido.hidden = false;
    if (texto) mensajeEnlaceInvalido.textContent = texto;
  };

  const parametros = new URLSearchParams(window.location.search);
  const errorUrl = parametros.get("error_description") || parametros.get("error");

  if (errorUrl) {
    mostrarEnlaceInvalido(decodeURIComponent(errorUrl.replace(/\+/g, " ")));
    return;
  }

  const { data: escuchaAuth } = supabase.auth.onAuthStateChange((evento, sesion) => {
    if (evento === "PASSWORD_RECOVERY" && sesion) {
      mostrarFormulario();
    }
  });

  try {
    // Supabase procesa automáticamente los tokens del enlace y crea una sesión temporal.
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      mostrarFormulario();
    } else {
      // Da un breve margen para que onAuthStateChange reciba PASSWORD_RECOVERY.
      window.setTimeout(() => {
        if (!enlaceRecuperacionValido) {
          mostrarEnlaceInvalido();
        }
      }, 1200);
    }
  } catch (error) {
    console.error("Error al verificar el enlace:", error);
    mostrarEnlaceInvalido("No fue posible verificar el enlace. Solicitá uno nuevo.");
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    ocultarMensaje();

    if (!enlaceRecuperacionValido) {
      mostrarMensaje("El enlace de recuperación ya no es válido.", "error");
      return;
    }

    const nuevaContrasena = document.getElementById("nueva-contrasena").value;
    const confirmarContrasena = document.getElementById("confirmar-contrasena").value;

    if (nuevaContrasena.length < 8) {
      mostrarMensaje("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      mostrarMensaje("Las contraseñas no coinciden.", "error");
      return;
    }

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaContrasena
      });

      if (error) throw error;

      mostrarMensaje("Contraseña actualizada correctamente. Redirigiendo...", "exito");
      formulario.querySelectorAll("input").forEach((input) => {
        input.disabled = true;
      });

      await supabase.auth.signOut();

      window.setTimeout(() => {
        location.replace("login.html?password=actualizada");
      }, 1400);
    } catch (error) {
      console.error("Error al actualizar la contraseña:", error);
      const texto = error?.message?.toLowerCase() || "";

      if (texto.includes("same password")) {
        mostrarMensaje("La nueva contraseña debe ser diferente de la anterior.", "error");
      } else if (texto.includes("weak") || texto.includes("characters")) {
        mostrarMensaje("Elegí una contraseña más segura.", "error");
      } else {
        mostrarMensaje(error?.message || "No se pudo actualizar la contraseña.", "error");
      }
    } finally {
      boton.disabled = false;
      boton.textContent = "Guardar nueva contraseña";
    }
  });

  function mostrarMensaje(texto, tipo = "error") {
    mensaje.textContent = texto;
    mensaje.className = tipo === "exito"
      ? "mensaje-login mensaje-exito"
      : "mensaje-login mensaje-error";
    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    mensaje.hidden = true;
    mensaje.textContent = "";
  }

  window.addEventListener("beforeunload", () => {
    escuchaAuth?.subscription?.unsubscribe();
  });
});
