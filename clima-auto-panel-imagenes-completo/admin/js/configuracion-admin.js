(function () {
  let configuracionId = null;
  let configuracionCargada = false;
  let imagenesActuales = {
    logo: { url: null, ruta: null },
    portada: { url: null, ruta: null }
  };
  const previewsTemporales = { logo: null, portada: null };

  const $ = (id) => document.getElementById(id);
  const camposTexto = {
    nombre_negocio: "config-nombre-negocio",
    eslogan: "config-eslogan",
    descripcion: "config-descripcion",
    whatsapp: "config-whatsapp",
    telefono: "config-telefono",
    correo: "config-correo",
    horario: "config-horario",
    direccion: "config-direccion",
    mensaje_whatsapp: "config-mensaje-whatsapp",
    google_maps_url: "config-google-maps",
    facebook_url: "config-facebook",
    instagram_url: "config-instagram",
    tiktok_url: "config-tiktok",
    youtube_url: "config-youtube"
  };

  function archivoSeleccionado(tipo) {
    return $(`config-${tipo}-archivo`)?.files?.[0] || null;
  }

  function liberarPreviewTemporal(tipo) {
    if (previewsTemporales[tipo]) URL.revokeObjectURL(previewsTemporales[tipo]);
    previewsTemporales[tipo] = null;
  }

  function mostrarPreview(tipo, url) {
    const contenedor = $(`config-${tipo}-preview-contenedor`);
    const imagen = $(`config-${tipo}-preview`);
    const vacio = $(`config-${tipo}-sin-preview`);
    if (!contenedor || !imagen || !vacio) return;

    if (url) {
      imagen.src = url;
      imagen.hidden = false;
      vacio.hidden = true;
      contenedor.classList.add("con-imagen");
    } else {
      imagen.removeAttribute("src");
      imagen.hidden = true;
      vacio.hidden = false;
      contenedor.classList.remove("con-imagen");
    }
  }

  function actualizarPreviewDesdeArchivo(tipo) {
    liberarPreviewTemporal(tipo);
    const archivo = archivoSeleccionado(tipo);
    const ayuda = $(`config-${tipo}-ayuda`);

    if (!archivo) {
      mostrarPreview(tipo, imagenesActuales[tipo].url);
      return;
    }

    try {
      window.ClimaAutoStorage.validarImagen(archivo);
      previewsTemporales[tipo] = URL.createObjectURL(archivo);
      mostrarPreview(tipo, previewsTemporales[tipo]);
      if (ayuda) ayuda.textContent = `${archivo.name} · ${(archivo.size / 1024 / 1024).toFixed(2)} MB`;
    } catch (error) {
      $(`config-${tipo}-archivo`).value = "";
      mostrarPreview(tipo, imagenesActuales[tipo].url);
      window.mostrarMensajePanel(error.message);
    }
  }

  function obtenerDatosTexto() {
    const datos = {};
    Object.entries(camposTexto).forEach(([columna, id]) => {
      datos[columna] = $(id)?.value.trim() || null;
    });
    datos.updated_at = new Date().toISOString();
    return datos;
  }

  function establecerGuardando(guardando) {
    const boton = $("boton-guardar-configuracion");
    const texto = $("texto-boton-configuracion");
    if (boton) boton.disabled = guardando;
    if (texto) texto.textContent = guardando ? "Guardando..." : "Guardar configuración";
  }

  window.cargarConfiguracionAdmin = async function () {
    if (configuracionCargada) return;

    const { data, error } = await window.supabaseClient
      .from("configuracion_negocio")
      .select("*")
      .order("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      window.mostrarMensajePanel(error.message);
      return;
    }

    if (data) {
      configuracionId = data.id;
      Object.entries(camposTexto).forEach(([columna, id]) => {
        const elemento = $(id);
        if (elemento) elemento.value = data[columna] || "";
      });
      imagenesActuales = {
        logo: { url: data.logo_url || null, ruta: data.logo_ruta_storage || null },
        portada: { url: data.portada_url || null, ruta: data.portada_ruta_storage || null }
      };
    }

    mostrarPreview("logo", imagenesActuales.logo.url);
    mostrarPreview("portada", imagenesActuales.portada.url);
    configuracionCargada = true;
  };

  async function guardarConfiguracion(evento) {
    evento.preventDefault();
    const datos = obtenerDatosTexto();
    const archivoLogo = archivoSeleccionado("logo");
    const archivoPortada = archivoSeleccionado("portada");
    const nuevasImagenes = { logo: null, portada: null };

    if (!datos.nombre_negocio) {
      window.mostrarMensajePanel("El nombre del negocio es obligatorio.");
      return;
    }

    establecerGuardando(true);
    try {
      if (archivoLogo) nuevasImagenes.logo = await window.ClimaAutoStorage.subirImagen(archivoLogo, "logo");
      if (archivoPortada) nuevasImagenes.portada = await window.ClimaAutoStorage.subirImagen(archivoPortada, "portada");

      datos.logo_url = nuevasImagenes.logo?.imagen_url ?? imagenesActuales.logo.url;
      datos.logo_ruta_storage = nuevasImagenes.logo?.ruta_storage ?? imagenesActuales.logo.ruta;
      datos.portada_url = nuevasImagenes.portada?.imagen_url ?? imagenesActuales.portada.url;
      datos.portada_ruta_storage = nuevasImagenes.portada?.ruta_storage ?? imagenesActuales.portada.ruta;

      const consulta = configuracionId
        ? window.supabaseClient.from("configuracion_negocio").update(datos).eq("id", configuracionId).select().single()
        : window.supabaseClient.from("configuracion_negocio").insert(datos).select().single();

      const { data, error } = await consulta;
      if (error) throw error;

      if (nuevasImagenes.logo && imagenesActuales.logo.ruta && imagenesActuales.logo.ruta !== nuevasImagenes.logo.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenesActuales.logo.ruta).catch((e) => console.warn(e.message));
      }
      if (nuevasImagenes.portada && imagenesActuales.portada.ruta && imagenesActuales.portada.ruta !== nuevasImagenes.portada.ruta_storage) {
        await window.ClimaAutoStorage.eliminarImagen(imagenesActuales.portada.ruta).catch((e) => console.warn(e.message));
      }

      configuracionId = data.id;
      imagenesActuales = {
        logo: { url: data.logo_url || null, ruta: data.logo_ruta_storage || null },
        portada: { url: data.portada_url || null, ruta: data.portada_ruta_storage || null }
      };

      ["logo", "portada"].forEach((tipo) => {
        liberarPreviewTemporal(tipo);
        $(`config-${tipo}-archivo`).value = "";
        $(`config-${tipo}-ayuda`).textContent = "JPG, PNG o WebP. Máximo 5 MB.";
        mostrarPreview(tipo, imagenesActuales[tipo].url);
      });

      window.mostrarMensajePanel("Configuración guardada correctamente.", "exito");
    } catch (error) {
      for (const tipo of ["logo", "portada"]) {
        if (nuevasImagenes[tipo]?.ruta_storage) {
          await window.ClimaAutoStorage.eliminarImagen(nuevasImagenes[tipo].ruta_storage).catch(() => {});
        }
      }
      window.mostrarMensajePanel(error.message || "No se pudo guardar la configuración.");
    } finally {
      establecerGuardando(false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("form-configuracion")?.addEventListener("submit", guardarConfiguracion);
    $("config-logo-archivo")?.addEventListener("change", () => actualizarPreviewDesdeArchivo("logo"));
    $("config-portada-archivo")?.addEventListener("change", () => actualizarPreviewDesdeArchivo("portada"));
  });
})();
