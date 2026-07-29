document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;

  const formulario = document.getElementById(
    "form-reset-password"
  );

  const inputNueva = document.getElementById(
    "nueva-contrasena"
  );

  const inputConfirmar = document.getElementById(
    "confirmar-contrasena"
  );

  const boton = document.getElementById(
    "boton-reset-password"
  );

  const mensaje = document.getElementById(
    "mensaje-reset-password"
  );

  if (!supabase) {
    mostrarMensaje(
      "No se pudo conectar con el servicio de autenticación.",
      "error"
    );

    boton.disabled = true;
    return;
  }

  /*
   * Esperamos a que Supabase procese el enlace de recuperación.
   */
  const sesionValida = await esperarSesionRecuperacion();

  if (!sesionValida) {
    mostrarMensaje(
      "El enlace no es válido, ya fue utilizado o expiró. Solicitá uno nuevo.",
      "error"
    );

    boton.disabled = true;
    return;
  }

  formulario?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    ocultarMensaje();

    const nuevaPassword = inputNueva.value;
    const confirmacion = inputConfirmar.value;

    if (nuevaPassword.length < 8) {
      mostrarMensaje(
        "La contraseña debe tener al menos 8 caracteres.",
        "error"
      );

      inputNueva.focus();
      return;
    }

    if (nuevaPassword !== confirmacion) {
      mostrarMensaje(
        "Las contraseñas no coinciden.",
        "error"
      );

      inputConfirmar.focus();
      return;
    }

    boton.disabled = true;
    boton.textContent = "Actualizando...";

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword
      });

      if (error) {
        throw error;
      }

      mostrarMensaje(
        "Contraseña actualizada correctamente. Redirigiendo al login...",
        "exito"
      );

      await supabase.auth.signOut();

      setTimeout(() => {
        location.href = "login.html";
      }, 2000);
    } catch (error) {
      console.error(
        "Error al actualizar la contraseña:",
        error
      );

      mostrarMensaje(
        traducirError(error),
        "error"
      );

      boton.disabled = false;
      boton.textContent = "Actualizar contraseña";
    }
  });

  async function esperarSesionRecuperacion() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      return true;
    }

    return new Promise((resolve) => {
      let finalizado = false;

      const temporizador = setTimeout(() => {
        if (!finalizado) {
          finalizado = true;
          suscripcion?.unsubscribe();
          resolve(false);
        }
      }, 5000);

      const {
        data: { subscription: suscripcion }
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          !finalizado &&
          (event === "PASSWORD_RECOVERY" ||
            event === "SIGNED_IN") &&
          session
        ) {
          finalizado = true;
          clearTimeout(temporizador);
          suscripcion.unsubscribe();
          resolve(true);
        }
      });
    });
  }

  function mostrarMensaje(texto, tipo = "error") {
    if (!mensaje) return;

    mensaje.textContent = texto;

    mensaje.className =
      tipo === "exito"
        ? "mensaje-login mensaje-exito"
        : "mensaje-login mensaje-error";

    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    if (!mensaje) return;

    mensaje.textContent = "";
    mensaje.hidden = true;
  }

  function traducirError(error) {
    const texto = error?.message?.toLowerCase() || "";

    if (texto.includes("same password")) {
      return "La nueva contraseña debe ser diferente de la contraseña anterior.";
    }

    if (
      texto.includes("weak") ||
      texto.includes("password should")
    ) {
      return "La contraseña no cumple con los requisitos de seguridad.";
    }

    if (
      texto.includes("session") ||
      texto.includes("jwt")
    ) {
      return "La sesión de recuperación expiró. Solicitá un enlace nuevo.";
    }

    return (
      error?.message ||
      "No se pudo actualizar la contraseña."
    );
  }
});