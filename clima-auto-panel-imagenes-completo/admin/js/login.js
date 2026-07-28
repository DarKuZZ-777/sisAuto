document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    location.href = "panel.html";
    return;
  }

  const formulario = document.getElementById("form-login");
  const botonLogin = document.getElementById("boton-login");
  const mensaje = document.getElementById("mensaje-login");
  const enlaceRecuperar = document.getElementById("recuperarPassword");

  /*
   * Mostrar u ocultar contraseña
   */
  document
    .getElementById("boton-ver-contrasena")
    ?.addEventListener("click", (evento) => {
      const inputContrasena = document.getElementById("contrasena");

      if (!inputContrasena) return;

      const estaOculta = inputContrasena.type === "password";

      inputContrasena.type = estaOculta ? "text" : "password";
      evento.currentTarget.textContent = estaOculta
        ? "Ocultar"
        : "Mostrar";
    });

  /*
   * Inicio de sesión
   */
  formulario?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    ocultarMensaje();
    botonLogin.disabled = true;
    botonLogin.textContent = "Ingresando...";

    try {
      const email = document
        .getElementById("correo")
        .value
        .trim()
        .toLowerCase();

      const password = document.getElementById("contrasena").value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      const { data: admin, error: errorAdmin } = await supabase
        .from("administradores")
        .select("usuario_id,nombre")
        .eq("usuario_id", data.user.id)
        .maybeSingle();

      if (errorAdmin) {
        throw errorAdmin;
      }

      if (!admin) {
        await supabase.auth.signOut();

        throw new Error(
          "Este usuario no tiene permisos administrativos."
        );
      }

      location.href = "panel.html";
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      mostrarMensaje(
        obtenerMensajeLogin(error),
        "error"
      );
    } finally {
      botonLogin.disabled = false;
      botonLogin.textContent = "Iniciar sesión";
    }
  });

  /*
   * Recuperación de contraseña
   */
  enlaceRecuperar?.addEventListener("click", async (evento) => {
    evento.preventDefault();

    ocultarMensaje();

    const inputCorreo = document.getElementById("correo");
    let email = inputCorreo?.value.trim().toLowerCase() || "";

    /*
     * Si el campo de correo está vacío,
     * se solicita mediante una ventana.
     */
    if (!email) {
      const correoIngresado = prompt(
        "Ingresá el correo electrónico de tu cuenta administrativa:"
      );

      if (!correoIngresado) {
        return;
      }

      email = correoIngresado.trim().toLowerCase();
    }

    if (!validarCorreo(email)) {
      mostrarMensaje(
        "Ingresá un correo electrónico válido.",
        "error"
      );

      inputCorreo?.focus();
      return;
    }

    const textoOriginal = enlaceRecuperar.textContent;

    enlaceRecuperar.style.pointerEvents = "none";
    enlaceRecuperar.setAttribute("aria-disabled", "true");
    enlaceRecuperar.textContent = "Enviando correo...";

    try {
      const redirectTo =
        `${window.location.origin}/admin/reset-password.html`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo
        });

      if (error) {
        throw error;
      }

      mostrarMensaje(
        "Correo enviado. Revisá tu bandeja de entrada y la carpeta de spam.",
        "exito"
      );
    } catch (error) {
      console.error(
        "Error al enviar recuperación de contraseña:",
        error
      );

      const textoError = error?.message?.toLowerCase() || "";

      if (
        textoError.includes("rate limit") ||
        textoError.includes("too many")
      ) {
        mostrarMensaje(
          "Se solicitaron demasiados correos. Esperá un momento antes de volver a intentarlo.",
          "error"
        );
      } else {
        mostrarMensaje(
          error?.message ||
            "No se pudo enviar el correo de recuperación.",
          "error"
        );
      }
    } finally {
      enlaceRecuperar.style.pointerEvents = "auto";
      enlaceRecuperar.removeAttribute("aria-disabled");
      enlaceRecuperar.textContent =
        textoOriginal || "¿Olvidaste tu contraseña?";
    }
  });

  /*
   * Funciones auxiliares
   */
  function validarCorreo(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    mensaje.hidden = true;
    mensaje.textContent = "";
  }

  function obtenerMensajeLogin(error) {
    const textoError = error?.message?.toLowerCase() || "";

    if (
      textoError.includes("invalid login credentials") ||
      textoError.includes("invalid credentials")
    ) {
      return "Correo o contraseña incorrectos.";
    }

    if (textoError.includes("email not confirmed")) {
      return "Debés confirmar tu correo electrónico antes de iniciar sesión.";
    }

    if (textoError.includes("rate limit")) {
      return "Se realizaron demasiados intentos. Esperá un momento.";
    }

    return error?.message || "No se pudo iniciar sesión.";
  }
});